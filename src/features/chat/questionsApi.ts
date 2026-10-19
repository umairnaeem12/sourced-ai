export interface Citation {
  number: number;
  document_slug: string;
  document_title: string;
  section_number: number;
  heading: string;
  content: string;
}

export interface Answer {
  is_answered: boolean;
  text: string;
  citations: Citation[];
}

export type AskResult = { ok: true; answer: Answer } | { ok: false; code: string; message: string };

interface Envelope {
  success: boolean;
  message?: string;
  code?: string;
  data?: { answer?: Answer };
  errors?: { field: string; message: string }[];
}

const messages: Record<string, string> = {
  AI_RATE_LIMITED: "The demo is busy right now. Try again in a minute.",
  AI_UNAVAILABLE: "The AI service is unavailable right now. Try again shortly.",
  RATE_LIMITED: "You\u2019re asking quickly. Try again in a few minutes.",
  DAILY_LIMIT_REACHED: "The demo has reached today\u2019s limit. Try again tomorrow.",
  NETWORK_ERROR: "Couldn’t reach Sourced AI. Check your connection and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again.",
};

export async function askQuestion(question: string, conversationId?: string): Promise<AskResult> {
  let body: Envelope;
  try {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, conversation_id: conversationId }),
    });
    body = (await response.json()) as Envelope;
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: messages.NETWORK_ERROR };
  }

  if (body.success && body.data?.answer) return { ok: true, answer: body.data.answer };

  const code = body.code ?? "INTERNAL_ERROR";
  const message =
    code === "VALIDATION_ERROR"
      ? (body.errors?.[0]?.message ?? "Check your question and try again.")
      : (messages[code] ?? messages.INTERNAL_ERROR);
  return { ok: false, code, message };
}
