import { z } from "zod";

// Spec 005 query and body schemas for the admin dashboard.
export const OVERVIEW_PERIODS = [7, 30, 90] as const;

const overviewQuerySchema = z.object({
  days: z.coerce
    .number()
    .refine((days) => (OVERVIEW_PERIODS as readonly number[]).includes(days), "days must be 7, 30 or 90")
    .default(30),
});

export const gapStatusSchema = z.enum(["open", "resolved"]).default("open");
export const conversationStatusSchema = z.enum(["all", "answered", "unanswered", "handed_off"]).default("all");

export const gapIdSchema = z.uuid({ error: "gap_id must be a UUID" });
export const conversationIdSchema = z.uuid({ error: "conversation_id must be a UUID" });

export const updateGapSchema = z.object(
  { is_resolved: z.boolean({ error: "is_resolved must be true or false" }) },
  { error: "Send a JSON body with is_resolved" },
);

export const MAX_NOTE_LENGTH = 2000;

export const createNoteSchema = z.object(
  {
    body: z
      .string({ error: "Write a note" })
      .trim()
      .min(1, "Write a note")
      .max(MAX_NOTE_LENGTH, `Notes can be up to ${MAX_NOTE_LENGTH} characters`),
  },
  { error: "Send a JSON body with the note" },
);

function param(url: string, name: string): string | undefined {
  return new URL(url).searchParams.get(name) ?? undefined;
}

export function parseOverviewDays(url: string): number {
  return overviewQuerySchema.parse({ days: param(url, "days") }).days;
}

export function parseGapStatus(url: string) {
  return gapStatusSchema.parse(param(url, "status"));
}

export function parseConversationStatus(url: string) {
  return conversationStatusSchema.parse(param(url, "status"));
}
