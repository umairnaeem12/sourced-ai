import { z } from "zod";
import { AiUnavailableError, postJson, type AiProvider, type AnswerPrompt } from "./ai-provider";

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const answerSchema = {
  type: "OBJECT",
  properties: {
    is_answered: { type: "BOOLEAN" },
    answer: { type: "STRING" },
    citations: { type: "ARRAY", items: { type: "INTEGER" } },
  },
  required: ["is_answered", "answer", "citations"],
};

const generateResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
});

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async generateAnswer(prompt: AnswerPrompt): Promise<string> {
    if (!this.apiKey) throw new AiUnavailableError(this.name, "GEMINI_API_KEY is not set");

    const data = await postJson(
      this.name,
      `${GEMINI_BASE_URL}/models/${this.model}:generateContent`,
      { "x-goog-api-key": this.apiKey },
      {
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: "user", parts: [{ text: prompt.user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: answerSchema,
        },
      },
    );

    const candidate = generateResponseSchema.parse(data).candidates?.[0];
    // Thinking models can return thought parts; only the final text is the answer.
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought && part.text)
      .map((part) => part.text)
      .join("");
    if (!text) {
      throw new AiUnavailableError(this.name, `empty response (${candidate?.finishReason ?? "no candidate"})`);
    }
    return text;
  }
}
