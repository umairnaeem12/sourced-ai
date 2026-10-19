// @vitest-environment node
// Spec 005 B27 and AC17.
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";
import { SettingsService } from "./settings-service";

const secrets = {
  GEMINI_API_KEY: "gemini-secret-key",
  GROQ_API_KEY: "groq-secret-key",
  RESEND_API_KEY: "resend-secret-key",
  ADMIN_PASSWORD: "admin-pass-123",
  SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/slacksecretpath",
  HANDOFF_WEBHOOK_URL: "https://hooks.example.com/sourced/private-path?token=abc",
  HANDOFF_WEBHOOK_SECRET: "webhook-signing-secret",
};

function view(env: Record<string, string>, isProduction = false) {
  return new SettingsService(() => loadConfig(env as NodeJS.ProcessEnv), () => isProduction).view();
}

describe("SettingsService.view", () => {
  it("never includes a secret, a full webhook URL or the admin password", () => {
    const json = JSON.stringify(view({ ...secrets, HANDOFF_NOTIFY: "slack,email,webhook", HANDOFF_EMAIL_TO: "owner@example.com" }));
    for (const value of Object.values(secrets)) expect(json).not.toContain(value);
    expect(json).toContain("hooks.example.com");
  });

  it("reports each channel's state in plain terms", () => {
    const alerts = view({
      HANDOFF_NOTIFY: "slack,email",
      HANDOFF_EMAIL_TO: "owner@example.com",
      HANDOFF_WEBHOOK_URL: "https://hooks.example.com/x",
    }).alerts;
    expect(alerts).toEqual([
      expect.objectContaining({ channel: "slack", state: "missing_settings", missing: ["SLACK_WEBHOOK_URL"] }),
      expect.objectContaining({ channel: "email", state: "log_only", missing: ["RESEND_API_KEY"] }),
      expect.objectContaining({ channel: "webhook", state: "turned_off", signed: false }),
    ]);
  });

  it("treats email without a provider key as missing in production", () => {
    const [, email] = view({ HANDOFF_NOTIFY: "email", HANDOFF_EMAIL_TO: "owner@example.com" }, true).alerts;
    expect(email.state).toBe("missing_settings");
  });

  it("shows the Groq fallback only when it has a key", () => {
    expect(view({}).answers.fallback).toBeNull();
    expect(view({ GROQ_API_KEY: "k" }).answers.fallback).toEqual({ provider: "groq", model: "llama-3.3-70b-versatile" });
  });
});
