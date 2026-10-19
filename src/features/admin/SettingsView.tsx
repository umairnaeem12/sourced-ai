"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { getSettings, sendTestAlert, type Channel, type ChannelState, type Settings } from "./adminApi";

type Alert = Settings["alerts"][number];
type TestState = { sending: boolean; result: { ok: boolean; message: string } | null };

const PROVIDER_NAME: Record<string, string> = { gemini: "Gemini", groq: "Groq", openai: "OpenAI", anthropic: "Claude" };
const CHANNEL_NAME: Record<Channel, string> = { slack: "Slack", email: "Email", webhook: "Webhook" };
const CHANNEL_ENV: Record<Channel, string> = {
  slack: "SLACK_WEBHOOK_URL",
  email: "HANDOFF_EMAIL_TO, RESEND_API_KEY",
  webhook: "HANDOFF_WEBHOOK_URL, HANDOFF_WEBHOOK_SECRET",
};
const SET_UP_HINT: Record<Channel, string> = {
  slack: "Add SLACK_WEBHOOK_URL and add slack to HANDOFF_NOTIFY.",
  email: "Add HANDOFF_EMAIL_TO and RESEND_API_KEY, and add email to HANDOFF_NOTIFY.",
  webhook: "Add HANDOFF_WEBHOOK_URL and add webhook to HANDOFF_NOTIFY.",
};
const BADGE: Record<ChannelState, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-accent-soft text-accent" },
  log_only: { label: "Writes to the server log", className: "bg-surface-2 text-muted" },
  missing_settings: { label: "Missing settings", className: "bg-cite-soft text-cite" },
  turned_off: { label: "Turned off", className: "border border-line text-muted" },
  not_set_up: { label: "Not set up", className: "border border-line text-faint" },
};

const providerName = (provider: string) => PROVIDER_NAME[provider] ?? provider;

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Spec 005 B27: plain words per state; targets are hosts or the owner's inbox, never a secret.
function channelDetail(alert: Alert): string[] {
  switch (alert.state) {
    case "connected": {
      if (alert.channel === "email") return [`Emails ${alert.target ?? "the store owner"}`];
      const lines = [`Posts to ${alert.target ?? (alert.channel === "slack" ? "hooks.slack.com" : "your webhook")}`];
      if (alert.channel === "webhook") lines.push(alert.signed ? "Signed" : "Not signed, add HANDOFF_WEBHOOK_SECRET");
      return lines;
    }
    case "log_only":
      return ["Add RESEND_API_KEY to send real email."];
    case "missing_settings":
      return [`Turned on in HANDOFF_NOTIFY but missing ${joinNames(alert.missing)}`];
    case "turned_off":
      return ["Set up but not in HANDOFF_NOTIFY. Add it there to use it."];
    case "not_set_up":
      return [SET_UP_HINT[alert.channel]];
  }
}

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSettings().then((result) => {
      if (cancelled) return;
      if (result.ok) setSettings(result.data);
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-5 text-sm shadow-card">
        <span className="text-cite">{error}</span>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-accent hover:text-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="grid gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading settings">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5 shadow-card">
            <span className="h-4 w-1/3 animate-pulse rounded-full bg-surface-2" />
            <span className="h-3 w-2/3 animate-pulse rounded-full bg-surface-2" />
            <span className="mt-2 h-3 w-full animate-pulse rounded-full bg-surface-2" />
            <span className="h-3 w-5/6 animate-pulse rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    );
  }

  const { store, answers, alerts, admin } = settings;
  const modelEnv = answers.provider in PROVIDER_NAME ? `, ${answers.provider.toUpperCase()}_MODEL` : "";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Section title="Store" description="The name customers see and the time zone the dashboard counts days in.">
        <Row label="Store name" env="STORE_NAME">
          {store.name}
        </Row>
        <Row label="Time zone" env="STORE_TIMEZONE">
          <Code>{store.time_zone}</Code>
        </Row>
      </Section>

      <Section title="Answers" description="Which AI writes the answers and how closely it sticks to your docs.">
        <Row label="AI provider" env={`AI_PROVIDER${modelEnv}`}>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {providerName(answers.provider)}
            {answers.model && <Code>{answers.model}</Code>}
          </span>
        </Row>
        <Row label="Fallback" env="GROQ_API_KEY, GROQ_MODEL">
          {answers.fallback ? (
            <>
              {providerName(answers.fallback.provider)}, <Code>{answers.fallback.model}</Code>, used when the main
              provider is busy
            </>
          ) : (
            "None"
          )}
        </Row>
        <Row label="Embedding model" env="GEMINI_EMBEDDING_MODEL">
          <Code>{answers.embedding_model}</Code>
        </Row>
        <Row label="Match cutoff" env="MIN_SIMILARITY" help="Passages scoring below this are ignored">
          {answers.min_similarity.toFixed(2)}
        </Row>
        <Row label="Daily question limit" env="DAILY_QUESTION_LIMIT">
          {answers.daily_question_limit.toLocaleString("en-US")}
        </Row>
      </Section>

      <Section
        title="Handoff alerts"
        description="Where Sourced AI tells you a customer wants a person."
        note="Every handoff also lands in the Inbox, whatever is set here."
      >
        {alerts.map((alert) => (
          <AlertRow key={alert.channel} alert={alert} />
        ))}
      </Section>

      <Section title="Admin" description="Signing in to this dashboard.">
        <Row label="Session length">{admin.session_hours === 1 ? "1 hour" : `${admin.session_hours} hours`}</Row>
        <Row label="Admin password" env="ADMIN_PASSWORD">
          {admin.password_set ? "Set" : "Not set"}
        </Row>
        <Row label="Public access" env="ADMIN_PUBLIC">
          {admin.public_access ? "On: anyone with the link can use this dashboard" : "Off: the password is required"}
        </Row>
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  note?: string;
  children: React.ReactNode;
}

