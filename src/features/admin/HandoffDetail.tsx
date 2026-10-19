"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { demoStore } from "@/features/landing/content";
import { addHandoffNote, getHandoff, setHandoffHandled, type HandoffDetail as Detail, type HandoffRow, type Note } from "./adminApi";
import { ChannelStatusList } from "./ChannelStatus";
import { fullDate, timeAgo } from "./format";
import { PanelSkeleton, SidePanel } from "./SidePanel";
import { Transcript } from "./Transcript";

const NOTE_MAX = 2000;
const COPIED_MS = 2000;

export function StatusPill({ handled }: { handled: boolean }) {
  return (
    <span
      className={cn(
        "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
        handled ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent",
      )}
    >
      {handled ? "Handled" : "Open"}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), COPIED_MS);
      }}
      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy"}</span>
    </button>
  );
}

function CustomerBlock({ detail }: { detail: Detail }) {
  if (!detail.email) {
    return <p className="text-sm text-muted">They didn&apos;t leave an email, so the team can&apos;t reply.</p>;
  }
  const subject = encodeURIComponent(`Re: your question to ${demoStore.name}`);
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium wrap-anywhere">{detail.email}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={detail.email} />
        <a
          href={`mailto:${detail.email}?subject=${subject}`}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-colors hover:bg-accent-strong"
        >
          Reply by email
        </a>
      </div>
    </div>
  );
}

function NoteForm({ id, onAdded }: { id: string; onAdded: (note: Note) => void }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const counterId = useId();
  const empty = body.trim().length === 0;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (empty || saving) return;
        setSaving(true);
        setError(null);
        const result = await addHandoffNote(id, body.trim());
        setSaving(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onAdded(result.data);
        setBody("");
      }}
    >
      <label htmlFor={fieldId} className="text-sm font-medium">
        Add a note
      </label>
      <textarea
        id={fieldId}
        value={body}
        maxLength={NOTE_MAX}
        rows={3}
        aria-describedby={counterId}
        onChange={(event) => setBody(event.target.value)}
        className="w-full resize-y rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
        placeholder="What happened, who is on it, what to do next"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={counterId} className={cn("text-xs tabular-nums", body.length >= NOTE_MAX ? "text-cite" : "text-faint")}>
          {body.length} / {NOTE_MAX}
        </span>
        <button
          type="submit"
          disabled={empty || saving}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
        >
          {saving ? "Saving" : "Add note"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-cite">
          {error}
        </p>
      )}
    </form>
  );
}

interface HandoffDetailProps {
  id: string;
  // The list row, when opened from the list; a ?handoff= link starts without one.
  row: HandoffRow | null;
  onClose: () => void;
  onChanged: () => void;
}

// Spec 005 B13: the handoff opens in a side panel with contact, status, transcript and notes.
export function HandoffDetail({ id, row, onClose, onChanged }: HandoffDetailProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHandoff(id).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetail(result.data);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const summary = detail ?? row;
  const title = summary ? (summary.email ?? "Customer without email") : "Handoff";
  const subtitle = summary ? `Asked for a person ${timeAgo(summary.created_at)}` : undefined;

  const toggleHandled = async () => {
    if (!detail) return;
    const next = !detail.is_handled;
    setBusy(true);
    setActionError(null);
    const result = await setHandoffHandled(id, next);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setDetail({ ...detail, is_handled: next, handled_at: next ? new Date().toISOString() : null });
    onChanged();
  };

  const footer = detail ? (
    <>
      {actionError && (
        <p role="alert" className="mr-auto text-sm text-cite">
          {actionError}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={toggleHandled}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
          detail.is_handled
            ? "border border-line enabled:hover:border-accent enabled:hover:text-accent"
            : "bg-accent text-accent-ink enabled:hover:bg-accent-strong",
        )}
      >
        {detail.is_handled ? "Reopen" : "Mark handled"}
      </button>
    </>
  ) : undefined;

  return (
    <SidePanel title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
      {loadError ? (
        <p role="alert" className="text-sm text-cite">
          {loadError}
        </p>
      ) : !detail ? (
        <PanelSkeleton />
      ) : (
        <div className="flex flex-col gap-7">
          <Section title="Customer">
            <CustomerBlock detail={detail} />
          </Section>

          <Section title="Status">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted">Arrived</dt>
              <dd>
                <time dateTime={detail.created_at}>{fullDate(detail.created_at)}</time>
              </dd>
              <dt className="text-muted">Status</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <StatusPill handled={detail.is_handled} />
                {detail.is_handled && detail.handled_at && (
                  <span className="text-xs text-muted">
                    <time dateTime={detail.handled_at}>{fullDate(detail.handled_at)}</time>
                  </span>
                )}
              </dd>
              <dt className="text-muted">Alerts</dt>
              <dd>
                <ChannelStatusList notifications={detail.notifications} align="start" />
              </dd>
            </dl>
          </Section>

          <Section title="Conversation">
            <Transcript entries={detail.conversation} />
          </Section>

          {/* Spec 005 B14: notes stay internal, newest last. */}
          <section className="flex flex-col gap-3 border-t border-line pt-6">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Internal notes</h3>
              <p className="text-xs text-muted">Only your team sees these.</p>
            </div>
            {detail.notes.length > 0 ? (
              <ol className="flex flex-col gap-2.5" aria-label="Notes">
                {detail.notes.map((note) => (
                  <li key={note.id} className="rounded-2xl border border-line bg-bg px-3.5 py-2.5">
                    <p className="text-sm whitespace-pre-wrap wrap-anywhere">{note.body}</p>
                    <time dateTime={note.created_at} className="mt-1 block text-[11px] text-faint">
                      {fullDate(note.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-faint">No notes yet.</p>
            )}
            <NoteForm id={id} onAdded={(note) => setDetail((current) => (current ? { ...current, notes: [...current.notes, note] } : current))} />
          </section>
        </div>
      )}
    </SidePanel>
  );
}
