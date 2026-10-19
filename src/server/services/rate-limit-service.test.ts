// @vitest-environment node
// Spec 004, AC3 and AC4: fixed-window rate limits.
import { describe, expect, it } from "vitest";
import { ErrorCode } from "../http/api-error";
import { buildRules, RateLimitService } from "./rate-limit-service";

function memoryRepository() {
  const hits = new Map<string, number>();
  const key = (bucket: string, windowStart: Date) => `${bucket}@${windowStart.toISOString()}`;
  return {
    hits,
    hit: async (bucket: string, windowStart: Date) => {
      const next = (hits.get(key(bucket, windowStart)) ?? 0) + 1;
      hits.set(key(bucket, windowStart), next);
      return next;
    },
    count: async (bucket: string, windowStart: Date) => hits.get(key(bucket, windowStart)) ?? 0,
    deleteOlderThan: async () => {},
  };
}

function setup(start = "2026-10-18T10:03:00Z", dailyLimit = 500) {
  let now = new Date(start);
  const service = new RateLimitService(memoryRepository(), buildRules(dailyLimit), () => now);
  return { service, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

async function consumeTimes(service: RateLimitService, times: number, visitor: string | null, rule: "question" | "question_daily" = "question") {
  for (let i = 0; i < times; i++) await service.consume(rule, visitor);
}

describe("RateLimitService", () => {
  it("lets a visitor ask 20 questions in 10 minutes and refuses the 21st with a retry time", async () => {
    const { service } = setup();
    await consumeTimes(service, 20, "visitor-a");

    const error = await service.consume("question", "visitor-a").catch((caught: unknown) => caught);
    // 10:03 sits in the 10:00-10:10 window, so retry in 7 minutes.
    expect(error).toMatchObject({ statusCode: 429, code: ErrorCode.RATE_LIMITED, context: { retry_after_seconds: 420 } });
  });

  it("keeps visitors separate", async () => {
    const { service } = setup();
    await consumeTimes(service, 20, "visitor-a");
    await expect(service.consume("question", "visitor-b")).resolves.toBeUndefined();
  });

  it("opens again in the next window", async () => {
    const { service, advance } = setup();
    await consumeTimes(service, 20, "visitor-a");
    advance(7 * 60 * 1000);
    await expect(service.consume("question", "visitor-a")).resolves.toBeUndefined();
  });

  it("applies the daily cap to everyone together", async () => {
    const { service } = setup("2026-10-18T10:03:00Z", 3);
    await consumeTimes(service, 3, null, "question_daily");
    await expect(service.consume("question_daily", null)).rejects.toMatchObject({ code: ErrorCode.DAILY_LIMIT_REACHED });
  });

  it("blocks after 5 recorded failures without counting the check itself", async () => {
    const { service } = setup();
    for (let i = 0; i < 4; i++) await service.record("admin_sign_in_failure", "visitor-a");
    await expect(service.assertNotBlocked("admin_sign_in_failure", "visitor-a")).resolves.toBeUndefined();
    await expect(service.assertNotBlocked("admin_sign_in_failure", "visitor-a")).resolves.toBeUndefined();

    await service.record("admin_sign_in_failure", "visitor-a");
    await expect(service.assertNotBlocked("admin_sign_in_failure", "visitor-a")).rejects.toMatchObject({
      statusCode: 429,
      message: "Too many attempts. Try again in 15 minutes.",
    });
  });
});
