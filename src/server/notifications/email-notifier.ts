import type { EmailService } from "../email/email-service";
import { renderEmail } from "../email/email-templates";
import { NotificationError, type DeliveryResult, type HandoffDetails, type HandoffNotifier } from "./handoff-notifier";

export function handoffEmailSubject(details: HandoffDetails): string {
  const who = details.email ? ` (${details.email})` : "";
  return `${details.is_test ? "[Test] " : ""}${details.store_name}: a customer asked for a person${who}`;
}

export class EmailNotifier implements HandoffNotifier {
  readonly channel = "email";

  constructor(
    private readonly email: Pick<EmailService, "send">,
    private readonly to: string | undefined,
    private readonly appUrl: string,
  ) {}

  async send(details: HandoffDetails): Promise<DeliveryResult> {
    if (!this.to) throw new NotificationError(this.channel, "HANDOFF_EMAIL_TO is not set");

    const subject = handoffEmailSubject(details);
    const { html, text } = renderEmail("handoff", {
      subject,
      storeName: details.store_name,
      email: details.email,
      askedAt: details.created_at.toUTCString(),
      questionCount: details.conversation.length,
      unansweredCount: details.conversation.filter((entry) => !entry.is_answered).length,
      conversation: details.conversation,
      inboxUrl: `${this.appUrl.replace(/\/$/, "")}/admin/handoffs`,
    });

    return this.email.send({
      to: this.to,
      subject,
      html,
      text,
      replyTo: details.email ?? undefined,
      idempotencyKey: `handoff-${details.id}`,
    });
  }
}
