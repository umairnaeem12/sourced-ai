import { db } from "../db/db-client";
import { visibleOrigin } from "./origin-filter";
import { likePattern, parseCitations, type StoredCitation } from "./question-repository";

export type ConversationStatus = "all" | "answered" | "unanswered" | "handed_off";

export interface ConversationQuery {
  status: ConversationStatus;
  search: string | null;
  page: number;
  page_size: number;
  include_test: boolean;
}

export interface ConversationRow {
  conversation_id: string;
  started_at: Date;
  last_message_at: Date;
  first_question: string;
  questions: number;
  answered: number;
  handoff_id: string | null;
}

export interface ConversationMessage {
  question: string;
  is_answered: boolean;
  answer_text: string;
  citations: StoredCitation[];
  provider: string | null;
  created_at: Date;
}

const STATUS_WHERE: Record<ConversationStatus, string> = {
  all: "true",
  answered: "c.answered = c.questions",
  unanswered: "c.answered < c.questions",
  handed_off: "h.id is not null",
};

// $1 search. Questions logged without a conversation (npm run smoke) aren't chats.
function conversations(query: ConversationQuery): string {
  const visible = visibleOrigin(query.include_test, "q");
  return `
    with convo as (
      select
        q.conversation_id,
        min(q.created_at) as started_at,
        max(q.created_at) as last_message_at,
        (array_agg(q.question order by q.created_at))[1] as first_question,
        count(*)::int as questions,
        count(*) filter (where q.is_answered)::int as answered
      from questions q
      where q.conversation_id is not null and ${visible}
      group by q.conversation_id
    )
    select c.*, h.id as handoff_id
    from convo c
    left join handoffs h on h.conversation_id = c.conversation_id
    where ${STATUS_WHERE[query.status]}
      and ($1::text is null or exists (
        select 1 from questions s where s.conversation_id = c.conversation_id and lower(s.question) like $1 escape '\\'
      ))
  `;
}

export class ConversationRepository {
  async list(query: ConversationQuery): Promise<{ rows: ConversationRow[]; total: number }> {
    const sql = db();
    const search = likePattern(query.search);
    const [rows, totals] = await Promise.all([
      sql.query(`${conversations(query)} order by c.started_at desc limit $2 offset $3`, [
        search,
        query.page_size,
        (query.page - 1) * query.page_size,
      ]),
      sql.query(`select count(*)::int as total from (${conversations(query)}) listed`, [search]),
    ]);
    return {
      rows: rows.map((row) => ({
        conversation_id: String(row.conversation_id),
        started_at: new Date(row.started_at),
        last_message_at: new Date(row.last_message_at),
        first_question: String(row.first_question),
        questions: Number(row.questions),
        answered: Number(row.answered),
        handoff_id: row.handoff_id ? String(row.handoff_id) : null,
      })),
      total: Number(totals[0]?.total ?? 0),
    };
  }

  async messages(conversationId: string, includeTest: boolean): Promise<ConversationMessage[]> {
    const rows = await db().query(
      `
      select question, is_answered, answer_text, citations, provider, created_at
      from questions
      where conversation_id = $1 and ${visibleOrigin(includeTest)}
      order by created_at
      `,
      [conversationId],
    );
    return rows.map((row) => ({
      question: String(row.question),
      is_answered: Boolean(row.is_answered),
      answer_text: String(row.answer_text),
      citations: parseCitations(row.citations),
      provider: row.provider ? String(row.provider) : null,
      created_at: new Date(row.created_at),
    }));
  }

  async handoffIdOf(conversationId: string): Promise<string | null> {
    const [row] = await db()`select id from handoffs where conversation_id = ${conversationId}`;
    return row ? String(row.id) : null;
  }
}

export const conversationRepository = new ConversationRepository();
