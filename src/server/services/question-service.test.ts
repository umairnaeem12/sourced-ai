// @vitest-environment node
// Spec 002, AC3 and AC5.
import { describe, expect, it, vi } from "vitest";
import { AiRateLimitError, AiUnavailableError, type AiProvider } from "../ai/ai-provider";
import { ApiError, ErrorCode } from "../http/api-error";
import type { ScoredPassage } from "../repositories/passage-repository";
import type { QuestionRepository } from "../repositories/question-repository";
import { QuestionService } from "./question-service";

const passage = (similarity: number, heading = "Used and opened items"): ScoredPassage => ({
  id: heading,
  document_slug: "returns-and-refunds",
  document_title: "Returns and refunds",
  section_number: 2,
  heading,
  content: "Used items are accepted if undamaged, minus a 10% restocking fee.",
  similarity,
});

function provider(name: string, generateAnswer: AiProvider["generateAnswer"]): AiProvider {
  return { name, generateAnswer: vi.fn(generateAnswer) };
}

const answered = async () => JSON.stringify({ is_answered: true, answer: "Yes, within 30 days.", citations: [1] });

const settings = { storeName: "Pinebrook Supply", minSimilarity: 0.55, maxPassages: 4 };

function service(
  passages: ScoredPassage[],
  providers: AiProvider[],
  questionLog: Pick<QuestionRepository, "create"> = { create: vi.fn(async () => {}) },
) {
  return new QuestionService(
    { findClosest: vi.fn(async () => passages) },
    { embedQuery: vi.fn(async () => [0.1, 0.2]) },
    providers,
    settings,
    questionLog,
    { consume: vi.fn(async () => {}) },
  );
}

describe("QuestionService.answer", () => {
  it("answers with citations from the passages it sent", async () => {
    const gemini = provider("gemini", answered);
    const result = await service([passage(0.8)], [gemini]).answer("Can I return a used kettle?");

    expect(result.is_answered).toBe(true);
    expect(result.text).toBe("Yes, within 30 days.");
    expect(result.citations).toEqual([
      expect.objectContaining({ number: 1, document_title: "Returns and refunds", section_number: 2 }),
    ]);
  });

  it("says it doesn't know without calling the AI when no passage is close enough", async () => {
    const gemini = provider("gemini", answered);
    const result = await service([passage(0.4), passage(0.3, "Exchanges")], [gemini]).answer("Do you price match?");

    expect(result).toEqual({
      is_answered: false,
      text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.",
      citations: [],
    });
    expect(gemini.generateAnswer).not.toHaveBeenCalled();
  });

  it("sends only the passages above the cutoff", async () => {
    const gemini = provider("gemini", answered);
    await service([passage(0.8), passage(0.5, "Exchanges")], [gemini]).answer("Can I return a used kettle?");

    const [prompt] = vi.mocked(gemini.generateAnswer).mock.calls[0];
    expect(prompt.user).toContain("Used and opened items");
    expect(prompt.user).not.toContain("Exchanges");
  });

  it("returns not answered when the model declines", async () => {
    const gemini = provider("gemini", async () => JSON.stringify({ is_answered: false, answer: "", citations: [] }));
    const result = await service([passage(0.8)], [gemini]).answer("Do you price match?");
    expect(result.is_answered).toBe(false);
  });

  it("falls back to Groq when Gemini is rate limited", async () => {
    const gemini = provider("gemini", async () => {
      throw new AiRateLimitError("gemini");
    });
    const groq = provider("groq", answered);
    const result = await service([passage(0.8)], [gemini, groq]).answer("Can I return a used kettle?");

    expect(result.is_answered).toBe(true);
    expect(groq.generateAnswer).toHaveBeenCalledOnce();
  });

  it("returns AI_RATE_LIMITED when Gemini is rate limited and there is no fallback", async () => {
    const gemini = provider("gemini", async () => {
      throw new AiRateLimitError("gemini");
    });
    const error = await service([passage(0.8)], [gemini]).answer("q").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 429, code: ErrorCode.AI_RATE_LIMITED });
  });

  it("returns AI_UNAVAILABLE when embeddings fail", async () => {
    const questions = new QuestionService(
      { findClosest: vi.fn() },
      {
        embedQuery: vi.fn(async () => {
          throw new AiUnavailableError("gemini", "GEMINI_API_KEY is not set");
        }),
      },
      [provider("gemini", answered)],
      settings,
      { create: vi.fn() },
      { consume: vi.fn(async () => {}) },
    );
    await expect(questions.answer("q")).rejects.toMatchObject({ statusCode: 503, code: ErrorCode.AI_UNAVAILABLE });
  });

  it("logs the question with its conversation, outcome and the text shown", async () => {
    const questionLog = { create: vi.fn(async () => {}) };
    const conversationId = "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
    await service([passage(0.4)], [provider("gemini", answered)], questionLog).answer("Do you price match?", conversationId);

    expect(questionLog.create).toHaveBeenCalledWith({
      conversation_id: conversationId,
      question: "Do you price match?",
      is_answered: false,
      answer_text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.",
      top_similarity: 0.4,
      provider: null,
      citations: [],
      question_embedding: [0.1, 0.2],
      origin: "visitor",
    });
  });

  it("logs the cited passages and a test caller's origin (spec 005)", async () => {
    const questionLog = { create: vi.fn(async () => {}) };
    await service([passage(0.8)], [provider("gemini", answered)], questionLog).answer("Can I return a used kettle?", null, {
      visitor_id: "v1",
      origin: "test",
    });

    expect(questionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "test",
        citations: [expect.objectContaining({ number: 1, document_slug: "returns-and-refunds", heading: "Used and opened items" })],
      }),
    );
  });

  it("still answers when the question log can't be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const questionLog = {
      create: vi.fn(async () => {
        throw new Error("connection reset");
      }),
    };
    const result = await service([passage(0.8)], [provider("gemini", answered)], questionLog).answer("q");

    expect(result.is_answered).toBe(true);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to log question"));
  });

  it("rate-limits callers per visitor and against the daily cap, before any AI call", async () => {
    const consume = vi.fn(async () => {});
    const embedQuery = vi.fn(async () => [0.1]);
    const questions = new QuestionService(
      { findClosest: vi.fn(async () => [passage(0.8)]) },
      { embedQuery },
      [provider("gemini", answered)],
      settings,
      { create: vi.fn(async () => {}) },
      { consume },
    );

    await questions.answer("q", null, { visitor_id: "v1", origin: "visitor" });
    expect(consume.mock.calls).toEqual([
      ["question", "v1"],
      ["question_daily", null],
    ]);

    consume.mockRejectedValueOnce(new ApiError(429, "slow down", ErrorCode.RATE_LIMITED));
    embedQuery.mockClear();
    await expect(questions.answer("q", null, { visitor_id: "v1", origin: "visitor" })).rejects.toMatchObject({ statusCode: 429 });
    expect(embedQuery).not.toHaveBeenCalled();
  });
});
