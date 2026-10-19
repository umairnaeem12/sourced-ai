export type HandoffResult = { ok: true } | { ok: false; code: string; message: string };

interface Envelope {
  success: boolean;
  code?: string;
  errors?: { field: string; message: string }[];
}

const messages: Record<string, string> = {
  HANDOFF_ALREADY_SENT: "The team already has this conversation.",
  RATE_LIMITED: "You\u2019ve asked for a person several times already. Try again later.",
  CONVERSATION_NOT_FOUND: "Ask a question first, so the team can see what you need.",
  NETWORK_ERROR: "Couldn’t reach Sourced AI. Check your connection and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again.",
};

export async function createHandoff(conversationId: string, email: string): Promise<HandoffResult> {
  let body: Envelope;
  try {
    const response = await fetch("/api/handoffs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, email: email.trim() || undefined }),
    });
    body = (await response.json()) as Envelope;
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: messages.NETWORK_ERROR };
  }

  if (body.success) return { ok: true };
  const code = body.code ?? "INTERNAL_ERROR";
  const message =
    code === "VALIDATION_ERROR"
      ? (body.errors?.[0]?.message ?? "Check the email and try again.")
      : (messages[code] ?? messages.INTERNAL_ERROR);
  return { ok: false, code, message };
}
