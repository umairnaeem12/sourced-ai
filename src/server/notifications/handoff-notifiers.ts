import type { AppConfig } from "../config";
import { EmailService } from "../email/email-service";
import { logger } from "../logger";
import type { NotificationChannel } from "../repositories/handoff-repository";
import { EmailNotifier } from "./email-notifier";
import type { HandoffNotifier } from "./handoff-notifier";
import { SlackNotifier } from "./slack-notifier";
import { WebhookNotifier } from "./webhook-notifier";

export const CHANNELS: NotificationChannel[] = ["slack", "email", "webhook"];

function isChannel(name: string): name is NotificationChannel {
  return (CHANNELS as string[]).includes(name);
}

export function createHandoffNotifiers(config: AppConfig): HandoffNotifier[] {
  const names = [
    ...new Set(
      (config.HANDOFF_NOTIFY ?? "")
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  // A typo in the setting skips that channel; it never stops the app.
  const unknown = names.filter((name) => !isChannel(name));
  if (unknown.length) logger.warn("Ignoring unknown HANDOFF_NOTIFY channels", { unknown, allowed: CHANNELS });

  return names.filter(isChannel).map((channel) => createNotifier(channel, config));
}

export function createNotifier(channel: NotificationChannel, config: AppConfig): HandoffNotifier {
  switch (channel) {
    case "slack":
      return new SlackNotifier(config.SLACK_WEBHOOK_URL);
    case "email":
      return new EmailNotifier(
        new EmailService({
          apiKey: config.RESEND_API_KEY,
          fromName: config.HANDOFF_EMAIL_FROM_NAME,
          fromAddress: config.HANDOFF_EMAIL_FROM,
          isProduction: process.env.NODE_ENV === "production",
        }),
        config.HANDOFF_EMAIL_TO,
        config.APP_URL,
      );
    case "webhook":
      return new WebhookNotifier(config.HANDOFF_WEBHOOK_URL, config.HANDOFF_WEBHOOK_SECRET);
  }
}

export function enabledChannels(config: AppConfig): NotificationChannel[] {
  return [
    ...new Set(
      (config.HANDOFF_NOTIFY ?? "")
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(isChannel),
    ),
  ];
}
