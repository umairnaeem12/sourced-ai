import Anthropic from "@anthropic-ai/sdk";
import { AiRateLimitError, AiUnavailableError, type AiProvider, type AnswerPrompt } from "./ai-provider";

const answerSchema = {
  type: "object",
  properties: {
    is_answered: { type: "boolean" },
    answer: { type: "string" },
    citations: { type: "array", items: { type: "integer" } },
  },
  required: ["is_answered", "answer", "citations"],
  additionalProperties: false,
};

// A declined request reads as "the docs don't answer this", so the customer gets the honest reply.
const NOT_ANSWERED = JSON.stringify({ is_answered: false, answer: "", citations: [] });

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  private sdk(): Anthropic {
    if (!this.apiKey) throw new AiUnavailableError(this.name, "ANTHROPIC_API_KEY is not set");
    // One retry; the question service already falls back to Groq on a second failure.
    this.client ??= new Anthropic({ apiKey: this.apiKey, maxRetries: 1, timeout: 20_000 });
    return this.client;
  }

  async generateAnswer(prompt: AnswerPrompt): Promise<string> {
    const client = this.sdk();
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
        // Support answers are chat-shaped; low effort keeps them quick.
        output_config: { effort: "low", format: { type: "json_schema", schema: answerSchema } },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) throw new AiRateLimitError(this.name);
      if (error instanceof Anthropic.APIConnectionError) {
        throw new AiUnavailableError(this.name, `connection failed: ${error.message}`);
      }
      if (error instanceof Anthropic.APIError) {
        throw new AiUnavailableError(this.name, `HTTP ${error.status ?? "?"} ${error.type ?? ""}`.trim());
      }
      throw error;
    }

    if (response.stop_reason === "refusal") return NOT_ANSWERED;

    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
    if (!text) throw new AiUnavailableError(this.name, `empty response (${response.stop_reason ?? "no stop reason"})`);
    return text;
  }
}
