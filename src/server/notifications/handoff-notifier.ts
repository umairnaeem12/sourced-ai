import type { NotificationChannel } from "../repositories/handoff-repository";
import type { LoggedQuestion } from "../repositories/question-repository";

export interface HandoffDetails {
  id: string;
  conversation_id: string;
  created_at: Date;
  email: string | null;
  store_name: string;
  conversation: LoggedQuestion[];
  // Spec 005: a test alert from Settings, labelled as such on every channel.
  is_test?: boolean;
}

// "logged" means the channel wrote the message to the server log instead of delivering it (local dev).
export type DeliveryResult = "sent" | "logged";

// Spec 003 amendment agrees to this one interface: the notification channel is a setting.
export interface HandoffNotifier {
  readonly channel: NotificationChannel;
  send(details: HandoffDetails): Promise<DeliveryResult>;
}

export class NotificationError extends Error {
  constructor(
    readonly channel: NotificationChannel,
    detail: string,
  ) {
    super(detail);
    this.name = "NotificationError";
  }
}

export async function postWithTimeout(
  channel: NotificationChannel,
  url: string,
  init: { headers: Record<string, string>; body: string },
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", ...init, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new NotificationError(channel, error instanceof Error ? error.message : "request failed");
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new NotificationError(channel, `HTTP ${response.status} ${detail}`.trim());
  }
}
