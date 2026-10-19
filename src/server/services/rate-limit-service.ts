import { loadConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import { logger } from "../logger";
import { rateLimitRepository, type RateLimitRepository } from "../repositories/rate-limit-repository";

export type RateLimitRule =
  | "question"
  | "question_daily"
  | "handoff"
  | "admin_sign_in_failure"
  | "admin_test_alert"
  | "document_write";

interface Rule {
  limit: number;
  windowSeconds: number;
  code: ErrorCode;
  message: string;
}

const CLEANUP_CHANCE = 0.01;
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

export function buildRules(dailyQuestionLimit: number): Record<RateLimitRule, Rule> {
  return {
    question: {
      limit: 20,
      windowSeconds: 10 * 60,
      code: ErrorCode.RATE_LIMITED,
      message: "You're asking quickly. Try again in a few minutes.",
    },
    question_daily: {
      limit: dailyQuestionLimit,
      windowSeconds: 24 * 60 * 60,
      code: ErrorCode.DAILY_LIMIT_REACHED,
      message: "The demo has reached today's limit. Try again tomorrow.",
    },
    handoff: {
      limit: 5,
      windowSeconds: 60 * 60,
      code: ErrorCode.RATE_LIMITED,
      message: "You've asked for a person several times already. Try again later.",
    },
    admin_sign_in_failure: {
      limit: 5,
      windowSeconds: 15 * 60,
      code: ErrorCode.RATE_LIMITED,
      message: "Too many attempts. Try again in 15 minutes.",
    },
    // Spec 005 B28: test alerts post to real channels, so keep them occasional.
    admin_test_alert: {
      limit: 5,
      windowSeconds: 10 * 60,
      code: ErrorCode.RATE_LIMITED,
      message: "That's a lot of test alerts. Try again in a few minutes.",
    },
    // Spec 005 amendment B33: indexing spends the AI quota, and a public dashboard lets anyone upload.
    document_write: {
      limit: 20,
      windowSeconds: 60 * 60,
      code: ErrorCode.RATE_LIMITED,
      message: "You've added a lot of documents this hour. Try again later.",
    },
  };
}

// Fixed windows aligned to the clock. A null visitor means the rule is global.
export class RateLimitService {
  constructor(
    private readonly repository: Pick<RateLimitRepository, "hit" | "count" | "deleteOlderThan">,
    private readonly rules: Record<RateLimitRule, Rule>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // Counts this request; throws 429 once the window's limit is passed.
  async consume(ruleName: RateLimitRule, visitorId: string | null): Promise<void> {
    const { bucket, windowStart, rule } = this.locate(ruleName, visitorId);
    const hits = await this.repository.hit(bucket, windowStart);
    this.maybeCleanUp();
    if (hits > rule.limit) throw this.limited(rule, windowStart);
  }

  // Counts an event (a failed sign-in) without ever throwing.
  async record(ruleName: RateLimitRule, visitorId: string | null): Promise<void> {
    const { bucket, windowStart } = this.locate(ruleName, visitorId);
    await this.repository.hit(bucket, windowStart);
  }

  // Throws if the window's limit is already reached, without counting this request.
  async assertNotBlocked(ruleName: RateLimitRule, visitorId: string | null): Promise<void> {
    const { bucket, windowStart, rule } = this.locate(ruleName, visitorId);
    if ((await this.repository.count(bucket, windowStart)) >= rule.limit) throw this.limited(rule, windowStart);
  }

  private locate(ruleName: RateLimitRule, visitorId: string | null) {
    const rule = this.rules[ruleName];
    const windowMs = rule.windowSeconds * 1000;
    const windowStart = new Date(Math.floor(this.now().getTime() / windowMs) * windowMs);
    return { rule, windowStart, bucket: `${ruleName}:${visitorId ?? "global"}` };
  }

  private limited(rule: Rule, windowStart: Date): ApiError {
    const retryAfter = Math.max(
      1,
      Math.ceil((windowStart.getTime() + rule.windowSeconds * 1000 - this.now().getTime()) / 1000),
    );
    return new ApiError(429, rule.message, rule.code, true, { retry_after_seconds: retryAfter });
  }

  private maybeCleanUp() {
    if (Math.random() >= CLEANUP_CHANCE) return;
    this.repository
      .deleteOlderThan(new Date(this.now().getTime() - KEEP_MS))
      .catch((error: unknown) =>
        logger.warn("Rate limit cleanup failed", { error: error instanceof Error ? error.message : String(error) }),
      );
  }
}

export const rateLimitService = new RateLimitService(
  rateLimitRepository,
  buildRules(loadConfig().DAILY_QUESTION_LIMIT),
);
