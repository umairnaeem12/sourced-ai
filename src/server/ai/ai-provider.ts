// Spec 002 agrees to this one interface: the AI provider is a setting by product requirement.
export interface AnswerPrompt {
  system: string;
  user: string;
}

export interface AiProvider {
  readonly name: string;
  // Returns the model's raw text, expected to be the answer JSON.
  generateAnswer(prompt: AnswerPrompt): Promise<string>;
}

export class AiRateLimitError extends Error {
  constructor(readonly provider: string) {
    super(`${provider} rate limit reached`);
    this.name = "AiRateLimitError";
  }
}

export class AiUnavailableError extends Error {
  constructor(
    readonly provider: string,
    detail: string,
  ) {
    super(`${provider} unavailable: ${detail}`);
    this.name = "AiUnavailableError";
  }
}

export const ANSWER_JSON_SHAPE = '{"is_answered": boolean, "answer": string, "citations": number[]}';

export async function postJson(
  provider: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new AiUnavailableError(provider, error instanceof Error ? error.message : "request failed");
  }

  if (response.status === 429) throw new AiRateLimitError(provider);
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new AiUnavailableError(provider, `HTTP ${response.status} ${detail}`.trim());
  }
  return response.json();
}
