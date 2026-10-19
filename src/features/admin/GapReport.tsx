"use client";

import { useState } from "react";
import { ListPage, type Column } from "@/components/list/ListPage";
import { cn } from "@/lib/cn";
import { setGapResolved, type GapRow } from "./adminApi";
import { Sparkline } from "./charts/Sparkline";
import { fullDate, percent, timeAgo } from "./format";

type Tab = "open" | "resolved";

interface Summary {
  questions: number;
  answered: number;
  unanswered: number;
  handoffs_sent: number;
  days: number;
}

const tabs: { value: Tab; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Doc written" },
];

const times = (count: number) => `${count} ${count === 1 ? "time" : "times"}`;

function SummaryCards({ summary }: { summary: Summary | null }) {
  const answeredRate = summary ? percent(summary.answered, summary.questions) : null;
  const cards = [
    { label: "Questions asked", value: summary?.questions },
    { label: "Answered from the docs", value: answeredRate === null ? (summary ? "No data" : undefined) : `${answeredRate}%` },
    { label: "Not answered", value: summary?.unanswered },
    { label: "Handed to a person", value: summary?.handoffs_sent },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <dt className="text-xs text-muted">{card.label}</dt>
          <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {card.value ?? <span className="block h-7 w-12 animate-pulse rounded-lg bg-surface-2" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function QuestionCell({ gap }: { gap: GapRow }) {
  const others = gap.wordings.length - 1;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium wrap-break-word">{gap.question}</span>
      {others > 0 && (
        <span className="text-xs text-muted">
          +{others} other {others === 1 ? "wording" : "wordings"}
        </span>
      )}
      {/* Times asked is its own column from sm up. */}
      <span className="text-xs text-muted tabular-nums sm:hidden">Asked {times(gap.times_asked)}</span>
      {gap.asked_again && (
        <span className="w-fit rounded-full bg-cite-soft px-2 py-0.5 text-[11px] font-medium text-cite">Asked again since marked</span>
      )}
    </div>
  );
}

interface GapActionProps {
  gap: GapRow;
  tab: Tab;
  onChanged: () => void;
}

function GapAction({ gap, tab, onChanged }: GapActionProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolving = tab === "open";
  const label = resolving ? "Mark doc written" : "Reopen";

  async function handleClick() {
    setSaving(true);
    setError(null);
    const result = await setGapResolved(gap.gap_id, resolving);
    setSaving(false);
    if (result.ok) onChanged();
    else setError(result.message);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        aria-label={`${label}: ${gap.question}`}
        disabled={saving}
        onClick={handleClick}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:whitespace-nowrap disabled:opacity-60",
          resolving
            ? "border-accent/40 text-accent enabled:hover:border-accent enabled:hover:bg-accent-soft"
            : "border-line text-ink enabled:hover:border-accent enabled:hover:text-accent",
        )}
      >
        {saving ? "Saving" : label}
      </button>
      {error && (
        <p role="alert" className="max-w-40 text-right text-[11px] leading-snug text-cite">
          {error}
        </p>
      )}
    </div>
  );
}

function Wordings({ gap }: { gap: GapRow }) {
  return (
    <div className="pt-1">
      <p className="text-xs font-medium text-faint">
        {gap.wordings.length === 1 ? "Asked in one wording" : `Asked in ${gap.wordings.length} wordings`}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {gap.wordings.map((wording) => (
          <li
            key={wording.text}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2"
          >
            <span className="min-w-0 wrap-break-word">{wording.text}</span>
            <span className="text-xs text-muted tabular-nums">Asked {times(wording.times_asked)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GapReport() {
  const [tab, setTab] = useState<Tab>("open");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column<GapRow>[] = [
    { key: "question", header: "Question", cell: (gap) => <QuestionCell gap={gap} /> },
    {
      key: "trend",
      header: "Trend",
      hideOnMobile: true,
      cell: (gap) => {
        const recent = gap.daily_counts.reduce((sum, count) => sum + count, 0);
        return <Sparkline values={gap.daily_counts} label={`Asked ${times(recent)} in the last 14 days`} />;
      },
    },
    {
      key: "times_asked",
      header: "Times asked",
      align: "right",
      hideOnMobile: true,
      cell: (gap) => <span className="font-mono tabular-nums">{gap.times_asked}</span>,
    },
    {
      key: "last_asked_at",
      header: "Last asked",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (gap) => (
        <time dateTime={gap.last_asked_at} title={fullDate(gap.last_asked_at)}>
          {timeAgo(gap.last_asked_at)}
        </time>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      className: "px-2 sm:px-5",
      // Spec 005 B18: the row moves tabs, so a successful change reloads the list.
      cell: (gap) => <GapAction gap={gap} tab={tab} onChanged={() => setRefreshKey((key) => key + 1)} />,
    },
  ];

  const toolbar = (
    <div role="tablist" aria-label="Filter gaps" className="flex w-fit gap-1 rounded-full border border-line bg-bg p-1 text-sm">
      {tabs.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={tab === item.value}
          onClick={() => setTab(item.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 whitespace-nowrap transition-colors",
            tab === item.value ? "bg-ink text-bg" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards summary={summary} />
      <ListPage<GapRow>
        endpoint="/api/admin/gaps"
        label="Questions Sourced AI couldn't answer"
        columns={columns}
        rowsPath="gaps"
        rowKey={(gap) => gap.gap_id}
        params={{ status: tab }}
        refreshKey={refreshKey}
        toolbar={toolbar}
        enableSearch
        searchPlaceholder="Search questions"
        emptyMessage={tab === "open" ? "No unanswered questions in the last 30 days." : "Nothing marked as doc written yet."}
        unauthorizedRedirect="/admin/login"
        onData={(data) => setSummary(data.summary as Summary)}
        expandLabel={(gap) => `Show wordings for ${gap.question}`}
        renderExpanded={(gap) => <Wordings gap={gap} />}
      />
    </div>
  );
}
