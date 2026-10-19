import { AiRateLimitError, AiUnavailableError, type AiProvider, type AnswerPrompt } from "../ai/ai-provider";
import { createAiProviders } from "../ai/ai-providers";
import { GeminiEmbedding } from "../ai/gemini-embedding";
import { loadConfig } from "../config";
import type { CallerContext } from "../http/caller-context";
import { ApiError, ErrorCode } from "../http/api-error";
import { logger } from "../logger";
import { passageRepository, type PassageRepository, type ScoredPassage } from "../repositories/passage-repository";
import { questionRepository, type QuestionRepository } from "../repositories/question-repository";
import { buildAnswerPrompt, parseModelAnswer } from "./answer-prompt";
import { rateLimitService, type RateLimitService } from "./rate-limit-service";

export interface Citation {
  number: number;
  document_slug: string;
  document_title: string;
  section_number: number;
  heading: string;
  content: string;
}

export interface AnswerResult {
  is_answered: boolean;
  text: string;
  citations: Citation[];
}

interface Resolved {
  result: AnswerResult;
  topSimilarity: number | null;
  provider: string | null;
  embedding: number[];
}

interface QuestionSettings {
  storeName: string;
  minSimilarity: number;
  maxPassages: number;
}

function toCitation(passage: ScoredPassage, number: number): Citation {
  return {
    number,
    document_slug: passage.document_slug,
    document_title: passage.document_title,
    section_number: passage.section_number,
    heading: passage.heading,
    content: passage.content,
  };
}

export class QuestionService {
  constructor(
    private readonly passages: Pick<PassageRepository, "findClosest">,
    private readonly embeddings: Pick<GeminiEmbedding, "embedQuery">,
    private readonly providers: AiProvider[],
    private readonly settings: QuestionSettings,
    private readonly questionLog: Pick<QuestionRepository, "create">,
    private readonly rateLimits: Pick<RateLimitService, "consume">,
  ) {}

  // Without a caller (scripts like npm run smoke) no rate limit applies.
  async answer(question: string, conversationId: string | null = null, caller?: CallerContext): Promise<AnswerResult> {
    if (caller) {
      await this.rateLimits.consume("question", caller.visitor_id);
      await this.rateLimits.consume("question_daily", null);
    }
    const { result, topSimilarity, provider, embedding } = await this.resolve(question);
    try {
      await this.questionLog.create({
        conversation_id: conversationId,
        question,
        is_answered: result.is_answered,
        answer_text: result.text,
        top_similarity: topSimilarity,
        provider,
        citations: result.citations,
        question_embedding: embedding,
        origin: caller?.origin ?? "visitor",
      });
    } catch (error) {
      // Spec 003: a lost log row must never cost the customer their answer.
      logger.error("Failed to log question", { error: error instanceof Error ? error.message : String(error) });
    }
    return result;
  }

  private async resolve(question: string): Promise<Resolved> {
    const embedding = await this.withAiErrors(() => this.embeddings.embedQuery(question));
    const candidates = await this.passages.findClosest(embedding, this.settings.maxPassages);
    const relevant = candidates.filter((passage) => passage.similarity >= this.settings.minSimilarity);
    const topSimilarity = candidates[0]?.similarity ?? null;

    // Spec 002: no evidence, no model call.
    if (relevant.length === 0) {
      logger.info("Question not answered", { reason: "no_close_passage", top_similarity: topSimilarity });
      return { result: this.notAnswered(), topSimilarity, provider: null, embedding };
    }

    const prompt = buildAnswerPrompt(this.settings.storeName, question, relevant);
    const { text, provider } = await this.withAiErrors(() => this.generate(prompt));
    const parsed = parseModelAnswer(text, relevant.length);

    logger.info(parsed.is_answered ? "Question answered" : "Question not answered", {
      reason: parsed.is_answered ? undefined : "model_declined",
      provider,
      top_similarity: topSimilarity,
      passages_sent: relevant.length,
    });
    if (!parsed.is_answered) return { result: this.notAnswered(), topSimilarity, provider, embedding };

    return {
      result: {
        is_answered: true,
        text: parsed.text,
        citations: parsed.cited.map((passageNumber, i) => toCitation(relevant[passageNumber - 1], i + 1)),
      },
      topSimilarity,
      provider,
      embedding,
    };
  }

  private notAnswered(): AnswerResult {
    return {
      is_answered: false,
      text: `I couldn't find that in ${this.settings.storeName}'s help docs, so I won't guess.`,
      citations: [],
    };
  }

  private async generate(prompt: AnswerPrompt): Promise<{ text: string; provider: string }> {
    const [primary, fallback] = this.providers;
    try {
      return { text: await primary.generateAnswer(prompt), provider: primary.name };
    } catch (error) {
      const recoverable = error instanceof AiRateLimitError || error instanceof AiUnavailableError;
      if (!fallback || !recoverable) throw error;
      logger.warn("Primary AI provider failed, trying fallback", {
        primary: primary.name,
        fallback: fallback.name,
        error: error.message,
      });
      return { text: await fallback.generateAnswer(prompt), provider: fallback.name };
    }
  }

  private async withAiErrors<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof AiRateLimitError) {
        throw new ApiError(429, "The demo is busy right now. Try again in a minute.", ErrorCode.AI_RATE_LIMITED, true, undefined, { cause: error });
      }
      if (error instanceof AiUnavailableError) {
        throw new ApiError(503, "The AI service is unavailable right now.", ErrorCode.AI_UNAVAILABLE, true, undefined, { cause: error });
      }
      throw error;
    }
  }
}

function createQuestionService(): QuestionService {
  const config = loadConfig();
  return new QuestionService(
    passageRepository,
    new GeminiEmbedding(config.GEMINI_API_KEY, config.GEMINI_EMBEDDING_MODEL),
    createAiProviders(config),
    { storeName: config.STORE_NAME, minSimilarity: config.MIN_SIMILARITY, maxPassages: 4 },
    questionRepository,
    rateLimitService,
  );
}

export const questionService = createQuestionService();
