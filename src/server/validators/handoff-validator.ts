import { z } from "zod";

export const createHandoffSchema = z.object(
  {
    conversation_id: z.uuid({ error: "conversation_id must be a UUID" }),
    email: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.email({ error: "Enter a valid email, or leave it empty" }).trim().max(254).optional(),
    ),
  },
  { error: "Send a JSON body with a conversation_id" },
);
