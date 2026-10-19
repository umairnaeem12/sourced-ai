import { db } from "../db/db-client";

export class RateLimitRepository {
  // Counts one hit and returns the window's total, in one round trip.
  async hit(bucket: string, windowStart: Date): Promise<number> {
    const [row] = await db()`
      insert into rate_limit_hits (bucket, window_start, hits) values (${bucket}, ${windowStart}, 1)
      on conflict (bucket, window_start) do update set hits = rate_limit_hits.hits + 1
      returning hits
    `;
    return Number(row.hits);
  }

  async count(bucket: string, windowStart: Date): Promise<number> {
    const [row] = await db()`
      select hits from rate_limit_hits where bucket = ${bucket} and window_start = ${windowStart}
    `;
    return row ? Number(row.hits) : 0;
  }

  async deleteOlderThan(cutoff: Date): Promise<void> {
    await db()`delete from rate_limit_hits where window_start < ${cutoff}`;
  }
}

export const rateLimitRepository = new RateLimitRepository();
