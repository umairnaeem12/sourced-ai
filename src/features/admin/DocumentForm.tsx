"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { UploadIcon } from "./AdminIcons";
import { saveDocument, type DocumentRow } from "./adminApi";

type Mode = "file" | "text";

interface DocumentFormProps {
  documentId?: string;
  initialTitle?: string;
  // Set when the library is full; the form explains it and won't submit.
  blockedMessage?: string | null;
  onSaved: (document: DocumentRow) => void;
  onCancel: () => void;
}

// Spec 005 B21: one .md, .txt or .pdf file up to 2 MB.
const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".pdf"];
const MAX_BYTES = 2 * 1024 * 1024;

const inputClass = "w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent";

function byteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function checkFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return `${file.name} can't be added. Choose a .md, .txt or .pdf file.`;
  }
  if (file.size > MAX_BYTES) return `${file.name} is ${byteSize(file.size)}. Files can be up to 2 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

const modes: { value: Mode; label: string }[] = [
  { value: "file", label: "Upload a file" },
  { value: "text", label: "Paste text" },
];

export function DocumentForm({ documentId, initialTitle = "", blockedMessage = null, onSaved, onCancel }: DocumentFormProps) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState("");
  const [fieldError, setFieldError] = useState<{ field: "title" | "text"; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = (next: File | undefined) => {
    setError(null);
    if (!next) return;
    const problem = checkFile(next);
    setFileError(problem);
    setFile(problem ? null : next);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || blockedMessage) return;
    setError(null);
    setFieldError(null);

    const form = new FormData();
    if (mode === "file") {
      if (!file) {
        setFileError(fileError ?? "Choose a file to upload.");
        return;
      }
      form.append("file", file);
      if (title.trim()) form.append("title", title.trim());
    } else {
      if (!title.trim()) {
        setFieldError({ field: "title", message: "Add a title for the pasted text." });
        return;
      }
      if (!text.trim()) {
        setFieldError({ field: "text", message: "Paste the text of the doc." });
        return;
      }
      form.append("title", title.trim());
      form.append("text", text);
    }

    setBusy(true);
    const result = await saveDocument(form, documentId);
    setBusy(false);
    if (result.ok) onSaved(result.data);
    else setError(result.message);
  };

  const titleError = fieldError?.field === "title" ? fieldError.message : null;
  const textError = fieldError?.field === "text" ? fieldError.message : null;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-busy={busy}>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        <div role="radiogroup" aria-label="How to add the document" className="flex w-fit gap-1 rounded-full border border-line bg-bg p-1 text-sm">
          {modes.map((item) => (
            <label
              key={item.value}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                mode === item.value ? "bg-ink text-bg" : "text-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={item.value}
                checked={mode === item.value}
                onChange={() => {
                  setMode(item.value);
                  setError(null);
                  setFieldError(null);
                }}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
        </div>

        {mode === "file" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${id}-file`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pickFile(event.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors has-[:focus-visible]:border-accent",
                  dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-bg hover:border-accent",
                )}
              >
                <UploadIcon className="size-6 text-accent" />
                <span className="text-sm font-medium">{file ? "Choose a different file" : "Choose a file or drop it here"}</span>
                <span className="text-xs text-faint">.md, .txt or .pdf, up to 2 MB</span>
                <input
                  id={`${id}-file`}
                  type="file"
                  accept=".md,.markdown,.txt,.pdf"
                  aria-label="Document file"
                  aria-describedby={fileError ? `${id}-file-error` : undefined}
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              {file && (
                <p className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{byteSize(file.size)}</span>
                </p>
              )}
              {fileError && (
                <p id={`${id}-file-error`} role="alert" className="text-sm text-cite">
                  {fileError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-title`} className="text-sm font-medium">
                Title <span className="font-normal text-faint">(optional)</span>
              </label>
              <input
                id={`${id}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-describedby={`${id}-title-help`}
                maxLength={200}
                className={inputClass}
              />
              <p id={`${id}-title-help`} className="text-xs text-faint">
                Leave empty to use the file&apos;s own title.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-title`} className="text-sm font-medium">
                Title
              </label>
              <input
                id={`${id}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? `${id}-title-error` : undefined}
                maxLength={200}
                className={inputClass}
              />
              {titleError && (
                <p id={`${id}-title-error`} role="alert" className="text-sm text-cite">
                  {titleError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-text`} className="text-sm font-medium">
                Text
              </label>
              <textarea
                id={`${id}-text`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                required
                rows={12}
                aria-invalid={Boolean(textError)}
                aria-describedby={`${id}-text-help${textError ? ` ${id}-text-error` : ""}`}
                className={cn(inputClass, "min-h-48 resize-y font-mono text-[13px] leading-relaxed")}
              />
              <p id={`${id}-text-help`} className="text-xs text-faint">
                Start sections with ## Heading to keep them as separate passages.
              </p>
              {textError && (
                <p id={`${id}-text-error`} role="alert" className="text-sm text-cite">
                  {textError}
                </p>
              )}
            </div>
          </>
        )}
      </fieldset>

      {blockedMessage && <p className="rounded-xl bg-cite-soft px-3.5 py-2.5 text-sm text-cite">{blockedMessage}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-cite-soft px-3.5 py-2.5 text-sm text-cite">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || Boolean(blockedMessage)}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors enabled:hover:bg-accent-strong disabled:opacity-60"
        >
          {busy && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-accent-ink/40 border-t-accent-ink" />}
          {/* Spec 005 B22: indexing embeds every passage, so it can take a few seconds. */}
          {busy ? "Reading and indexing…" : documentId ? "Replace document" : "Add document"}
        </button>
      </div>
    </form>
  );
}