function Section({ title, description, note, children }: SectionProps) {
  return (
    <section aria-label={title} className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <dl className="mt-3 divide-y divide-line">{children}</dl>
      {note && <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{note}</p>}
    </section>
  );
}

interface RowProps {
  label: string;
  env?: string;
  help?: string;
  children: React.ReactNode;
}

function Row({ label, env, help, children }: RowProps) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm text-muted">
        {label}
        {env && <span className="mt-0.5 block break-all font-mono text-[11px] text-faint">{env}</span>}
      </dt>
      <dd className="min-w-0 text-sm text-ink sm:text-right">
        <div className="break-words">{children}</div>
        {help && <p className="mt-0.5 text-xs text-faint">{help}</p>}
      </dd>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <span className="break-all font-mono text-xs">{children}</span>;
}

function AlertRow({ alert }: { alert: Alert }) {
  const [test, setTest] = useState<TestState>({ sending: false, result: null });
  const name = CHANNEL_NAME[alert.channel];
  const badge = BADGE[alert.state];
  // Spec 005 AC18: the server refuses tests for channels that can't send, so only offer the button where it works.
  const canTest = alert.state === "connected" || alert.state === "log_only";

  async function runTest() {
    setTest({ sending: true, result: null });
    const result = await sendTestAlert(alert.channel);
    setTest({ sending: false, result: result.ok ? { ok: true, message: result.data.message } : { ok: false, message: result.message } });
  }

  return (
    // Hints are sentences, so they read left to right under the channel name.
    <div className="flex flex-col gap-2 py-3">
      <dt className="text-sm text-muted">
        {name}
        <span className="mt-0.5 block break-all font-mono text-[11px] text-faint">{CHANNEL_ENV[alert.channel]}</span>
      </dt>
      <dd className="flex min-w-0 flex-col items-start gap-1.5 text-sm text-ink">
        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {badge.label}
        </span>
        {channelDetail(alert).map((line) => (
          <span key={line} className="break-words text-muted">
            {line}
          </span>
        ))}
        {canTest && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p aria-live="polite" className="order-last text-xs">
              {test.result &&
                (test.result.ok ? (
                  <span className="text-accent">{test.result.message}</span>
                ) : (
                  <span role="alert" className="text-cite">
                    {test.result.message}
                  </span>
                ))}
            </p>
            <button
              type="button"
              onClick={runTest}
              disabled={test.sending}
              aria-label={test.sending ? `Sending a test alert to ${name}` : `Send a test alert to ${name}`}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {test.sending ? "Sending…" : "Send test alert"}
            </button>
          </div>
        )}
      </dd>
    </div>
  );
}
