import type { HandoffNotification } from "../repositories/handoff-repository";

export type NotificationProblem = "not_configured" | "delivery_failed";

// Spec 005 B15: a missing or malformed setting reads as "not connected", anything else as a failed delivery.
const SETTING_PROBLEM = /\b[A-Z][A-Z_]+ (is not set|must (be|use))\b/;

export function notificationProblem(notification: HandoffNotification): NotificationProblem | null {
  if (notification.status !== "failed") return null;
  return notification.error && SETTING_PROBLEM.test(notification.error) ? "not_configured" : "delivery_failed";
}
