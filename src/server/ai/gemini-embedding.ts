import { z } from "zod";
import { AiUnavailableError, postJson } from "./ai-provider";
import { GEMINI_BASE_URL } from "./gemini-provider";

export const EMBEDDING_DIMENSIONS = 768;

const valuesSchema = z.object({ values: z.array(z.number()) });
const singleResponseSchema = z.object({ embedding: valuesSchema });
const batchResponseSchema = z.object({ embeddings: z.array(valuesSchema) });

export interface DocumentText {
  title: string;
  text: string;
}

// gemini-embedding-2 takes task prefixes in the text instead of a taskType field.
export class GeminiEmbedding {
  private readonly name = "gemini";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async embedQuery(question: string): Promise<number[]> {
    const data = await postJson(
      this.name,
      `${GEMINI_BASE_URL}/models/${this.model}:embedContent`,
      this.headers(),
      {
        content: { parts: [{ text: `task: search result | query: ${question}` }] },
        output_dimensionality: EMBEDDING_DIMENSIONS,
      },
    );
    return this.checked(singleResponseSchema.parse(data).embedding.values);
  }

  async embedDocuments(documents: DocumentText[]): Promise<number[][]> {
    const data = await postJson(
      this.name,
      `${GEMINI_BASE_URL}/models/${this.model}:batchEmbedContents`,
      this.headers(),
      {
        requests: documents.map((document) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text: `title: ${document.title} | text: ${document.text}` }] },
          output_dimensionality: EMBEDDING_DIMENSIONS,
        })),
      },
    );
    const { embeddings } = batchResponseSchema.parse(data);
    if (embeddings.length !== documents.length) {
      throw new AiUnavailableError(this.name, `expected ${documents.length} embeddings, got ${embeddings.length}`);
    }
    return embeddings.map((embedding) => this.checked(embedding.values));
  }

  private headers(): Record<string, string> {
    if (!this.apiKey) throw new AiUnavailableError(this.name, "GEMINI_API_KEY is not set");
    return { "x-goog-api-key": this.apiKey };
  }

  private checked(values: number[]): number[] {
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new AiUnavailableError(this.name, `expected ${EMBEDDING_DIMENSIONS} dimensions, got ${values.length}`);
    }
    return values;
  }
}
