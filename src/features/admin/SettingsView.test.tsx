// Spec 005 B26 to B28.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, sendTestAlert, type Settings } from "./adminApi";
import { SettingsView } from "./SettingsView";

vi.mock("./adminApi");

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    store: { name: "Pinebrook Supply", time_zone: "America/Denver" },
    answers: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      fallback: { provider: "groq", model: "llama-3.3-70b-versatile" },
      embedding_model: "gemini-embedding-001",
      min_similarity: 0.55,
      daily_question_limit: 200,
    },
    alerts: [
      { channel: "slack", state: "connected", missing: [], target: "hooks.slack.com", signed: null },
      { channel: "email", state: "log_only", missing: ["RESEND_API_KEY"], target: "owner@pinebrook.example", signed: null },
      { channel: "webhook", state: "missing_settings", missing: ["HANDOFF_WEBHOOK_URL"], target: null, signed: null },
    ],
    admin: { session_hours: 12, password_set: true, public_access: false },
    ...overrides,
  };
}

async function renderWith(data: Settings) {
  vi.mocked(getSettings).mockResolvedValue({ ok: true, data });
  render(<SettingsView />);
  return screen.findByRole("region", { name: "Handoff alerts" });
}

describe("SettingsView", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows the store, answer and admin settings", async () => {
    await renderWith(settings());
    expect(screen.getByText("Pinebrook Supply")).toBeInTheDocument();
    expect(screen.getByText("0.55")).toBeInTheDocument();
    expect(screen.getByText("Passages scoring below this are ignored")).toBeInTheDocument();
    expect(screen.getByText("12 hours")).toBeInTheDocument();
    expect(screen.getByText("Set")).toBeInTheDocument();
    expect(screen.getByText("AI_PROVIDER, GEMINI_MODEL")).toBeInTheDocument();
  });

  it.each([
    ["gemini", "Gemini"],
    ["groq", "Groq"],
    ["openai", "OpenAI"],
    ["anthropic", "Claude"],
  ])("names the %s provider %s", async (provider, name) => {
    const base = settings();
    await renderWith(settings({ answers: { ...base.answers, provider, fallback: null } }));
    const answers = screen.getByRole("region", { name: "Answers" });
    expect(within(answers).getByText(name)).toBeInTheDocument();
    expect(within(answers).getByText("None")).toBeInTheDocument();
  });

  it("shows a badge for every channel state", async () => {
    const section = await renderWith(
      settings({
        alerts: [
          { channel: "slack", state: "connected", missing: [], target: "hooks.slack.com", signed: null },
          { channel: "email", state: "log_only", missing: ["RESEND_API_KEY"], target: "owner@pinebrook.example", signed: null },
          { channel: "webhook", state: "missing_settings", missing: ["HANDOFF_WEBHOOK_URL"], target: null, signed: null },
        ],
      }),
    );
    expect(within(section).getByText("Connected")).toBeInTheDocument();
    expect(within(section).getByText("Posts to hooks.slack.com")).toBeInTheDocument();
    expect(within(section).getByText("Writes to the server log")).toBeInTheDocument();
    expect(within(section).getByText("Missing settings")).toBeInTheDocument();
    expect(within(section).getByText("Turned on in HANDOFF_NOTIFY but missing HANDOFF_WEBHOOK_URL")).toBeInTheDocument();
    expect(within(section).getByText("Every handoff also lands in the Inbox, whatever is set here.")).toBeInTheDocument();
  });

  it("shows turned off and not set up channels without a test button", async () => {
    const section = await renderWith(
      settings({
        alerts: [
          { channel: "slack", state: "turned_off", missing: [], target: "hooks.slack.com", signed: null },
          { channel: "email", state: "not_set_up", missing: ["HANDOFF_EMAIL_TO", "RESEND_API_KEY"], target: null, signed: null },
          { channel: "webhook", state: "missing_settings", missing: ["HANDOFF_WEBHOOK_URL"], target: null, signed: null },
        ],
      }),
    );
    expect(within(section).getByText("Turned off")).toBeInTheDocument();
    expect(within(section).getByText("Set up but not in HANDOFF_NOTIFY. Add it there to use it.")).toBeInTheDocument();
    expect(within(section).getByText("Not set up")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: /test alert/ })).not.toBeInTheDocument();
  });

  it("offers a test alert only for connected and log only channels", async () => {
    await renderWith(settings());
    expect(screen.getByRole("button", { name: "Send a test alert to Slack" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a test alert to Email" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send a test alert to Webhook" })).not.toBeInTheDocument();
  });

  it("shows whether a connected webhook is signed", async () => {
    const section = await renderWith(
      settings({
        alerts: [{ channel: "webhook", state: "connected", missing: [], target: "example.com", signed: false }],
      }),
    );
    expect(within(section).getByText("Posts to example.com")).toBeInTheDocument();
    expect(within(section).getByText("Not signed, add HANDOFF_WEBHOOK_SECRET")).toBeInTheDocument();
  });

  it("sends a test alert and shows the result", async () => {
    let finish: (value: Awaited<ReturnType<typeof sendTestAlert>>) => void = () => {};
    vi.mocked(sendTestAlert).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await renderWith(settings());

    await userEvent.click(screen.getByRole("button", { name: "Send a test alert to Slack" }));
    expect(sendTestAlert).toHaveBeenCalledWith("slack");
    expect(screen.getByRole("button", { name: "Sending a test alert to Slack" })).toBeDisabled();

    finish({ ok: true, data: { result: "sent", message: "Test alert sent." } });
    expect(await screen.findByText("Test alert sent.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a test alert to Slack" })).toBeEnabled();
  });

  it("shows a failed test alert as an alert", async () => {
    vi.mocked(sendTestAlert).mockResolvedValue({ ok: false, message: "Slack didn't accept the test alert. (404)" });
    await renderWith(settings());

    await userEvent.click(screen.getByRole("button", { name: "Send a test alert to Slack" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Slack didn't accept the test alert. (404)");
  });

  it("shows a load error with a retry", async () => {
    vi.mocked(getSettings)
      .mockResolvedValueOnce({ ok: false, message: "Something went wrong. Try again." })
      .mockResolvedValueOnce({ ok: true, data: settings() });
    render(<SettingsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Store" })).toBeInTheDocument();
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});
