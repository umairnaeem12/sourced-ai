import { z } from "zod";

const MAX_PAGE_SIZE = 100;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Capped, not rejected: a client asking for 500 gets 100.
  page_size: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((size) => Math.min(size, MAX_PAGE_SIZE)),
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((search) => (search ? search : null)),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseListQuery(url: string): ListQuery {
  const params = Object.fromEntries(new URL(url).searchParams);
  return listQuerySchema.parse(params);
}

export function buildPaginationMeta(page: number, pageSize: number, total: number) {
  return { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) };
}
