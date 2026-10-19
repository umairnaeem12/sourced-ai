"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListPage, type Column } from "@/components/list/ListPage";
import { cn } from "@/lib/cn";
import { getConversation, type ConversationDetail } from "./adminApi";
import { fullDate, timeAgo } from "./format";
import { PanelSkeleton, SidePanel } from "./SidePanel";
import { Transcript } from "./Transcript";

type Tab = "all" | "answered" | "unanswered" | "handed_off";

interface ConversationRow {
  conversation_id: string;
  started_at: string;
  last_message_at: string;
  first_question: string;
  questions: number;
  answered: number;
  handoff_id: string | null;
}

const tabs: { value: Tab; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "No conversations yet." },
  { value: "answered", label: "Answered", empty: "No fully answered conversations yet." },
  { value: "unanswered", label: "Not answered", empty: "Every conversation was answered." },
  { value: "handed_off", label: "Handed off", empty: "No conversations were handed off." },
];

function outcome(row: ConversationRow): { label: string; style: string } {
  if (row.handoff_id) return { label: "Handed off", style: "bg-accent-soft text-accent" };
  if (row.answered === row.questions) return { label: "All answered", style: "bg-surface-2 text-muted" };
  return { label: "Some not answered", style: "bg-cite-soft text-cite" };
}

const columns: Column<ConversationRow>[] = [
  {
    key: "started_at",
    header: "Started",
    className: "whitespace-nowrap",
    cell: (row) => (
      <time dateTime={row.started_at} title={fullDate(row.started_at)}>
        {timeAgo(row.started_at)}
      </time>
    ),
  },
  {
    key: "first_question",
    header: "First question",
    cell: (row) => <span className="font-medium break-words">{row.first_question}</span>,
  },
  {
    key: "questions",
    header: "Questions",
    align: "right",
    hideOnMobile: true,
    cell: (row) => <span className="tabular-nums">{row.questions}</span>,
  },
  {
    key: "answered",
    header: "Answered",
    hideOnMobile: true,
    className: "whitespace-nowrap",
    cell: (row) => (
      <span className="tabular-nums">
        {row.answered} of {row.questions}
      </span>
    ),
  },
  {
    key: "outcome",
    header: "Outcome",
    cell: (row) => {
      const tag = outcome(row);
      return <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-medium", tag.style)}>{tag.label}</span>;
    },
  },
];

interface ConversationPanelProps {
  id: string;
}

// Spec 005 B12: the transcript with its sources, linking to the handoff when there is one.
function ConversationPanel({ id }: ConversationPanelProps) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConversation(id).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetail(result.data);
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-cite">
        {error}
      </p>
    );
  }
  if (!detail) return <PanelSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      {detail.handoff_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <p className="font-medium text-accent">This customer asked for a person.</p>
          <Link
            href={`/admin/handoffs?handoff=${encodeURIComponent(detail.handoff_id)}`}
            className="rounded-full border border-accent px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-accent-ink"
          >
            Open in inbox
          </Link>
        </div>
      )}
      <Transcript entries={detail.messages} />
    </div>
  );
}

export function ConversationList() {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  // Stable so SidePanel doesn't rerun its focus effect on every render.
  const close = useCallback(() => setSelected(null), []);
  const active = tabs.find((item) => item.value === tab) ?? tabs[0];

  const toolbar = (
    <div
      role="tablist"
      aria-label="Filter conversations"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 text-[13px] sm:text-sm"
    >
      {tabs.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={tab === item.value}
          onClick={() => setTab(item.value)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 whitespace-nowrap transition-colors sm:px-3.5",
            tab === item.value ? "bg-ink text-bg" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <ListPage<ConversationRow>
        endpoint="/api/admin/conversations"
        label="Conversations"
        columns={columns}
        rowsPath="conversations"
        rowKey={(row) => row.conversation_id}
        params={{ status: tab }}
        toolbar={toolbar}
        enableSearch
        searchPlaceholder="Search questions"
        emptyMessage={active.empty}
        unauthorizedRedirect="/admin/login"
        onRowOpen={setSelected}
        openLabel={(row) => `Open conversation started ${timeAgo(row.started_at)}`}
        selectedKey={selected?.conversation_id ?? null}
      />
      {selected && (
        <SidePanel
          title="Conversation"
          subtitle={<time dateTime={selected.started_at}>{fullDate(selected.started_at)}</time>}
          onClose={close}
        >
          <ConversationPanel key={selected.conversation_id} id={selected.conversation_id} />
        </SidePanel>
      )}
    </>
  );
}
