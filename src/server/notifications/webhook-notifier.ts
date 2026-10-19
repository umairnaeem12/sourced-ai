import { createHmac } from "node:crypto";
import { NotificationError, postWithTimeout, type DeliveryResult, type HandoffDetails, type HandoffNotifier } from "./handoff-notifier";

export const WEBHOOK_EVENT = "handoff.created";
export const WEBHOOK_TEST_EVENT = "handoff.test";

// Receivers recompute this over the raw body with the shared secret and compare.
export function signWebhookBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function buildWebhookPayload(details: HandoffDetails, now = new Date()) {
  return {
    event: details.is_test ? WEBHOOK_TEST_EVENT : WEBHOOK_EVENT,
    sent_at: now.toISOString(),
    store: details.store_name,
    handoff: {
      id: details.id,
      created_at: details.created_at.toISOString(),
      email: details.email,
      question_count: details.conversation.length,
      unanswered_count: details.conversation.filter((entry) => !entry.is_answered).length,
    },
    conversation: details.conversation.map((entry) => ({
      question: entry.question,
      answer: entry.answer_text,
      is_answered: entry.is_answered,
      asked_at: entry.created_at.toISOString(),
    })),
  };
}

export class WebhookNotifier implements HandoffNotifier {
  readonly channel = "webhook";

  constructor(
    private readonly url: string | undefined,
    private readonly secret: string | undefined,
  ) {}

  async send(details: HandoffDetails): Promise<DeliveryResult> {
    if (!this.url) throw new NotificationError(this.channel, "HANDOFF_WEBHOOK_URL is not set");
    if (!isAllowedWebhookUrl(this.url)) {
      throw new NotificationError(this.channel, "HANDOFF_WEBHOOK_URL must use https (http is allowed for localhost only)");
    }

    const body = JSON.stringify(buildWebhookPayload(details));
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-sourced-event": details.is_test ? WEBHOOK_TEST_EVENT : WEBHOOK_EVENT,
      "x-sourced-delivery": details.id,
    };
    if (this.secret) headers["x-sourced-signature"] = signWebhookBody(body, this.secret);

    await postWithTimeout(this.channel, this.url, { headers, body });
    return "sent";
  }
}
