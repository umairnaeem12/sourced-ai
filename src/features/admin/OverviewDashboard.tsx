"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronRightIcon, RefreshIcon } from "./AdminIcons";
import { getOverview, type GapRow, type HandoffRow, type Overview, type PeriodTotals } from "./adminApi";
import { BarList } from "./charts/BarList";
import { BusyHeatmap } from "./charts/BusyHeatmap";
import { DailyQuestionsChart } from "./charts/DailyQuestionsChart";
import { StatTile, type StatDelta } from "./charts/StatTile";
import { duration, percent, timeAgo } from "./format";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const count = new Intl.NumberFormat("en");

function zoneLabel(timeZone: string): string {
  return timeZone.replaceAll("_", " ");
}

function signed(value: number, text: string): string {
  return `${value > 0 ? "+" : "-"}${text}`;
}

function direction(change: number): StatDelta["direction"] {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

// goodWhenUp is null for volume numbers, where more is neither good nor bad.
function judge(dir: StatDelta["direction"], goodWhenUp: boolean | null): boolean | null {
  if (goodWhenUp === null || dir === "flat") return null;
  return (dir === "up") === goodWhenUp;
}

function countDelta(current: number, previous: number, goodWhenUp: boolean | null): StatDelta | null {
  if (previous === 0) {
    return current > 0 ? { text: "New", direction: "up", isGood: judge("up", goodWhenUp) } : null;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  const dir = direction(change);
  return { text: dir === "flat" ? "No change" : signed(change, `${Math.abs(change)}%`), direction: dir, isGood: judge(dir, goodWhenUp) };
}

function answerRate(totals: PeriodTotals): number | null {
  return totals.questions > 0 ? (totals.answered / totals.questions) * 100 : null;
}

function rateDelta(current: PeriodTotals, previous: PeriodTotals): StatDelta | null {
  const now = answerRate(current);
  const before = answerRate(previous);
  if (now === null || before === null) return null;
  const change = Math.round(now - before);
  const dir = direction(change);
  const points = `${Math.abs(change)} ${Math.abs(change) === 1 ? "pt" : "pts"}`;
  return { text: dir === "flat" ? "No change" : signed(change, points), direction: dir, isGood: judge(dir, true) };
}

function handleDelta(current: number | null, previous: number | null): StatDelta | null {
  if (current === null || previous === null) return null;
  const change = Math.round(current - previous);
  const dir = direction(change);
  return { text: dir === "flat" ? "No change" : signed(change, duration(Math.abs(change))), direction: dir, isGood: judge(dir, false) };
}

interface CardProps {
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

function Card({ title, description, action, className, children }: CardProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
      <ChevronRightIcon className="size-3.5" />
    </Link>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

interface PeriodPickerProps {
  value: Period;
  onChange: (value: Period) => void;
}

function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + PERIODS.length) % PERIODS.length;
    onChange(PERIODS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Period"
      className="grid w-full grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1 text-sm sm:flex sm:w-fit"
    >
      {PERIODS.map((period, index) => {
        const checked = period === value;
        return (
          <button
            key={period}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(period)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              checked ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            Last {period} days
          </button>
        );
      })}
    </div>
  );
}

function GapList({ gaps }: { gaps: GapRow[] }) {
  if (gaps.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No open gaps. Every question in this period was answered.</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-line">
      {gaps.slice(0, 5).map((gap) => (
        <li key={gap.gap_id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0 text-sm break-words">{gap.question}</span>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {gap.times_asked === 1 ? "Asked once" : `Asked ${count.format(gap.times_asked)} times`}
          </span>
        </li>
      ))}
    </ol>
  );
}

function HandoffList({ handoffs }: { handoffs: HandoffRow[] }) {
  if (handoffs.length === 0) return <p className="py-6 text-center text-sm text-muted">No open handoffs.</p>;
  return (
    <ol className="flex flex-col divide-y divide-line">
      {handoffs.slice(0, 5).map((handoff) => (
        <li key={handoff.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={cn("min-w-0 text-sm break-all", !handoff.email && "text-faint")}>{handoff.email ?? "No email"}</span>
          <span className="shrink-0 text-right text-xs text-muted">
            <span className="tabular-nums">{handoff.question_count === 1 ? "1 question" : `${handoff.question_count} questions`}</span>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {timeAgo(handoff.created_at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Tiles({ overview }: { overview: Overview | null }) {
  if (!overview) {
    const labels = ["Conversations", "Questions", "Answer rate", "Handoffs", "Median time to handle"];
    return (
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {labels.map((label) => (
          <StatTile key={label} label={label} value={null} delta={null} comparison="" />
        ))}
      </dl>
    );
  }

  const { totals, previous_totals: previous } = overview;
  const comparison = `vs previous ${overview.period.days} days`;
  const rate = percent(totals.answered, totals.questions);
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile
        label="Conversations"
        value={count.format(totals.conversations)}
        delta={countDelta(totals.conversations, previous.conversations, null)}
        comparison={comparison}
      />
      <StatTile
        label="Questions"
        value={count.format(totals.questions)}
        delta={countDelta(totals.questions, previous.questions, null)}
        comparison={comparison}
      />
      <StatTile
        label="Answer rate"
        value={rate === null ? "No data" : `${rate}%`}
        delta={rateDelta(totals, previous)}
        comparison={comparison}
      />
      <StatTile
        label="Handoffs"
        value={count.format(totals.handoffs)}
        delta={countDelta(totals.handoffs, previous.handoffs, false)}
        comparison={comparison}
      />
      <StatTile
        label="Median time to handle"
        value={totals.median_handle_minutes === null ? "None handled" : duration(totals.median_handle_minutes)}
        delta={handleDelta(totals.median_handle_minutes, previous.median_handle_minutes)}
        comparison={comparison}
      />
    </dl>
  );
}

function Panels({ overview }: { overview: Overview }) {
  const zone = zoneLabel(overview.period.time_zone);
  const noQuestions = overview.totals.questions === 0;
  return (
    <>
      <Card title="Questions per day" description={`Answered from the docs and not answered, by day in ${zone} time.`}>
        <DailyQuestionsChart days={overview.daily} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Most cited docs" description="The 5 docs cited by the most answers.">
          <BarList
            label="Most cited docs"
            items={overview.top_documents.map((doc) => ({ key: doc.document_slug, label: doc.document_title, value: doc.answers }))}
            valueLabel={(value) => (value === 1 ? "1 answer" : `${count.format(value)} answers`)}
            // Spec 005 B9: an empty period reads the same on every chart.
            emptyMessage={noQuestions ? "No questions in this period" : "No answers cited a doc in this period"}
          />
        </Card>
        <Card title="Busiest times" description={`Questions by weekday and hour, in ${zone} time.`}>
          <BusyHeatmap cells={overview.busiest} timeZone={overview.period.time_zone} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Top open gaps"
          description="Questions the docs couldn’t answer, most asked first."
          action={<CardLink href="/admin/gaps">View gap report</CardLink>}
        >
          <GapList gaps={overview.top_gaps} />
        </Card>
        <Card
          title="Newest open handoffs"
          description="Customers waiting for a reply from the team."
          action={<CardLink href="/admin/handoffs">Open inbox</CardLink>}
        >
          <HandoffList handoffs={overview.recent_handoffs} />
        </Card>
      </div>
    </>
  );
}

function PanelSkeletons() {
  return (
    <>
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="mt-5 h-[220px] w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-5 h-40 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

// Spec 005 B5 to B9: period picker, headline numbers, charts and the two short lists.
export function OverviewDashboard() {
  const [days, setDays] = useState<Period>(30);
  const [reloadKey, setReloadKey] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOverview(days).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setOverview(result.data);
        setError(null);
      } else {
        // Figures from another period would sit under the wrong picker value, so drop them.
        setOverview(null);
        setError(result.message);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  const reload = () => {
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const selectPeriod = (period: Period) => {
    if (period === days) return;
    setError(null);
    setDays(period);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker value={days} onChange={selectPeriod} />
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          <RefreshIcon className={cn("size-4", loading && "motion-safe:animate-spin")} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-line bg-surface px-5 py-12 text-center shadow-card">
          <p role="alert" className="text-sm text-cite">
            {error}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
          >
            Try again
          </button>
        </div>
      ) : (
        <div aria-busy={loading} className={cn("flex flex-col gap-4 transition-opacity", loading && overview && "opacity-60")}>
          <Tiles overview={overview} />
          {overview ? <Panels overview={overview} /> : <PanelSkeletons />}
        </div>
      )}
    </div>
  );
}
