import { db, toVectorLiteral } from "../db/db-client";
import { visibleOrigin } from "./origin-filter";

export type QuestionOrigin = "visitor" | "sample" | "test";

// The cited passage as the customer saw it, kept even if the doc is later replaced.
export interface StoredCitation {
  number: number;
  document_slug: string;
  document_title: string;
  section_number: number;
  heading: string;
  content: string;
}

export interface NewQuestion {
  conversation_id: string | null;
  question: string;
  is_answered: boolean;
  answer_text: string;
  top_similarity: number | null;
  provider: string | null;
  citations: StoredCitation[];
  question_embedding: number[] | null;
  origin: QuestionOrigin;
}

export interface LoggedQuestion {
  question: string;
  is_answered: boolean;
  answer_text: string;
  citations: StoredCitation[];
  created_at: Date;
}

export interface GapWording {
  text: string;
  times_asked: number;
}

export interface GapRow {
  gap_id: string;
  question: string;
  wordings: GapWording[];
  times_asked: number;
  last_asked_at: Date;
  daily_counts: number[];
  resolved_at: Date | null;
  asked_again: boolean;
}

export type GapStatus = "open" | "resolved";

export interface GapQuery {
  include_test: boolean;
  days: number;
  search: string | null;
  page: number;
  page_size: number;
  status: GapStatus;
  time_zone: string;
}

export interface QuestionSummary {
  questions: number;
  answered: number;
  unanswered: number;
}

// Spec 005 T4: rewordings scored 0.93 to 0.99, different asks up to 0.84 ("student" vs
// "military discount"). A wrong merge hides a gap, so this errs on keeping rows apart.
export const GAP_MATCH_SIMILARITY = 0.86;
export const GAP_TREND_DAYS = 14;

// Spec 003 grouping: case, spacing and trailing punctuation don't make a new wording.
export const NORMALIZED = (column = "question") =>
  `lower(regexp_replace(rtrim(trim(${column}), '?!. '), '\\s+', ' ', 'g'))`;

// Escape like-wildcards so a search for "50%" means the text, not a pattern.
export function likePattern(search: string | null): string | null {
  return search ? `%${search.toLowerCase().replace(/[\\%_]/g, "\\$&")}%` : null;
}

export function parseCitations(value: unknown): StoredCitation[] {
  return Array.isArray(value) ? (value as StoredCitation[]) : [];
}

// $1 days, $2 search, $3 status. Open means never marked, or asked again since.
const gapGroups = (includeTest: boolean) => `
  with groups as (
    select gap_id, count(*)::int as times_asked, max(created_at) as last_asked_at
    from questions
    where is_answered = false and ${visibleOrigin(includeTest)} and gap_id is not null
      and created_at >= now() - make_interval(days => $1)
    group by gap_id
  ),
  labelled as (
    select g.*, r.resolved_at, (r.resolved_at is not null and g.last_asked_at > r.resolved_at) as asked_again
    from groups g
    left join gap_resolutions r on r.gap_id = g.gap_id
  )
  select * from labelled l
  where (case when $3 = 'resolved' then l.resolved_at is not null and not l.asked_again
              else l.resolved_at is null or l.asked_again end)
    and ($2::text is null or exists (
      select 1 from questions s
      where s.gap_id = l.gap_id and ${visibleOrigin(includeTest, "s")} and lower(s.question) like $2 escape '\\'
    ))
`;

export class QuestionRepository {
  async create(question: NewQuestion): Promise<void> {
    const embedding = question.question_embedding ? toVectorLiteral(question.question_embedding) : null;
    // Unanswered rows join the nearest earlier gap by meaning, else start their own.
    await db().query(
      `
      insert into questions (
        conversation_id, question, is_answered, answer_text, top_similarity, provider,
        citations, question_embedding, origin, gap_id
      )
      values (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector, $9,
        case when $3 then null else coalesce(
          (
            select q.gap_id from questions q
            where $8::vector is not null
              and q.is_answered = false and (q.origin <> 'test' or $9 = 'test')
              and q.gap_id is not null and q.question_embedding is not null
              and q.created_at >= now() - interval '90 days'
              and 1 - (q.question_embedding <=> $8::vector) >= $10
            order by q.question_embedding <=> $8::vector
            limit 1
          ),
          case when $8::vector is null then md5(${NORMALIZED("$2::text")})::uuid else gen_random_uuid() end
        ) end
      )
      `,
      [
        question.conversation_id,
        question.question,
        question.is_answered,
        question.answer_text,
        question.top_similarity,
        question.provider,
        JSON.stringify(question.citations),
        embedding,
        question.origin,
        GAP_MATCH_SIMILARITY,
      ],
    );
  }

