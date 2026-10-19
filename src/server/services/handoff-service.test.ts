// @vitest-environment node
// Spec 003 (amended): saving a handoff, then notifying each channel (AC4, AC5, AC14).
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../http/api-error";
import { NotificationError, type HandoffNotifier } from "../notifications/handoff-notifier";
import type { Handoff, HandoffListRow } from "../repositories/handoff-repository";
import type { LoggedQuestion } from "../repositories/question-repository";
import { HandoffService } from "./handoff-service";

const conversationId = "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";

const question: LoggedQuestion = {
  question: "Do you price match?",
  is_answered: false,
  citations: [],
  answer_text: "I won't guess.",
  created_at: new Date("2026-10-17T10:00:00Z"),
};

const saved: Handoff = {
  id: "handoff-1",
  conversation_id: conversationId,
  email: "sam@example.com",
  created_at: new Date("2026-10-17T10:01:00Z"),
  handled_at: null,
};

const listed: HandoffListRow = { ...saved, question_count: 1, notifications: [] };

function setup({ questions = [question], created = saved as Handoff | null, notifiers = [] as HandoffNotifier[] } = {}) {
  const handoffs = {
    create: vi.fn(async () => created),
    findById: vi.fn(async () => listed),
    recordNotification: vi.fn(async () => {}),
  };
  const service = new HandoffService(
    { findByConversation: vi.fn(async () => questions) },
    handoffs,
    notifiers,
    "Pinebrook Supply",
    { consume: vi.fn(async () => {}) },
  );
  return { service, handoffs };
}

const notifier = (channel: HandoffNotifier["channel"], send: HandoffNotifier["send"]): HandoffNotifier => ({
  channel,
  send: vi.fn(send),
});

describe("HandoffService.create", () => {
  it("saves the handoff and reports it received, with no channel configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { service, handoffs } = setup();
    await expect(service.create(conversationId, "sam@example.com")).resolves.toEqual({ id: "handoff-1", status: "received" });
    expect(handoffs.create).toHaveBeenCalledWith(conversationId, "sam@example.com", "visitor");
  });

  it("refuses a conversation with nothing logged", async () => {
    const { service, handoffs } = setup({ questions: [] });
    await expect(service.create(conversationId, null)).rejects.toMatchObject({
      statusCode: 404,
      code: ErrorCode.CONVERSATION_NOT_FOUND,
    });
    expect(handoffs.create).not.toHaveBeenCalled();
  });

  it("refuses a second handoff for the same conversation", async () => {
    const { service } = setup({ created: null });
    await expect(service.create(conversationId, null)).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCode.HANDOFF_ALREADY_SENT,
    });
  });
});

describe("HandoffService.notify", () => {
  it("sends every channel the conversation and records each result", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const slack = notifier("slack", async () => "sent");
    const email = notifier("email", async () => "logged");
    const { service, handoffs } = setup({ notifiers: [slack, email] });

    await service.notify("handoff-1");

    expect(slack.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: "handoff-1", store_name: "Pinebrook Supply", email: "sam@example.com", conversation: [question] }),
    );
    expect(handoffs.recordNotification).toHaveBeenCalledWith("handoff-1", { channel: "slack", status: "sent", error: null });
    expect(handoffs.recordNotification).toHaveBeenCalledWith("handoff-1", { channel: "email", status: "logged", error: null });
  });

  it("records a failed channel with its reason and still runs the others", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const slack = notifier("slack", async () => {
      throw new NotificationError("slack", "SLACK_WEBHOOK_URL is not set");
    });
    const webhook = notifier("webhook", async () => "sent");
    const { service, handoffs } = setup({ notifiers: [slack, webhook] });

    await expect(service.notify("handoff-1")).resolves.toBeUndefined();
    expect(handoffs.recordNotification).toHaveBeenCalledWith("handoff-1", {
      channel: "slack",
      status: "failed",
      error: "SLACK_WEBHOOK_URL is not set",
    });
    expect(handoffs.recordNotification).toHaveBeenCalledWith("handoff-1", { channel: "webhook", status: "sent", error: null });
  });

  it("never throws, even when recording fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { service, handoffs } = setup({ notifiers: [notifier("webhook", async () => "sent")] });
    handoffs.recordNotification.mockRejectedValue(new Error("database is down"));

    await expect(service.notify("handoff-1")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("could not be recorded"));
  });

  it("does nothing when no channel is configured", async () => {
    const { service, handoffs } = setup();
    await service.notify("handoff-1");
    expect(handoffs.findById).not.toHaveBeenCalled();
  });
});
