import { randomUUID } from "node:crypto";
import { loadConfig, type AppConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import type { CallerContext } from "../http/caller-context";
import { NotificationError, type DeliveryResult, type HandoffDetails, type HandoffNotifier } from "../notifications/handoff-notifier";
import { createNotifier } from "../notifications/handoff-notifiers";
import type { NotificationChannel } from "../repositories/handoff-repository";
import { rateLimitService, type RateLimitService } from "./rate-limit-service";
import { settingsService, type SettingsService } from "./settings-service";

const CHANNEL_LABEL: Record<NotificationChannel, string> = { slack: "Slack", email: "Email", webhook: "The webhook" };

export function sampleHandoff(storeName: string, now = new Date()): HandoffDetails {
  return {
    id: randomUUID(),
    conversation_id: randomUUID(),
    created_at: now,
    email: "customer@example.com",
    store_name: storeName,
    is_test: true,
    conversation: [
      {
        question: "Can I return a kettle I've already used?",
        is_answered: true,
        answer_text: "Yes. Used items can be returned within 30 days if they're undamaged, minus a 10% restocking fee.",
        citations: [],
        created_at: new Date(now.getTime() - 60_000),
      },
      {
        question: "Do you price match?",
        is_answered: false,
        answer_text: `I couldn't find that in ${storeName}'s help docs, so I won't guess.`,
        citations: [],
        created_at: new Date(now.getTime() - 30_000),
      },
    ],
  };
}

// Spec 005 B28: sends a labelled sample handoff through one channel and reports the result.
export class NotificationTestService {
  constructor(
    private readonly settings: Pick<SettingsService, "channel">,
    private readonly notifierFor: (channel: NotificationChannel) => HandoffNotifier,
    private readonly storeName: () => string,
    private readonly rateLimits: Pick<RateLimitService, "consume">,
  ) {}

  async send(channel: NotificationChannel, caller: CallerContext): Promise<DeliveryResult> {
    const settings = this.settings.channel(channel);
    if (settings.state !== "connected" && settings.state !== "log_only") {
      throw new ApiError(
        422,
        `${CHANNEL_LABEL[channel]} isn't connected yet.`,
        ErrorCode.NOTIFICATION_NOT_CONFIGURED,
        true,
        { channel, state: settings.state, missing: settings.missing },
      );
    }
    await this.rateLimits.consume("admin_test_alert", caller.visitor_id);
    try {
      return await this.notifierFor(channel).send(sampleHandoff(this.storeName()));
    } catch (error) {
      if (error instanceof NotificationError) {
        throw new ApiError(502, `${CHANNEL_LABEL[channel]} didn't accept the test alert.`, ErrorCode.NOTIFICATION_FAILED, true, {
          channel,
          detail: error.message,
        });
      }
      throw error;
    }
  }
}

function config(): AppConfig {
  return loadConfig();
}

export const notificationTestService = new NotificationTestService(
  settingsService,
  (channel) => createNotifier(channel, config()),
  () => config().STORE_NAME,
  rateLimitService,
);
