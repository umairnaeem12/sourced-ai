// @vitest-environment node
// Spec 003 amendment: Slack, email and webhook channels (AC12, AC13) and the HANDOFF_NOTIFY setting.
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config";
import { EmailService } from "../email/email-service";
import { EmailNotifier, handoffEmailSubject } from "./email-notifier";
import type { HandoffDetails } from "./handoff-notifier";
import { createHandoffNotifiers } from "./handoff-notifiers";
import { SlackNotifier } from "./slack-notifier";
import { buildWebhookPayload, signWebhookBody, WebhookNotifier } from "./webhook-notifier";

const details: HandoffDetails = {
  id: "8a2b4c6d-1e3f-4a5b-9c7d-0e1f2a3b4c5d",
  conversation_id: "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
  created_at: new Date("2026-10-17T10:01:00Z"),
  email: "sam@example.com",
  store_name: "Pinebrook Supply",
  conversation: [
    { question: "Can I return it?", is_answered: true, answer_text: "Yes, within 30 days.", citations: [], created_at: new Date("2026-10-17T10:00:00Z") },
    { question: "<b>Price</b> match & more?", is_answered: false, answer_text: "I won't guess.", citations: [], created_at: new Date("2026-10-17T10:00:30Z") },
  ],
};

function okFetch() {
  const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async () => new Response("ok", { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("SlackNotifier", () => {
  it("posts the handoff message to the webhook", async () => {
    const fetchMock = okFetch();
    await expect(new SlackNotifier("https://hooks.slack.com/services/T/B/x").send(details)).resolves.toBe("sent");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/T/B/x");
    expect(String(init?.body)).toContain("Customer asked for a person");
  });

  it("refuses a missing or non-Slack URL without calling out", async () => {
    const fetchMock = okFetch();
    await expect(new SlackNotifier(undefined).send(details)).rejects.toThrow("SLACK_WEBHOOK_URL is not set");
    await expect(new SlackNotifier("https://example.com/hook").send(details)).rejects.toThrow("hooks.slack.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("EmailNotifier", () => {
  const service = (apiKey: string | undefined, isProduction = false) =>
    new EmailService({ apiKey, fromName: "Sourced AI", fromAddress: "onboarding@resend.dev", isProduction });

  it("sends through Resend with the customer as reply-to and escaped HTML", async () => {
    const fetchMock = okFetch();
    const result = await new EmailNotifier(service("re_test"), "team@example.com", "https://demo.example").send(details);
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    const headers = init?.headers as Record<string, string>;

    expect(result).toBe("sent");
    expect(url).toBe("https://api.resend.com/emails");
    expect(headers.authorization).toBe("Bearer re_test");
    expect(headers["idempotency-key"]).toBe(`handoff-${details.id}`);
    expect(body).toMatchObject({
      from: "Sourced AI <onboarding@resend.dev>",
      to: ["team@example.com"],
      reply_to: "sam@example.com",
      subject: "Pinebrook Supply: a customer asked for a person (sam@example.com)",
    });
    expect(body.html).toContain("&lt;b&gt;Price&lt;/b&gt; match &amp; more?");
    expect(body.html).toContain("https://demo.example/admin/handoffs");
    expect(body.text).toContain("Customer: <b>Price</b> match & more?");
    expect(body.text).toContain("Sourced AI (not answered): I won't guess.");
  });

  it("logs the email instead of sending when there is no API key outside production", async () => {
    const fetchMock = okFetch();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await new EmailNotifier(service(undefined), "team@example.com", "http://localhost:3100").send(details);
    expect(result).toBe("logged");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails in production without an API key, and without a recipient anywhere", async () => {
    okFetch();
    await expect(new EmailNotifier(service(undefined, true), "team@example.com", "x").send(details)).rejects.toThrow("RESEND_API_KEY");
    await expect(new EmailNotifier(service("re_test"), undefined, "x").send(details)).rejects.toThrow("HANDOFF_EMAIL_TO");
  });

  it("puts the store and email in the subject", () => {
    expect(handoffEmailSubject({ ...details, email: null })).toBe("Pinebrook Supply: a customer asked for a person");
  });
});

describe("WebhookNotifier", () => {
  it("posts the event with a signature the receiver can verify", async () => {
    const fetchMock = okFetch();
    await expect(new WebhookNotifier("https://hooks.example.com/sourced", "s3cret").send(details)).resolves.toBe("sent");
    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const body = String(init?.body);

    expect(headers["x-sourced-event"]).toBe("handoff.created");
    expect(headers["x-sourced-delivery"]).toBe(details.id);
    const expected = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
    expect(headers["x-sourced-signature"]).toBe(expected);
    expect(signWebhookBody(`${body} `, "s3cret")).not.toBe(expected);
  });

  it("builds the documented payload", () => {
    const payload = buildWebhookPayload(details, new Date("2026-10-17T10:02:00Z"));
    expect(payload).toEqual({
      event: "handoff.created",
      sent_at: "2026-10-17T10:02:00.000Z",
      store: "Pinebrook Supply",
      handoff: { id: details.id, created_at: "2026-10-17T10:01:00.000Z", email: "sam@example.com", question_count: 2, unanswered_count: 1 },
      conversation: [
        { question: "Can I return it?", answer: "Yes, within 30 days.", is_answered: true, asked_at: "2026-10-17T10:00:00.000Z" },
        { question: "<b>Price</b> match & more?", answer: "I won't guess.", is_answered: false, asked_at: "2026-10-17T10:00:30.000Z" },
      ],
    });
  });

  it("allows https, and http only for localhost", async () => {
    okFetch();
    await expect(new WebhookNotifier("http://localhost:5678/webhook", undefined).send(details)).resolves.toBe("sent");
    await expect(new WebhookNotifier("http://hooks.example.com/x", undefined).send(details)).rejects.toThrow("https");
  });
});

describe("createHandoffNotifiers", () => {
  it("builds the listed channels once each and ignores unknown names", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = loadConfig({ HANDOFF_NOTIFY: "slack, Email,teams,slack" } as unknown as NodeJS.ProcessEnv);
    expect(createHandoffNotifiers(config).map((notifier) => notifier.channel)).toEqual(["slack", "email"]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("teams"));
  });

  it("returns no channels when the setting is empty", () => {
    expect(createHandoffNotifiers(loadConfig({} as unknown as NodeJS.ProcessEnv))).toEqual([]);
  });
});
