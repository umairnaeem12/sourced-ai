"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "./adminApi";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      aria-label="Admin sign in"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!password) {
          setError("Enter the admin password.");
          return;
        }
        setBusy(true);
        const result = await signIn(password);
        if (result.ok) {
          router.replace("/admin/overview");
          router.refresh();
          return;
        }
        setBusy(false);
        setError(result.message);
      }}
      className="w-full rounded-3xl border border-line bg-surface p-6 shadow-card"
    >
      <label htmlFor="admin-password" className="text-sm font-medium">
        Admin password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        disabled={busy}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent disabled:opacity-60"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-cite">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
