import { loadConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import type { CallerContext } from "../http/caller-context";
import { logger } from "../logger";
import { createHandoffNotifiers } from "../notifications/handoff-notifiers";
import type { HandoffNotifier } from "../notifications/handoff-notifier";
import { handoffRepository, type HandoffRepository } from "../repositories/handoff-repository";
import { questionRepository, type QuestionRepository } from "../repositories/question-repository";
import { rateLimitService, type RateLimitService } from "./rate-limit-service";

export interface HandoffResult {
  id: string;
  status: "received";
}

export class HandoffService {
  constructor(
    private readonly questions: Pick<QuestionRepository, "findByConversation">,
    private readonly handoffs: Pick<HandoffRepository, "create" | "findById" | "recordNotification">,
    private readonly notifiers: HandoffNotifier[],
    private readonly storeName: string,
    private readonly rateLimits: Pick<RateLimitService, "consume">,
  ) {}

  // Spec 003 amendment: saving is the whole job here; notifying happens after the response.
  async create(conversationId: string, email: string | null, caller?: CallerContext): Promise<HandoffResult> {
    if (caller) await this.rateLimits.consume("handoff", caller.visitor_id);
    const logged = await this.questions.findByConversation(conversationId);
    if (logged.length === 0) {
      throw new ApiError(404, "There's no conversation to hand off yet.", ErrorCode.CONVERSATION_NOT_FOUND);
    }

    const handoff = await this.handoffs.create(conversationId, email, caller?.origin ?? "visitor");
    if (!handoff) {
      throw new ApiError(409, "The team already has this conversation.", ErrorCode.HANDOFF_ALREADY_SENT);
    }

    logger.info("Handoff received", { handoff_id: handoff.id, has_email: email !== null, questions: logged.length });
    return { id: handoff.id, status: "received" };
  }

  // Runs every channel and records each result. Never throws: the customer already has their answer.
  async notify(handoffId: string): Promise<void> {
    if (this.notifiers.length === 0) return;
    try {
      const handoff = await this.handoffs.findById(handoffId);
      if (!handoff) {
        logger.warn("Handoff to notify not found", { handoff_id: handoffId });
        return;
      }
      const details = {
        id: handoff.id,
        conversation_id: handoff.conversation_id,
        created_at: handoff.created_at,
        email: handoff.email,
        store_name: this.storeName,
        conversation: await this.questions.findByConversation(handoff.conversation_id),
      };

      await Promise.all(
        this.notifiers.map(async (notifier) => {
          try {
            const status = await notifier.send(details);
            await this.handoffs.recordNotification(handoffId, { channel: notifier.channel, status, error: null });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn("Handoff notification failed", { handoff_id: handoffId, channel: notifier.channel, error: message });
            await this.handoffs.recordNotification(handoffId, { channel: notifier.channel, status: "failed", error: message });
          }
        }),
      );
    } catch (error) {
      logger.error("Handoff notifications could not be recorded", {
        handoff_id: handoffId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function createHandoffService(): HandoffService {
  const config = loadConfig();
  return new HandoffService(
    questionRepository,
    handoffRepository,
    createHandoffNotifiers(config),
    config.STORE_NAME,
    rateLimitService,
  );
}

export const handoffService = createHandoffService();
