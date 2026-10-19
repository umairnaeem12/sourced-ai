// @vitest-environment node
// Spec 005 B28: every channel labels a test alert as a test.
import { describe, expect, it } from "vitest";
import { buildHandoffMessage } from "../services/handoff-message";
import { sampleHandoff } from "../services/notification-test-service";
import { handoffEmailSubject } from "./email-notifier";
import { buildWebhookPayload } from "./webhook-notifier";

describe("test alerts", () => {
  const details = sampleHandoff("Pinebrook Supply", new Date("2026-10-19T12:00:00Z"));

  it("uses a Test alert header in Slack", () => {
    const message = buildHandoffMessage({
      storeName: details.store_name,
      conversationId: details.conversation_id,
      email: details.email,
      questions: details.conversation,
      isTest: true,
    });
    expect(message.text).toMatch(/^Test alert: /);
    expect(JSON.stringify(message.blocks)).toContain('"text":"Test alert"');
  });

  it("starts the email subject with [Test]", () => {
    expect(handoffEmailSubject(details)).toBe("[Test] Pinebrook Supply: a customer asked for a person (customer@example.com)");
  });

  it("sends the handoff.test event to webhooks", () => {
    expect(buildWebhookPayload(details).event).toBe("handoff.test");
    expect(buildWebhookPayload({ ...details, is_test: false }).event).toBe("handoff.created");
  });
});
