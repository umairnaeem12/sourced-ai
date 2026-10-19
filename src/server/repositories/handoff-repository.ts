import { db } from "../db/db-client";
import { visibleOrigin } from "./origin-filter";

export type NotificationChannel = "slack" | "email" | "webhook";
export type NotificationStatus = "sent" | "failed" | "logged";
export type HandoffStatusFilter = "open" | "handled" | "all";
export type HandoffOrigin = "visitor" | "sample" | "test";

export interface HandoffNotification {
  channel: NotificationChannel;
  status: NotificationStatus;
  error: string | null;
}

export interface Handoff {
  id: string;
  conversation_id: string;
  email: string | null;
  created_at: Date;
  handled_at: Date | null;
}

export interface HandoffListRow extends Handoff {
  question_count: number;
  notifications: HandoffNotification[];
}

export interface HandoffNote {
  id: string;
  body: string;
  created_at: Date;
}

function toHandoff(row: Record<string, unknown>): Handoff {
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    email: row.email === null ? null : String(row.email),
    created_at: new Date(String(row.created_at)),
    handled_at: row.handled_at === null ? null : new Date(String(row.handled_at)),
  };
}

function toListRow(row: Record<string, unknown>): HandoffListRow {
  const notifications = Array.isArray(row.notifications) ? (row.notifications as HandoffNotification[]) : [];
  return { ...toHandoff(row), question_count: Number(row.question_count), notifications };
}

// One select shared by list and detail, so both shapes stay identical.
const LIST_COLUMNS = `
  h.*,
  (select count(*)::int from questions q where q.conversation_id = h.conversation_id) as question_count,
  coalesce(
    (select json_agg(json_build_object('channel', n.channel, 'status', n.status, 'error', n.error) order by n.channel)
     from handoff_notifications n where n.handoff_id = h.id),
    '[]'::json
  ) as notifications
`;

const STATUS_WHERE: Record<HandoffStatusFilter, string> = {
  open: "h.handled_at is null",
  handled: "h.handled_at is not null",
  all: "true",
};

function toNote(row: Record<string, unknown>): HandoffNote {
  return { id: String(row.id), body: String(row.body), created_at: new Date(String(row.created_at)) };
}

export class HandoffRepository {
  async findByConversation(conversationId: string): Promise<Handoff | null> {
    const [row] = await db()`select * from handoffs where conversation_id = ${conversationId}`;
    return row ? toHandoff(row) : null;
  }

  // Returns null when the conversation already has a handoff (unique conversation_id).
  async create(conversationId: string, email: string | null, origin: HandoffOrigin = "visitor"): Promise<Handoff | null> {
    const [row] = await db()`
      insert into handoffs (conversation_id, email, origin) values (${conversationId}, ${email}, ${origin})
      on conflict (conversation_id) do nothing
      returning *
    `;
    return row ? toHandoff(row) : null;
  }

  async findById(id: string): Promise<HandoffListRow | null> {
    const [row] = await db().query(`select ${LIST_COLUMNS} from handoffs h where h.id = $1`, [id]);
    return row ? toListRow(row) : null;
  }

  async recordNotification(handoffId: string, notification: HandoffNotification): Promise<void> {
    await db()`
      insert into handoff_notifications (handoff_id, channel, status, error)
      values (${handoffId}, ${notification.channel}, ${notification.status}, ${notification.error?.slice(0, 500) ?? null})
      on conflict (handoff_id, channel) do update
        set status = excluded.status, error = excluded.error, created_at = now()
    `;
  }

  async list(
    status: HandoffStatusFilter,
    page: number,
    pageSize: number,
    includeTest: boolean,
  ): Promise<{ rows: HandoffListRow[]; total: number }> {
    const sql = db();
    const where = `${STATUS_WHERE[status]} and ${visibleOrigin(includeTest, "h")}`;
    const [rows, totals] = await Promise.all([
      sql.query(
        `select ${LIST_COLUMNS} from handoffs h where ${where} order by h.created_at desc limit $1 offset $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      sql.query(`select count(*)::int as total from handoffs h where ${where}`),
    ]);
    return { rows: rows.map(toListRow), total: Number(totals[0]?.total ?? 0) };
  }

  async setHandled(id: string, isHandled: boolean): Promise<boolean> {
    const rows = await db()`
      update handoffs set handled_at = ${isHandled ? new Date() : null} where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  async countSince(days: number, includeTest: boolean): Promise<number> {
    const [row] = await db().query(
      `select count(*)::int as total from handoffs where ${visibleOrigin(includeTest)} and created_at >= now() - make_interval(days => $1)`,
      [days],
    );
    return Number(row.total);
  }

  async countOpen(includeTest: boolean): Promise<number> {
    const [row] = await db().query(
      `select count(*)::int as total from handoffs where ${visibleOrigin(includeTest)} and handled_at is null`,
    );
    return Number(row.total);
  }

  async listNotes(handoffId: string): Promise<HandoffNote[]> {
    const rows = await db()`
      select id, body, created_at from handoff_notes where handoff_id = ${handoffId} order by created_at
    `;
    return rows.map(toNote);
  }

  async addNote(handoffId: string, body: string): Promise<HandoffNote> {
    const [row] = await db()`
      insert into handoff_notes (handoff_id, body) values (${handoffId}, ${body}) returning id, body, created_at
    `;
    return toNote(row);
  }
}

export const handoffRepository = new HandoffRepository();
