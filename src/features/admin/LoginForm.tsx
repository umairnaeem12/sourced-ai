"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "./AdminIcons";
import { signIn } from "./adminApi";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

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
      {/* Password managers save and fill a password against a username, so give them a fixed one. */}
      <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
      <div className="relative mt-2">
        <input
          id="admin-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          disabled={busy}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-line bg-bg py-2.5 pl-3.5 pr-11 text-sm outline-none transition-colors focus:border-accent disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls="admin-password"
          className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {visible ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
        </button>
      </div>
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
