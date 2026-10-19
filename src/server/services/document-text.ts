import { ApiError, ErrorCode } from "../http/api-error";

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 200_000;
export const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".pdf"] as const;

export type DocumentFormat = "markdown" | "text" | "pdf";

export interface DocumentText {
  format: DocumentFormat;
  text: string;
}

function invalid(message: string): ApiError {
  return new ApiError(422, message, ErrorCode.DOCUMENT_INVALID);
}

function formatOf(filename: string): DocumentFormat | null {
  const name = filename.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (name.endsWith(".txt")) return "text";
  if (name.endsWith(".pdf")) return "pdf";
  return null;
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  // The extension is only a claim; a real PDF starts with "%PDF-".
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw invalid("That file isn't a readable PDF.");
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return text.join("\n\n");
  } catch {
    throw invalid("That file isn't a readable PDF.");
  }
}

function plainText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw invalid("That file isn't plain text. Save it as UTF-8 text or Markdown and try again.");
  }
  if (text.includes("\u0000")) throw invalid("That file isn't plain text. Save it as UTF-8 text or Markdown and try again.");
  return text.replace(/^﻿/, "");
}

export function checkText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw invalid("We couldn't find any text in this file.");
  if (trimmed.length > MAX_DOCUMENT_CHARS) {
    throw invalid(`Documents can be up to ${MAX_DOCUMENT_CHARS.toLocaleString("en")} characters. Split this one into smaller docs.`);
  }
  return trimmed;
}

// Spec 005 B21 and B22: checks the type and size, then returns the text to index.
export async function readDocumentFile(filename: string, bytes: Uint8Array): Promise<DocumentText> {
  const format = formatOf(filename);
  if (!format) throw invalid("Upload a .md, .txt or .pdf file.");
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw invalid("Files can be up to 2 MB.");
  if (bytes.byteLength === 0) throw invalid("We couldn't find any text in this file.");
  const text = format === "pdf" ? await pdfText(bytes) : plainText(bytes);
  return { format, text: checkText(text) };
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Untitled document";
}
