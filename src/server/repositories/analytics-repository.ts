import { db } from "../db/db-client";
import { visibleOrigin } from "./origin-filter";

export interface PeriodTotals {
  conversations: number;
  questions: number;
  answered: number;
  handoffs: number;
  median_handle_minutes: number | null;
}

export interface DailyCount {
  date: string;
  answered: number;
  unanswered: number;
}

export interface DocumentCitationCount {
  document_slug: string;
  document_title: string;
  answers: number;
}

export interface BusyCell {
  // ISO weekday, 1 = Monday.
  weekday: number;
  hour: number;
  questions: number;
}

export interface OverviewWindow {
  days: number;
  time_zone: string;
  include_test: boolean;
}

// $1 days, $2 time zone. Periods are whole days in the store's zone: today and the days before it.
const PERIOD_START = `((date_trunc('day', now() at time zone $2) - make_interval(days => $1 - 1)) at time zone $2)`;
const PREVIOUS_START = `(${PERIOD_START} - make_interval(days => $1))`;

function totalsSql(from: string, to: string, includeTest: boolean): string {
  const visible = visibleOrigin(includeTest);
  return `
    select
      (select count(distinct conversation_id)::int from questions
        where ${visible} and created_at >= ${from} and created_at < ${to}) as conversations,
      (select count(*)::int from questions
        where ${visible} and created_at >= ${from} and created_at < ${to}) as questions,
      (select count(*)::int from questions
        where ${visible} and is_answered and created_at >= ${from} and created_at < ${to}) as answered,
      (select count(*)::int from handoffs
        where ${visible} and created_at >= ${from} and created_at < ${to}) as handoffs,
      (select percentile_cont(0.5) within group (order by extract(epoch from handled_at - created_at) / 60)
        from handoffs
        where ${visible} and handled_at is not null and created_at >= ${from} and created_at < ${to}) as median_handle_minutes
  `;
}

function toTotals(row: Record<string, unknown> | undefined): PeriodTotals {
  return {
    conversations: Number(row?.conversations ?? 0),
    questions: Number(row?.questions ?? 0),
    answered: Number(row?.answered ?? 0),
    handoffs: Number(row?.handoffs ?? 0),
    median_handle_minutes: row?.median_handle_minutes == null ? null : Math.round(Number(row.median_handle_minutes)),
  };
}

export class AnalyticsRepository {
  async totals(window: OverviewWindow): Promise<{ current: PeriodTotals; previous: PeriodTotals }> {
    const sql = db();
    const params = [window.days, window.time_zone];
    const [current, previous] = await Promise.all([
      sql.query(totalsSql(PERIOD_START, "now()", window.include_test), params),
      sql.query(totalsSql(PREVIOUS_START, PERIOD_START, window.include_test), params),
    ]);
    return { current: toTotals(current[0]), previous: toTotals(previous[0]) };
  }

  // One row per day, including days nobody asked anything.
  async daily(window: OverviewWindow): Promise<DailyCount[]> {
    const rows = await db().query(
      `
      select to_char(d.day, 'YYYY-MM-DD') as date, coalesce(c.answered, 0) as answered, coalesce(c.unanswered, 0) as unanswered
      from generate_series(
        date_trunc('day', now() at time zone $2) - make_interval(days => $1 - 1),
        date_trunc('day', now() at time zone $2),
        interval '1 day'
      ) as d(day)
      left join (
        select
          date_trunc('day', created_at at time zone $2) as day,
          count(*) filter (where is_answered)::int as answered,
          count(*) filter (where not is_answered)::int as unanswered
        from questions
        where ${visibleOrigin(window.include_test)} and created_at >= ${PERIOD_START}
        group by 1
      ) c on c.day = d.day
      order by d.day
      `,
      [window.days, window.time_zone],
    );
    return rows.map((row) => ({
      date: String(row.date),
      answered: Number(row.answered),
      unanswered: Number(row.unanswered),
    }));
  }

  async topDocuments(window: OverviewWindow, limit = 5): Promise<DocumentCitationCount[]> {
    const rows = await db().query(
      `
      select
        citation->>'document_slug' as document_slug,
        max(citation->>'document_title') as document_title,
        count(distinct q.id)::int as answers
      from questions q
      cross join lateral jsonb_array_elements(q.citations) as citation
      where ${visibleOrigin(window.include_test, "q")} and q.created_at >= ${PERIOD_START}
      group by 1
      order by answers desc, document_title
      limit $3
      `,
      [window.days, window.time_zone, limit],
    );
    return rows.map((row) => ({
      document_slug: String(row.document_slug),
      document_title: String(row.document_title),
      answers: Number(row.answers),
    }));
  }

  async busiest(window: OverviewWindow): Promise<BusyCell[]> {
    const rows = await db().query(
      `
      select
        extract(isodow from created_at at time zone $2)::int as weekday,
        extract(hour from created_at at time zone $2)::int as hour,
        count(*)::int as questions
      from questions
      where ${visibleOrigin(window.include_test)} and created_at >= ${PERIOD_START}
      group by 1, 2
      `,
      [window.days, window.time_zone],
    );
    return rows.map((row) => ({ weekday: Number(row.weekday), hour: Number(row.hour), questions: Number(row.questions) }));
  }

  async hasSampleData(): Promise<boolean> {
    const [row] = await db()`
      select exists (select 1 from questions where origin = 'sample')
          or exists (select 1 from handoffs where origin = 'sample') as has_sample
    `;
    return Boolean(row?.has_sample);
  }
}

export const analyticsRepository = new AnalyticsRepository();
