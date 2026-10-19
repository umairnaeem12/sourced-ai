import { z } from "zod";

export const handoffIdSchema = z.uuid({ error: "handoff_id must be a UUID" });

export const handoffStatusSchema = z.enum(["open", "handled", "all"]).default("open");

export const updateHandoffSchema = z.object(
  { is_handled: z.boolean({ error: "is_handled must be true or false" }) },
  { error: "Send a JSON body with is_handled" },
);

export function parseHandoffStatus(url: string) {
  return handoffStatusSchema.parse(new URL(url).searchParams.get("status") ?? undefined);
}
