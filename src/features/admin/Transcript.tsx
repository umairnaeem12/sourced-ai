"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Citation, TranscriptEntry } from "./adminApi";
import { fullDate } from "./format";

function Source({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-xs transition-colors hover:border-accent"
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-cite-soft text-[10px] font-semibold text-cite">
          {citation.number}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {citation.document_title} <span className="text-faint">· {citation.heading}</span>
        </span>
      </button>
      {open && (
        <blockquote className="mt-1.5 rounded-lg border-l-2 border-cite bg-cite-soft/40 px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-muted">
          {citation.content}
        </blockquote>
      )}
    </li>
  );
}

interface TranscriptProps {
  entries: TranscriptEntry[];
}

// Spec 005 B12: each answer with the sources it cited; opening one shows the passage used.
export function Transcript({ entries }: TranscriptProps) {
  return (
    <ol className="flex flex-col gap-5" aria-label="Conversation">
      {entries.map((entry, i) => (
        <li key={i} className="flex flex-col gap-2">
          <div className="flex flex-col items-end gap-1">
            <p className="max-w-[88%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-accent-ink">{entry.question}</p>
            <time dateTime={entry.created_at} className="text-[11px] text-faint">
              {fullDate(entry.created_at)}
            </time>
          </div>
          <div
            className={cn(
              "max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm leading-relaxed",
              entry.is_answered ? "border-line bg-bg" : "border-cite/40 bg-cite-soft",
            )}
          >
            <p>{entry.answer_text}</p>
            {!entry.is_answered && <p className="mt-1 text-xs font-medium text-cite">Not answered by the docs</p>}
            {entry.is_answered && entry.citations.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-1.5" aria-label="Sources">
                {entry.citations.map((citation) => (
                  <Source key={citation.number} citation={citation} />
                ))}
              </ul>
            )}
            {entry.is_answered && entry.citations.length === 0 && (
              <p className="mt-1.5 text-xs text-faint">Sources not recorded</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
