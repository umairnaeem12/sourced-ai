import { logger } from "../logger";
import { NotificationError, type DeliveryResult } from "../notifications/handoff-notifier";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  // Resend drops a second send with the same key within 24 hours.
  idempotencyKey?: string;
}

interface EmailServiceOptions {
  apiKey: string | undefined;
  fromName: string;
  fromAddress: string;
  isProduction: boolean;
}

// The one way the app sends email. Provider: Resend (owner's choice, spec 003 amendment).
export class EmailService {
  constructor(private readonly options: EmailServiceOptions) {}

  async send(message: EmailMessage): Promise<DeliveryResult> {
    const { apiKey, fromName, fromAddress, isProduction } = this.options;

    if (!apiKey) {
      if (isProduction) throw new NotificationError("email", "RESEND_API_KEY is not set");
      // Local development runs without a provider: show the email in the server log.
      logger.info("Email not sent: RESEND_API_KEY is not set, logged instead", {
        to: message.to,
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
      });
      return "logged";
    }

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          ...(message.idempotencyKey ? { "idempotency-key": message.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new NotificationError("email", error instanceof Error ? error.message : "request failed");
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new NotificationError("email", `Resend HTTP ${response.status} ${detail}`.trim());
    }
    return "sent";
  }
}
