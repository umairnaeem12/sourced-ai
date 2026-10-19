"use client";

import { useEffect, useRef, useState } from "react";
import { TrashIcon, UploadIcon } from "./AdminIcons";
import { deleteDocument, getDocument, type DocumentDetail, type DocumentRow } from "./adminApi";
import { DocumentForm } from "./DocumentForm";
import { fullDate, timeAgo } from "./format";
import { PanelSkeleton, SidePanel } from "./SidePanel";

interface DocumentDetailPanelProps {
  row: DocumentRow;
  onClose: () => void;
  onReplaced: (document: DocumentRow) => void;
  onDeleted: (title: string) => void;
}

type Load = { status: "loading" } | { status: "ready"; document: DocumentDetail } | { status: "error"; message: string };

export function sourceLabel(origin: DocumentRow["origin"]): string {
  return origin === "sample" ? "Sample doc" : "Uploaded";
}

export function passageCount(count: number): string {
  return `${count} ${count === 1 ? "passage" : "passages"}`;
}

const secondaryButton =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50";

export function DocumentDetailPanel({ row, onClose, onReplaced, onDeleted }: DocumentDetailPanelProps) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setLoad({ status: "loading" });
    getDocument(row.id).then((result) => {
      if (!active) return;
      setLoad(result.ok ? { status: "ready", document: result.data } : { status: "error", message: result.message });
    });
    return () => {
      active = false;
    };
  }, [row.id, reload]);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  const current: DocumentRow = load.status === "ready" ? load.document : row;

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteDocument(row.id);
    setDeleting(false);
    if (result.ok) onDeleted(current.title);
    else setDeleteError(result.message);
  };

  const subtitle = (
    <>
      {passageCount(current.passage_count)} · {sourceLabel(current.origin)} · updated{" "}
      <time dateTime={current.updated_at} title={fullDate(current.updated_at)}>
        {timeAgo(current.updated_at)}
      </time>
    </>
  );

  const footer = replacing ? undefined : confirming ? (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm">
        Delete <span className="font-medium">{current.title}</span>? The chat stops using it right away.
      </p>
      {deleteError && (
        <p role="alert" className="text-sm text-cite">
          {deleteError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={() => setConfirming(false)} disabled={deleting} className={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-full border border-cite px-4 py-2 text-sm font-medium text-cite transition-colors enabled:hover:bg-cite-soft disabled:opacity-60"
        >
          <TrashIcon />
          {deleting ? "Deleting…" : "Delete document"}
        </button>
      </div>
    </div>
  ) : (
    <>
      <button type="button" onClick={() => setReplacing(true)} className={secondaryButton}>
        <UploadIcon />
        Replace
      </button>
      <button
        type="button"
        onClick={() => {
          setDeleteError(null);
          setConfirming(true);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-cite transition-colors hover:border-cite hover:bg-cite-soft"
      >
        <TrashIcon />
        Delete
      </button>
    </>
  );

  return (
    <SidePanel title={current.title} subtitle={subtitle} onClose={onClose} footer={footer}>
      {replacing ? (
        <div className="flex flex-col gap-4">
          {/* Spec 005 B23: passages are swapped in one step, so the chat never sees half a document. */}
          <p className="text-sm text-muted">
            The new version replaces every passage of {current.title} at once. Questions keep using the current version until it finishes.
          </p>
          <DocumentForm
            documentId={row.id}
            initialTitle={current.title}
            onCancel={() => setReplacing(false)}
            onSaved={(document) => {
              setReplacing(false);
              setReload((count) => count + 1);
              onReplaced(document);
            }}
          />
        </div>
      ) : load.status === "loading" ? (
        <PanelSkeleton />
      ) : load.status === "error" ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-cite">
            {load.message}
          </p>
          <button type="button" onClick={() => setReload((count) => count + 1)} className={secondaryButton}>
            Try again
          </button>
        </div>
      ) : load.document.passages.length === 0 ? (
        <p className="text-sm text-muted">This document has no passages.</p>
      ) : (
        <ol aria-label={`Passages in ${current.title}`} className="flex flex-col gap-3">
          {load.document.passages.map((passage) => (
            <li key={passage.section_number} className="rounded-2xl border border-line bg-bg/60 p-4">
              <h3 className="flex items-baseline gap-2 font-medium">
                <span className="text-xs text-faint tabular-nums">{passage.section_number}.</span>
                <span className="min-w-0 break-words">{passage.heading}</span>
              </h3>
              <p className="mt-2 text-sm break-words whitespace-pre-line text-muted">{passage.content}</p>
            </li>
          ))}
        </ol>
      )}
    </SidePanel>
  );
}
