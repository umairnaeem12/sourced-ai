import { AiRateLimitError, AiUnavailableError } from "../ai/ai-provider";
import { GeminiEmbedding } from "../ai/gemini-embedding";
import { loadConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import type { CallerContext } from "../http/caller-context";
import {
  documentRepository,
  type DocumentContent,
  type DocumentOrigin,
  type DocumentPassage,
  type DocumentRepository,
  type DocumentRow,
} from "../repositories/document-repository";
import { parseMarkdownDocument, parsePlainDocument, toPassages, type ParsedDocument } from "./chunk-service";
import type { DocumentFormat } from "./document-text";
import { rateLimitService, type RateLimitService } from "./rate-limit-service";

export const MAX_DOCUMENTS = 25;
// Gemini's batchEmbedContents takes up to 100 texts per call.
const EMBED_BATCH = 100;

export interface DocumentInput {
  format: DocumentFormat;
  text: string;
  // From the form; falls back to the Markdown "# Title", then the file name.
  title: string | null;
  fallback_title: string;
  source_filename: string | null;
  origin: DocumentOrigin;
}

export interface DocumentDetail extends DocumentRow {
  passages: DocumentPassage[];
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "document";
}

export function nextFreeSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.includes(`${base}-${n}`)) return `${base}-${n}`;
  }
}

// Markdown with "# Title" and "## " sections keeps its structure; anything else is cut by size.
export function parseDocument(input: Pick<DocumentInput, "format" | "text" | "title" | "fallback_title">): ParsedDocument {
  if (input.format === "markdown") {
    try {
      const parsed = parseMarkdownDocument(input.text);
      return { ...parsed, title: input.title ?? parsed.title };
    } catch {
      // A Markdown file without the expected headings still has text worth indexing.
    }
  }
  const title = input.title ?? input.fallback_title;
  const body = input.format === "markdown" ? input.text.replace(/^#{1,6}\s+/gm, "") : input.text;
  return parsePlainDocument(title, body);
}

export class DocumentService {
  constructor(
    private readonly documents: Pick<
      DocumentRepository,
      "list" | "countActive" | "findById" | "findBySlug" | "slugsLike" | "passages" | "create" | "replace" | "softDelete" | "titles"
    >,
    private readonly embeddings: Pick<GeminiEmbedding, "embedDocuments">,
    private readonly rateLimits: Pick<RateLimitService, "consume">,
  ) {}

  list(page: number, pageSize: number): Promise<{ rows: DocumentRow[]; total: number }> {
    return this.documents.list(page, pageSize);
  }

  titles(): Promise<string[]> {
    return this.documents.titles();
  }

  async detail(id: string): Promise<DocumentDetail> {
    const document = await this.require(id);
    return { ...document, passages: await this.documents.passages(id) };
  }

  // Without a caller (npm run ingest) no rate limit applies.
  async create(input: DocumentInput, caller?: CallerContext): Promise<DocumentRow> {
    if ((await this.documents.countActive()) >= MAX_DOCUMENTS) {
      throw new ApiError(
        409,
        `You can have up to ${MAX_DOCUMENTS} documents. Delete one to add another.`,
        ErrorCode.DOCUMENT_LIMIT_REACHED,
        true,
        { limit: MAX_DOCUMENTS },
      );
    }
    if (caller) await this.rateLimits.consume("document_write", caller.visitor_id);
    const content = await this.prepare(input);
    const base = slugify(content.title);
    const slug = nextFreeSlug(base, await this.documents.slugsLike(base));
    const id = await this.documents.create(slug, content);
    return this.require(id);
  }

  async replace(id: string, input: DocumentInput, caller?: CallerContext): Promise<DocumentRow> {
    const existing = await this.require(id);
    if (caller) await this.rateLimits.consume("document_write", caller.visitor_id);
    const content = await this.prepare({ ...input, title: input.title ?? existing.title });
    await this.documents.replace(id, content);
    return this.require(id);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.documents.softDelete(id))) {
      throw new ApiError(404, "Document not found", ErrorCode.DOCUMENT_NOT_FOUND);
    }
  }

  // For npm run ingest: sample docs keep their slug, so rerunning updates them in place.
  async upsertSample(slug: string, markdown: string): Promise<DocumentRow> {
    const input: DocumentInput = {
      format: "markdown",
      text: markdown,
      title: null,
      fallback_title: slug,
      source_filename: `${slug}.md`,
      origin: "sample",
    };
    const existing = await this.documents.findBySlug(slug);
    if (existing) return this.replace(existing.id, input);
    const id = await this.documents.create(slug, await this.prepare(input));
    return this.require(id);
  }

  private async prepare(input: DocumentInput): Promise<DocumentContent> {
    const parsed = parseDocument(input);
    const passages = toPassages(parsed);
    const vectors: number[][] = [];
    for (let start = 0; start < passages.length; start += EMBED_BATCH) {
      const batch = passages.slice(start, start + EMBED_BATCH);
      vectors.push(...(await this.embed(batch.map((passage) => ({ title: parsed.title, text: `${passage.heading}\n${passage.content}` })))));
    }
    return {
      title: parsed.title,
      origin: input.origin,
      source_filename: input.source_filename,
      char_count: input.text.length,
      passages: passages.map((passage, i) => ({ ...passage, embedding: vectors[i] })),
    };
  }

  private async embed(texts: { title: string; text: string }[]): Promise<number[][]> {
    try {
      return await this.embeddings.embedDocuments(texts);
    } catch (error) {
      if (error instanceof AiRateLimitError) {
        throw new ApiError(429, "The AI service is busy. Try the upload again in a minute.", ErrorCode.AI_RATE_LIMITED, true, undefined, { cause: error });
      }
      if (error instanceof AiUnavailableError) {
        throw new ApiError(503, "The AI service is unavailable right now.", ErrorCode.AI_UNAVAILABLE, true, undefined, { cause: error });
      }
      throw error;
    }
  }

  private async require(id: string): Promise<DocumentRow> {
    const document = await this.documents.findById(id);
    if (!document) throw new ApiError(404, "Document not found", ErrorCode.DOCUMENT_NOT_FOUND);
    return document;
  }
}

function createDocumentService(): DocumentService {
  const config = loadConfig();
  return new DocumentService(
    documentRepository,
    new GeminiEmbedding(config.GEMINI_API_KEY, config.GEMINI_EMBEDDING_MODEL),
    rateLimitService,
  );
}

export const documentService = createDocumentService();