  async findByConversation(conversationId: string): Promise<LoggedQuestion[]> {
    const rows = await db()`
      select question, is_answered, answer_text, citations, created_at
      from questions
      where conversation_id = ${conversationId}
      order by created_at
    `;
    return rows.map((row) => ({
      question: String(row.question),
      is_answered: Boolean(row.is_answered),
      answer_text: String(row.answer_text),
      citations: parseCitations(row.citations),
      created_at: new Date(row.created_at),
    }));
  }

  async listGaps(query: GapQuery): Promise<{ rows: GapRow[]; total: number }> {
    const sql = db();
    const filters = [query.days, likePattern(query.search), query.status];
    const visible = visibleOrigin(query.include_test, "s");
    const [rows, totals] = await Promise.all([
      sql.query(
        `
        select
          l.gap_id, l.times_asked, l.last_asked_at, l.resolved_at, l.asked_again,
          (
            select json_agg(json_build_object('text', w.text, 'times_asked', w.times_asked) order by w.times_asked desc, w.last_asked_at desc)
            from (
              -- The spelling used most within a wording; ties go to the most recent.
              select (array_agg(question order by created_at desc))[1] as text, count(*)::int as times_asked, max(created_at) as last_asked_at
              from questions s
              where s.gap_id = l.gap_id and s.is_answered = false and ${visible}
                and s.created_at >= now() - make_interval(days => $1)
              group by ${NORMALIZED()}
            ) w
          ) as wordings,
          (
            select array_agg(coalesce(c.asked, 0) order by d.day)
            from generate_series(
              date_trunc('day', now() at time zone $6) - make_interval(days => ${GAP_TREND_DAYS - 1}),
              date_trunc('day', now() at time zone $6),
              interval '1 day'
            ) as d(day)
            left join (
              select date_trunc('day', created_at at time zone $6) as day, count(*)::int as asked
              from questions s
              where s.gap_id = l.gap_id and s.is_answered = false and ${visible}
              group by 1
            ) c on c.day = d.day
          ) as daily_counts
        from (${gapGroups(query.include_test)}) l
        order by l.times_asked desc, l.last_asked_at desc
        limit $4 offset $5
        `,
        [...filters, query.page_size, (query.page - 1) * query.page_size, query.time_zone],
      ),
      sql.query(`select count(*)::int as total from (${gapGroups(query.include_test)}) l`, filters),
    ]);
    return {
      rows: rows.map((row) => {
        const wordings = (Array.isArray(row.wordings) ? row.wordings : []) as GapWording[];
        return {
          gap_id: String(row.gap_id),
          question: wordings[0]?.text ?? "",
          wordings,
          times_asked: Number(row.times_asked),
          last_asked_at: new Date(row.last_asked_at),
          daily_counts: (Array.isArray(row.daily_counts) ? row.daily_counts : []).map(Number),
          resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
          asked_again: Boolean(row.asked_again),
        };
      }),
      total: Number(totals[0]?.total ?? 0),
    };
  }

  async gapExists(gapId: string, includeTest: boolean): Promise<boolean> {
    const rows = await db().query(`select 1 from questions where gap_id = $1 and ${visibleOrigin(includeTest)} limit 1`, [gapId]);
    return rows.length > 0;
  }

  async summary(days: number, includeTest: boolean): Promise<QuestionSummary> {
    const [row] = await db().query(
      `
      select
        count(*)::int as questions,
        count(*) filter (where is_answered)::int as answered,
        count(*) filter (where not is_answered)::int as unanswered
      from questions
      where ${visibleOrigin(includeTest)} and created_at >= now() - make_interval(days => $1)
      `,
      [days],
    );
    return {
      questions: Number(row.questions),
      answered: Number(row.answered),
      unanswered: Number(row.unanswered),
    };
  }
}

export const questionRepository = new QuestionRepository();
