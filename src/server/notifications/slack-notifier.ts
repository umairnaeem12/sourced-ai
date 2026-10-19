import { buildHandoffMessage } from "../services/handoff-message";
import { NotificationError, postWithTimeout, type DeliveryResult, type HandoffDetails, type HandoffNotifier } from "./handoff-notifier";

export class SlackNotifier implements HandoffNotifier {
  readonly channel = "slack";

  constructor(private readonly webhookUrl: string | undefined) {}

  async send(details: HandoffDetails): Promise<DeliveryResult> {
    if (!this.webhookUrl) throw new NotificationError(this.channel, "SLACK_WEBHOOK_URL is not set");
    if (!this.webhookUrl.startsWith("https://hooks.slack.com/")) {
      throw new NotificationError(this.channel, "SLACK_WEBHOOK_URL must be a https://hooks.slack.com/ incoming webhook");
    }
    const message = buildHandoffMessage({
      storeName: details.store_name,
      conversationId: details.conversation_id,
      email: details.email,
      questions: details.conversation,
      isTest: details.is_test,
    });
    await postWithTimeout(this.channel, this.webhookUrl, {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
    return "sent";
  }
}
