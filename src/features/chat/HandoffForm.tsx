"use client";

import { useId, useState } from "react";
import { UserIcon } from "@/features/landing/icons";

interface HandoffFormProps {
  storeName: string;
  sending: boolean;
  error: string | null;
  onSend: (email: string) => void;
  onCancel: () => void;
}

// Loose on purpose; the server validates properly.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HandoffForm({ storeName, sending, error, onSend, onCancel }: HandoffFormProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailId = useId();
  const hintId = useId();

  return (
    <form
      aria-label="Talk to a person"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = email.trim();
        if (value && !LOOKS_LIKE_EMAIL.test(value)) {
          setEmailError("Enter a valid email, or leave it empty");
          return;
        }
        setEmailError(null);
        onSend(value);
      }}
      className="mx-auto w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-4 shadow-card"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UserIcon className="size-3.5" />
        </span>
        Send this conversation to the {storeName} team
      </p>
      <label htmlFor={emailId} className="mt-4 block text-xs font-medium text-muted">
        Your email (optional)
      </label>
      <input
        id={emailId}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        disabled={sending}
        aria-describedby={hintId}
        aria-invalid={emailError ? true : undefined}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-60"
      />
      <p id={hintId} className="mt-1.5 text-xs text-faint">
        Add your email if you&rsquo;d like a reply.
      </p>
      {(emailError ?? error) && (
        <p role="alert" className="mt-2 text-xs text-cite">
          {emailError ?? error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send to the team"}
        </button>
      </div>
    </form>
  );
}
