// @vitest-environment node
// Spec 004, AC1: Claude as an AI provider.
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiRateLimitError, AiUnavailableError } from "./ai-provider";
import { AnthropicProvider } from "./anthropic-provider";

const prompt = { system: "Answer from the passages.", user: "Passages: ...\n\nCustomer question: Can I return it?" };

function message(overrides: Partial<Anthropic.Beta.BetaMessage>): Anthropic.Beta.BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: '{"is_answered":true,"answer":"Yes.","citations":[1]}', citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    ...overrides,
  } as Anthropic.Beta.BetaMessage;
}

function mockCreate(implementation: () => Promise<Anthropic.Beta.BetaMessage>) {
  return vi.spyOn(Anthropic.Beta.Messages.prototype, "create").mockImplementation(
    implementation as unknown as Anthropic.Beta.Messages["create"],
  );
}

afterEach(() => vi.restoreAllMocks());

describe("AnthropicProvider", () => {
  it("sends the prompt with JSON output, low effort and the default refusal fallback", async () => {
    const create = mockCreate(async () => message({}));
    const text = await new AnthropicProvider("sk-test", "claude-opus-5-5").generateAnswer(prompt);

    expect(text).toBe('{"is_answered":true,"answer":"Yes.","citations":[1]}');
    const [params] = create.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { effort: "low", format: { type: "json_schema" } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  });

  it("treats a refusal as not answered", async () => {
    mockCreate(async () => message({ stop_reason: "refusal", content: [] }));
    const text = await new AnthropicProvider("sk-test", "claude-opus-5-5").generateAnswer(prompt);
    expect(JSON.parse(text)).toEqual({ is_answered: false, answer: "", citations: [] });
  });

  it("maps a 429 to rate limited", async () => {
    mockCreate(async () => {
      throw new Anthropic.RateLimitError(429, { type: "error", error: { type: "rate_limit_error" } }, "rate limited", new Headers());
    });
    await expect(new AnthropicProvider("sk-test", "m").generateAnswer(prompt)).rejects.toBeInstanceOf(AiRateLimitError);
  });

  it("maps overloaded, server and connection errors to unavailable", async () => {
    mockCreate(async () => {
      throw new Anthropic.InternalServerError(529, { type: "error", error: { type: "overloaded_error" } }, "overloaded", new Headers());
    });
    await expect(new AnthropicProvider("sk-test", "m").generateAnswer(prompt)).rejects.toBeInstanceOf(AiUnavailableError);

    mockCreate(async () => {
      throw new Anthropic.APIConnectionError({ message: "socket hang up" });
    });
    await expect(new AnthropicProvider("sk-test", "m").generateAnswer(prompt)).rejects.toThrow("connection failed");
  });

  it("is unavailable without an API key", async () => {
    const create = mockCreate(async () => message({}));
    await expect(new AnthropicProvider(undefined, "m").generateAnswer(prompt)).rejects.toThrow("ANTHROPIC_API_KEY is not set");
    expect(create).not.toHaveBeenCalled();
  });
});
