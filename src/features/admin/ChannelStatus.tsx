import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Channel, ChannelNotification } from "./adminApi";

const NAME: Record<Channel, string> = { slack: "Slack", email: "Email", webhook: "Webhook" };
const SENT: Record<Channel, string> = { slack: "Sent to Slack", email: "Emailed", webhook: "Sent to webhook" };
const REACH: Record<Channel, string> = { slack: "Slack", email: "the email service", webhook: "the webhook" };

// Spec 005 B15: plain-language status; the raw error only as hover detail on a failed delivery.
export function channelStatusText(notification: ChannelNotification): string {
  if (notification.status === "sent") return SENT[notification.channel];
  if (notification.status === "logged") return "Email written to the server log (development)";
  if (notification.problem === "not_configured") return `${NAME[notification.channel]} isn't connected`;
  return `Couldn't reach ${REACH[notification.channel]}`;
}

export function ChannelStatusList({ notifications, align = "end" }: { notifications: ChannelNotification[]; align?: "start" | "end" }) {
  if (notifications.length === 0) return <span className="text-xs text-faint">Inbox only</span>;
  return (
    <ul className={cn("flex flex-col gap-1.5", align === "end" ? "items-end" : "items-start")}>
      {notifications.map((notification) => {
        const ok = notification.status !== "failed";
        return (
          <li key={notification.channel} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span
              title={notification.problem === "delivery_failed" ? (notification.error ?? undefined) : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                ok ? (notification.status === "sent" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted") : "bg-cite-soft text-cite",
              )}
            >
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", ok ? "bg-current" : "bg-cite")} />
              {channelStatusText(notification)}
            </span>
            {notification.problem === "not_configured" && (
              <Link href="/admin/settings" className="text-faint underline-offset-2 hover:text-accent hover:underline">
                Settings
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
