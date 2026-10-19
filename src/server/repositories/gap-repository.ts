import { db } from "../db/db-client";

// Spec 005: "doc written" marks on gap groups. A later question in the group reopens it.
export class GapRepository {
  async resolve(gapId: string): Promise<void> {
    await db()`
      insert into gap_resolutions (gap_id) values (${gapId})
      on conflict (gap_id) do update set resolved_at = now()
    `;
  }

  async reopen(gapId: string): Promise<void> {
    await db()`delete from gap_resolutions where gap_id = ${gapId}`;
  }
}

export const gapRepository = new GapRepository();
