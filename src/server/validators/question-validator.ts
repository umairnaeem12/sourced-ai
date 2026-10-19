import { z } from "zod";

export const MAX_QUESTION_LENGTH = 500;

export const createQuestionSchema = z.object(
  {
    question: z
      .string({ error: "Ask a question first" })
      .trim()
      .min(1, "Ask a question first")
      .max(MAX_QUESTION_LENGTH, `Keep questions under ${MAX_QUESTION_LENGTH} characters`),
    conversation_id: z.uuid({ error: "conversation_id must be a UUID" }).optional(),
  },
  { error: "Send a JSON body with a question" },
);
