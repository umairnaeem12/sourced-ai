// @vitest-environment node
// Spec 005 B21 to B24, AC13 and AC15.
import { describe, expect, it, vi } from "vitest";
import { ApiError, ErrorCode } from "../http/api-error";
import type { DocumentRepository, DocumentRow } from "../repositories/document-repository";
import { DocumentService, MAX_DOCUMENTS, nextFreeSlug, parseDocument, slugify, type DocumentInput } from "./document-service";

const row: DocumentRow = {
  id: "doc-1",
  slug: "gift-wrapping",
  title: "Gift wrapping",
  origin: "upload",
  source_filename: "gift-wrapping.md",
  char_count: 60,
  passage_count: 2,
  created_at: new Date("2026-10-19T10:00:00Z"),
  updated_at: new Date("2026-10-19T10:00:00Z"),
};

const markdown: DocumentInput = {
  format: "markdown",
  text: "# Gift wrapping\n\n## Is it available\nYes, for $5.\n\n## Messages\nAdd a note at checkout.",
  title: null,
  fallback_title: "gift wrapping",
  source_filename: "gift-wrapping.md",
  origin: "upload",
};

function setup(active = 5) {
  const documents = {
    list: vi.fn(),
    titles: vi.fn(),
    countActive: vi.fn(async () => active),
    findById: vi.fn(async () => row),
    findBySlug: vi.fn(async () => null),
    slugsLike: vi.fn(async () => ["gift-wrapping"]),
    passages: vi.fn(async () => []),
    create: vi.fn(async () => "doc-1"),
    replace: vi.fn(async () => {}),
    softDelete: vi.fn(async () => true),
  } satisfies Partial<Record<keyof DocumentRepository, unknown>>;
  const embeddings = { embedDocuments: vi.fn(async (texts: unknown[]) => texts.map(() => [0.1, 0.2])) };
  const rateLimits = { consume: vi.fn(async () => {}) };
  return { documents, embeddings, rateLimits, service: new DocumentService(documents, embeddings, rateLimits) };
}

describe("DocumentService.create", () => {
  it("keeps one passage per ## section and gives the slug a free suffix", async () => {
    const { service, documents, embeddings } = setup();
    await service.create(markdown);

    expect(embeddings.embedDocuments).toHaveBeenCalledOnce();
    const [slug, content] = documents.create.mock.calls[0] as unknown as [string, { title: string; passages: { heading: string }[] }];
    expect(slug).toBe("gift-wrapping-2");
    expect(content.title).toBe("Gift wrapping");
    expect(content.passages.map((passage) => passage.heading)).toEqual(["Is it available", "Messages"]);
  });

  it("refuses a 26th document with the limit in context", async () => {
    const { service, embeddings } = setup(MAX_DOCUMENTS);
    await expect(service.create(markdown)).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCode.DOCUMENT_LIMIT_REACHED,
      context: { limit: 25 },
    });
    expect(embeddings.embedDocuments).not.toHaveBeenCalled();
  });
});

describe("DocumentService rate limit (spec 005 amendment, AC24)", () => {
  it("counts each upload against the visitor before any indexing", async () => {
    const { service, rateLimits, embeddings } = setup();
    rateLimits.consume.mockRejectedValueOnce(new ApiError(429, "slow down", ErrorCode.RATE_LIMITED));
    await expect(service.create(markdown, { visitor_id: "v1", origin: "visitor" })).rejects.toMatchObject({ statusCode: 429 });
    expect(rateLimits.consume).toHaveBeenCalledWith("document_write", "v1");
    expect(embeddings.embedDocuments).not.toHaveBeenCalled();
  });

  it("skips the limit for the ingest script, which has no caller", async () => {
    const { service, rateLimits } = setup();
    await service.create(markdown);
    expect(rateLimits.consume).not.toHaveBeenCalled();
  });
});

describe("DocumentService.remove", () => {
  it("returns DOCUMENT_NOT_FOUND for an unknown or deleted id", async () => {
    const { service, documents } = setup();
    documents.softDelete.mockResolvedValueOnce(false);
    await expect(service.remove("missing")).rejects.toMatchObject({ statusCode: 404, code: ErrorCode.DOCUMENT_NOT_FOUND });
  });
});

describe("document helpers", () => {
  it("slugifies titles and finds the next free slug", () => {
    expect(slugify("Café & Kitchen: Care Guide!")).toBe("cafe-kitchen-care-guide");
    expect(slugify("!!!")).toBe("document");
    expect(nextFreeSlug("care", ["care", "care-2"])).toBe("care-3");
  });

  it("indexes Markdown without headings as plain text", () => {
    const parsed = parseDocument({ format: "markdown", text: "Just a paragraph about returns.", title: null, fallback_title: "Returns note" });
    expect(parsed.title).toBe("Returns note");
    expect(parsed.sections).toHaveLength(1);
  });
});
