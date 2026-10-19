import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, ErrorCode } from "../http/api-error";
import { callerOf } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import type { DocumentPassage, DocumentRow } from "../repositories/document-repository";
import { documentService, MAX_DOCUMENTS, type DocumentInput, type DocumentService } from "../services/document-service";
import { checkText, readDocumentFile, titleFromFilename } from "../services/document-text";
import { documentIdSchema, pastedDocumentSchema, uploadTitleSchema } from "../validators/document-validator";
import { buildPaginationMeta, parseListQuery } from "../validators/list-query-validator";

interface DocumentRouteContext {
  params: Promise<{ document_id: string }>;
}

function serializeDocument(document: DocumentRow) {
  return {
    id: document.id,
    slug: document.slug,
    title: document.title,
    origin: document.origin,
    source_filename: document.source_filename,
    char_count: document.char_count,
    passage_count: document.passage_count,
    created_at: document.created_at.toISOString(),
    updated_at: document.updated_at.toISOString(),
  };
}

function serializePassage(passage: DocumentPassage) {
  return { section_number: passage.section_number, heading: passage.heading, content: passage.content };
}

async function documentIdOf(context: DocumentRouteContext): Promise<string> {
  const { document_id } = await context.params;
  return z.object({ document_id: documentIdSchema }).parse({ document_id }).document_id;
}

// Spec 005 B21: one file, or a title plus pasted text, as multipart/form-data.
async function readInput(request: Request): Promise<DocumentInput> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(422, "Send the document as a file upload or pasted text.", ErrorCode.DOCUMENT_INVALID);
  }
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const { format, text } = await readDocumentFile(file.name, new Uint8Array(await file.arrayBuffer()));
    return {
      format,
      text,
      title: uploadTitleSchema.parse(form.get("title") ?? null),
      fallback_title: titleFromFilename(file.name),
      source_filename: file.name.slice(0, 200),
      origin: "upload",
    };
  }
  const pasted = pastedDocumentSchema.parse({ title: form.get("title") ?? undefined, text: form.get("text") ?? undefined });
  const text = checkText(pasted.text);
  return {
    format: /^#\s/m.test(text) ? "markdown" : "text",
    text,
    title: pasted.title,
    fallback_title: pasted.title,
    source_filename: null,
    origin: "upload",
  };
}

export class AdminDocumentController {
  constructor(
    private readonly service: Pick<DocumentService, "list" | "detail" | "create" | "replace" | "remove">,
    // Spec 005 B25: /demo shows the new list on the next visit, not a minute later.
    private readonly onChange: () => void = () => revalidatePath("/demo"),
  ) {}

  list = async (request: Request): Promise<Response> => {
    try {
      const query = parseListQuery(request.url);
      const { rows, total } = await this.service.list(query.page, query.page_size);
      return responseHandler.ok("Documents retrieved", {
        documents: rows.map(serializeDocument),
        limit: MAX_DOCUMENTS,
        pagination: buildPaginationMeta(query.page, query.page_size, total),
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  create = async (request: Request): Promise<Response> => {
    try {
      const document = await this.service.create(await readInput(request), callerOf(request));
      this.onChange();
      return responseHandler.created("Document added", { document: serializeDocument(document) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  show = async (_request: Request, context: DocumentRouteContext): Promise<Response> => {
    try {
      const document = await this.service.detail(await documentIdOf(context));
      return responseHandler.ok("Document retrieved", {
        document: { ...serializeDocument(document), passages: document.passages.map(serializePassage) },
      });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  replace = async (request: Request, context: DocumentRouteContext): Promise<Response> => {
    try {
      const id = await documentIdOf(context);
      const document = await this.service.replace(id, await readInput(request), callerOf(request));
      this.onChange();
      return responseHandler.ok("Document replaced", { document: serializeDocument(document) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  remove = async (_request: Request, context: DocumentRouteContext): Promise<Response> => {
    try {
      await this.service.remove(await documentIdOf(context));
      this.onChange();
      return responseHandler.noContent();
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const adminDocumentController = new AdminDocumentController(documentService);
