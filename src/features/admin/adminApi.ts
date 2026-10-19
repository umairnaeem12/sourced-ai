// List reads go through the shared ListPage; every other admin call lives here.
export type SignInResult = { ok: true } | { ok: false; message: string };

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Wrong password.",
  NETWORK_ERROR: "Couldn’t reach the server. Check your connection and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

export async function signIn(password: string): Promise<SignInResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    return { ok: false, message: messages.NETWORK_ERROR };
  }
  if (response.status === 204) return { ok: true };

  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  // These carry what to do next (setup steps, when to retry) in the message, so show it as sent.
  if ((body.code === "ADMIN_DISABLED" || body.code === "RATE_LIMITED") && body.message) {
    return { ok: false, message: body.message };
  }
  return { ok: false, message: messages[body.code ?? ""] ?? messages.INTERNAL_ERROR };
}

export async function signOut(): Promise<void> {
  await fetch("/api/admin/sessions", { method: "DELETE" }).catch(() => undefined);
}

export interface Citation {
  number: number;
  document_slug: string;
  document_title: string;
  section_number: number;
  heading: string;
  content: string;
}

export interface TranscriptEntry {
  question: string;
  answer_text: string;
  is_answered: boolean;
  citations: Citation[];
  created_at: string;
}

export type Channel = "slack" | "email" | "webhook";

export interface ChannelNotification {
  channel: Channel;
  status: "sent" | "failed" | "logged";
  problem: "not_configured" | "delivery_failed" | null;
  error: string | null;
}

export interface Note {
  id: string;
  body: string;
  created_at: string;
}

export interface HandoffRow {
  id: string;
  conversation_id: string;
  created_at: string;
  email: string | null;
  question_count: number;
  is_handled: boolean;
  handled_at: string | null;
  notifications: ChannelNotification[];
}

export interface HandoffDetail extends HandoffRow {
  conversation: TranscriptEntry[];
  notes: Note[];
}

export interface ConversationDetail {
  conversation_id: string;
  started_at: string;
  handoff_id: string | null;
  messages: TranscriptEntry[];
}

export interface GapRow {
  gap_id: string;
  question: string;
  wordings: { text: string; times_asked: number }[];
  times_asked: number;
  last_asked_at: string;
  daily_counts: number[];
  resolved_at: string | null;
  asked_again: boolean;
}

export interface PeriodTotals {
  conversations: number;
  questions: number;
  answered: number;
  handoffs: number;
  median_handle_minutes: number | null;
}

export interface Overview {
  period: { days: number; time_zone: string };
  totals: PeriodTotals;
  previous_totals: PeriodTotals;
  daily: { date: string; answered: number; unanswered: number }[];
  top_documents: { document_slug: string; document_title: string; answers: number }[];
  busiest: { weekday: number; hour: number; questions: number }[];
  top_gaps: GapRow[];
  recent_handoffs: HandoffRow[];
  has_sample_data: boolean;
}

export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  origin: "sample" | "upload";
  source_filename: string | null;
  char_count: number;
  passage_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends DocumentRow {
  passages: { section_number: number; heading: string; content: string }[];
}

export type ChannelState = "connected" | "log_only" | "missing_settings" | "turned_off" | "not_set_up";

export interface Settings {
  store: { name: string; time_zone: string };
  answers: {
    provider: string;
    model: string | null;
    fallback: { provider: string; model: string } | null;
    embedding_model: string;
    min_similarity: number;
    daily_question_limit: number;
  };
  alerts: { channel: Channel; state: ChannelState; missing: string[]; target: string | null; signed: boolean | null }[];
  admin: { session_hours: number; password_set: boolean; public_access: boolean };
}

export type AdminResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function adminRequest<T>(url: string, init: RequestInit, pick: (data: Record<string, unknown>) => T): Promise<AdminResult<T>> {
  try {
    const response = await fetch(url, init);
    if (response.status === 401) {
      window.location.assign("/admin/login");
      return { ok: false, message: "Your session ended. Sign in again." };
    }
    if (response.status === 204) return { ok: true, data: pick({}) };
    const body = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: Record<string, unknown>;
      errors?: { message: string }[];
      context?: { detail?: string };
    };
    if (!body.success || !body.data) {
      // Validation errors carry the specific field message; a failed delivery carries its detail.
      const detail = body.context?.detail ? ` (${body.context.detail})` : "";
      return { ok: false, message: body.errors?.[0]?.message ?? `${body.message ?? messages.INTERNAL_ERROR}${detail}` };
    }
    return { ok: true, data: pick(body.data) };
  } catch {
    return { ok: false, message: messages.NETWORK_ERROR };
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function getHandoff(id: string): Promise<AdminResult<HandoffDetail>> {
  return adminRequest(`/api/admin/handoffs/${id}`, {}, (data) => data.handoff as HandoffDetail);
}

export function setHandoffHandled(id: string, isHandled: boolean): Promise<AdminResult<null>> {
  return adminRequest(`/api/admin/handoffs/${id}`, json("PATCH", { is_handled: isHandled }), () => null);
}

export function addHandoffNote(id: string, body: string): Promise<AdminResult<Note>> {
  return adminRequest(`/api/admin/handoffs/${id}/notes`, json("POST", { body }), (data) => data.note as Note);
}

export function getOverview(days: number): Promise<AdminResult<Overview>> {
  return adminRequest(`/api/admin/overview?days=${days}`, {}, (data) => data.overview as Overview);
}

export function getConversation(id: string): Promise<AdminResult<ConversationDetail>> {
  return adminRequest(`/api/admin/conversations/${id}`, {}, (data) => data.conversation as ConversationDetail);
}

export function setGapResolved(gapId: string, isResolved: boolean): Promise<AdminResult<null>> {
  return adminRequest(`/api/admin/gaps/${gapId}`, json("PATCH", { is_resolved: isResolved }), () => null);
}

export function getDocument(id: string): Promise<AdminResult<DocumentDetail>> {
  return adminRequest(`/api/admin/documents/${id}`, {}, (data) => data.document as DocumentDetail);
}

// A file, or a title plus pasted text; replacing sends the same form to the document.
export function saveDocument(form: FormData, id?: string): Promise<AdminResult<DocumentRow>> {
  return adminRequest(
    id ? `/api/admin/documents/${id}` : "/api/admin/documents",
    { method: id ? "PATCH" : "POST", body: form },
    (data) => data.document as DocumentRow,
  );
}

export function deleteDocument(id: string): Promise<AdminResult<null>> {
  return adminRequest(`/api/admin/documents/${id}`, { method: "DELETE" }, () => null);
}

export function getSettings(): Promise<AdminResult<Settings>> {
  return adminRequest("/api/admin/settings", {}, (data) => data.settings as Settings);
}

export function sendTestAlert(channel: Channel): Promise<AdminResult<{ result: "sent" | "logged"; message: string }>> {
  return adminRequest("/api/admin/notification-tests", json("POST", { channel }), (data) => ({
    result: data.result as "sent" | "logged",
    message: data.result === "sent" ? "Test alert sent." : "Test alert written to the server log.",
  }));
}
