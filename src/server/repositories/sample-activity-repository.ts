import { db, toVectorLiteral } from "../db/db-client";
import type { SampleActivity } from "../sample/sample-activity-builder";
import type { StoredCitation } from "./question-repository";

export interface ActivityCounts {
  questions: number;
  handoffs: number;
}

// Resolutions whose gap no longer has any question behind it.
const ORPHAN_RESOLUTIONS = `delete from gap_resolutions r where not exists (select 1 from questions q where q.gap_id = r.gap_id)`;

// Spec 005 B29: the sample set is replaced as a whole, inside one transaction.
export class SampleActivityRepository {
  async sectionPassages(): Promise<Map<string, Omit<StoredCitation, "number">>> {
    const rows = await db()`
      select distinct on (d.slug, p.heading)
        d.slug as document_slug, d.title as document_title, p.section_number, p.heading, p.content
      from passages p
      join documents d on d.id = p.document_id
      where d.deleted_at is null
      order by d.slug, p.heading, p.created_at
    `;
    return new Map(
      rows.map((row) => [
        `${row.document_slug}|${row.heading}`,
        {
          document_slug: String(row.document_slug),
          document_title: String(row.document_title),
          section_number: Number(row.section_number),
          heading: String(row.heading),
          content: String(row.content),
        },
      ]),
    );
  }

  async replaceSample(activity: SampleActivity): Promise<void> {
    const questions = activity.questions.map((question) => ({
      id: question.id,
      conversation_id: question.conversation_id,
      question: question.question,
      is_answered: question.is_answered,
      answer_text: question.answer_text,
      top_similarity: question.top_similarity,
      provider: question.provider,
      citations: question.citations,
      question_embedding: question.question_embedding ? toVectorLiteral(question.question_embedding) : null,
      gap_id: question.gap_id,
      created_at: question.created_at.toISOString(),
    }));
    const handoffs = activity.handoffs.map((handoff) => ({
      ...handoff,
      created_at: handoff.created_at.toISOString(),
      handled_at: handoff.handled_at?.toISOString() ?? null,
    }));
    const notes = activity.notes.map((note) => ({ ...note, created_at: note.created_at.toISOString() }));
    const resolutions = activity.resolutions.map((resolution) => ({ ...resolution, resolved_at: resolution.resolved_at.toISOString() }));

    const sql = db();
    await sql.transaction((txn) => [
      txn`delete from handoffs where origin = 'sample'`,
      txn`delete from questions where origin = 'sample'`,
      txn.query(ORPHAN_RESOLUTIONS),
      txn.query(
        `
        insert into questions (id, conversation_id, question, is_answered, answer_text, top_similarity, provider,
                               citations, question_embedding, gap_id, origin, created_at)
        select id, conversation_id, question, is_answered, answer_text, top_similarity, provider,
               citations, question_embedding::vector, gap_id, 'sample', created_at
        from jsonb_to_recordset($1::jsonb) as x(
          id uuid, conversation_id uuid, question text, is_answered boolean, answer_text text, top_similarity real,
          provider text, citations jsonb, question_embedding text, gap_id uuid, created_at timestamptz
        )
        `,
        [JSON.stringify(questions)],
      ),
      txn.query(
        `
        insert into handoffs (id, conversation_id, email, origin, created_at, handled_at)
        select id, conversation_id, email, 'sample', created_at, handled_at
        from jsonb_to_recordset($1::jsonb) as x(id uuid, conversation_id uuid, email text, created_at timestamptz, handled_at timestamptz)
        `,
        [JSON.stringify(handoffs)],
      ),
      txn.query(
        `
        insert into handoff_notes (handoff_id, body, created_at)
        select handoff_id, body, created_at
        from jsonb_to_recordset($1::jsonb) as x(handoff_id uuid, body text, created_at timestamptz)
        `,
        [JSON.stringify(notes)],
      ),
      txn.query(
        `
        insert into gap_resolutions (gap_id, resolved_at)
        select gap_id, resolved_at from jsonb_to_recordset($1::jsonb) as x(gap_id uuid, resolved_at timestamptz)
        on conflict (gap_id) do update set resolved_at = excluded.resolved_at
        `,
        [JSON.stringify(resolutions)],
      ),
    ]);
  }

  async clearSample(): Promise<ActivityCounts> {
    const before = await this.counts("sample");
    await db().transaction((txn) => [
      txn`delete from handoffs where origin = 'sample'`,
      txn`delete from questions where origin = 'sample'`,
      txn.query(ORPHAN_RESOLUTIONS),
    ]);
    return before;
  }

  // Every question and handoff, real or not. Documents and passages are left alone.
  async resetAll(): Promise<ActivityCounts> {
    const before = await this.counts(null);
    await db().transaction((txn) => [txn`delete from handoffs`, txn`delete from questions`, txn`delete from gap_resolutions`]);
    return before;
  }

  private async counts(origin: "sample" | null): Promise<ActivityCounts> {
    const [row] = await db()`
      select
        (select count(*)::int from questions where ${origin}::text is null or origin = ${origin}) as questions,
        (select count(*)::int from handoffs where ${origin}::text is null or origin = ${origin}) as handoffs
    `;
    return { questions: Number(row.questions), handoffs: Number(row.handoffs) };
  }
}

export const sampleActivityRepository = new SampleActivityRepository();
