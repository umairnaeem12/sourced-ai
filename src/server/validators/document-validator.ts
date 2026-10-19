import { z } from "zod";

export const documentIdSchema = z.uuid({ error: "document_id must be a UUID" });

export const MAX_TITLE_LENGTH = 120;

const titleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, `Titles can be up to ${MAX_TITLE_LENGTH} characters`)
  .transform((title) => (title ? title : null))
  .nullable()
  .default(null);

export const pastedDocumentSchema = z.object({
  title: z.string({ error: "Give the document a title" }).trim().min(1, "Give the document a title").max(MAX_TITLE_LENGTH),
  text: z.string({ error: "Paste the document text" }).trim().min(1, "Paste the document text"),
});

export const uploadTitleSchema = titleSchema;
