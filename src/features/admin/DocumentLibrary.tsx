"use client";

import { useCallback, useState } from "react";
import { ListPage, type Column } from "@/components/list/ListPage";
import { cn } from "@/lib/cn";
import { UploadIcon } from "./AdminIcons";
import type { DocumentRow } from "./adminApi";
import { DocumentDetailPanel, passageCount, sourceLabel } from "./DocumentDetailPanel";
import { DocumentForm } from "./DocumentForm";
import { fileSize, fullDate, timeAgo } from "./format";
import { SidePanel } from "./SidePanel";

type Panel = { kind: "add" } | { kind: "detail"; row: DocumentRow } | null;

const columns: Column<DocumentRow>[] = [
  {
    key: "title",
    header: "Document",
    cell: (row) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium break-words">{row.title}</span>
        {row.source_filename && <span className="text-xs break-all text-faint">{row.source_filename}</span>}
      </span>
    ),
  },
  {
    key: "passage_count",
    header: "Passages",
    align: "right",
    cell: (row) => <span className="tabular-nums">{row.passage_count}</span>,
  },
  {
    key: "char_count",
    header: "Size",
    align: "right",
    hideOnMobile: true,
    className: "whitespace-nowrap",
    cell: (row) => <span className="text-muted tabular-nums">{fileSize(row.char_count)}</span>,
  },
  {
    key: "origin",
    header: "Source",
    hideOnMobile: true,
    cell: (row) => (
      <span
        className={cn(
          "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
          row.origin === "sample" ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent",
        )}
      >
        {sourceLabel(row.origin)}
      </span>
    ),
  },
  {
    key: "updated_at",
    header: "Updated",
    hideOnMobile: true,
    className: "whitespace-nowrap text-muted",
    cell: (row) => (
      <time dateTime={row.updated_at} title={fullDate(row.updated_at)}>
        {timeAgo(row.updated_at)}
      </time>
    ),
  },
];

export function DocumentLibrary() {
  const [panel, setPanel] = useState<Panel>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState<{ total: number; limit: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const closePanel = useCallback(() => setPanel(null), []);
  const changed = (message: string) => {
    setRefreshKey((key) => key + 1);
    setAnnouncement(message);
  };

  // Spec 005 B24: the library holds at most `limit` documents.
  const full = counts !== null && counts.total >= counts.limit;
  const blockedMessage = full
    ? `You have ${counts.total} of ${counts.limit} documents, the most Sourced AI keeps. Delete one to add another.`
    : null;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setPanel({ kind: "add" })}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong"
      >
        <UploadIcon />
        Add document
      </button>
      {counts && (
        <span className={cn("text-xs tabular-nums", full ? "text-cite" : "text-muted")}>
          {counts.total} of {counts.limit} documents
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className={cn("text-sm text-accent", !announcement && "sr-only")}>
        {announcement}
      </p>
      <ListPage<DocumentRow>
        endpoint="/api/admin/documents"
        label="Help documents"
        showCount={false}
        columns={columns}
        rowsPath="documents"
        rowKey={(row) => row.id}
        refreshKey={refreshKey}
        toolbar={toolbar}
        emptyMessage="No documents yet. Add one so the chat has something to answer from."
        unauthorizedRedirect="/admin/login"
        onData={(data) => {
          const pagination = data.pagination as { total?: number } | undefined;
          setCounts({ total: Number(pagination?.total ?? 0), limit: Number(data.limit ?? 25) });
        }}
        onRowOpen={(row) => setPanel({ kind: "detail", row })}
        openLabel={(row) => `Open ${row.title}`}
        selectedKey={panel?.kind === "detail" ? panel.row.id : null}
      />

      {panel?.kind === "add" && (
        <SidePanel title="Add document" subtitle="Markdown, plain text or a PDF with selectable text." onClose={closePanel}>
          <DocumentForm
            blockedMessage={blockedMessage}
            onCancel={closePanel}
            onSaved={(document) => {
              setPanel(null);
              changed(`Added ${document.title} with ${passageCount(document.passage_count)}.`);
            }}
          />
        </SidePanel>
      )}

      {panel?.kind === "detail" && (
        <DocumentDetailPanel
          key={panel.row.id}
          row={panel.row}
          onClose={closePanel}
          onReplaced={(document) => changed(`Replaced ${document.title} with ${passageCount(document.passage_count)}.`)}
          onDeleted={(title) => {
            setPanel(null);
            changed(`Deleted ${title}.`);
          }}
        />
      )}
    </div>
  );
}
