// @vitest-environment node
// Spec 005 B21, B22 and AC14.
import { describe, expect, it } from "vitest";
import { ErrorCode } from "../http/api-error";
import { MAX_DOCUMENT_BYTES, readDocumentFile, titleFromFilename } from "./document-text";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("readDocumentFile", () => {
  it("reads Markdown and plain text", async () => {
    await expect(readDocumentFile("care.md", bytes("# Care\n\n## Washing\nHand wash only."))).resolves.toEqual({
      format: "markdown",
      text: "# Care\n\n## Washing\nHand wash only.",
    });
    await expect(readDocumentFile("notes.TXT", bytes("  Opening hours  "))).resolves.toEqual({ format: "text", text: "Opening hours" });
  });

  it.each([
    ["policy.docx", bytes("PK..."), "Upload a .md, .txt or .pdf file."],
    ["empty.md", bytes("   \n  "), "We couldn't find any text in this file."],
    ["fake.pdf", bytes("not really a pdf"), "That file isn't a readable PDF."],
    ["binary.txt", new Uint8Array([0x48, 0x00, 0x49]), "That file isn't plain text. Save it as UTF-8 text or Markdown and try again."],
  ])("refuses %s with DOCUMENT_INVALID", async (name, content, message) => {
    await expect(readDocumentFile(name, content)).rejects.toMatchObject({ statusCode: 422, code: ErrorCode.DOCUMENT_INVALID, message });
  });

  it("refuses files over 2 MB", async () => {
    await expect(readDocumentFile("big.txt", new Uint8Array(MAX_DOCUMENT_BYTES + 1).fill(65))).rejects.toMatchObject({
      code: ErrorCode.DOCUMENT_INVALID,
      message: "Files can be up to 2 MB.",
    });
  });
});

describe("titleFromFilename", () => {
  it("turns a file name into a readable title", () => {
    expect(titleFromFilename("gift-card_terms.pdf")).toBe("Gift card terms");
    expect(titleFromFilename(".md")).toBe("Untitled document");
  });
});
