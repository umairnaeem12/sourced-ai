// @vitest-environment node
// Spec 003 (amended), handoff endpoint validation, envelope and after-response notify.
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../http/api-error";
import { HandoffController } from "./handoff-controller";

const conversationId = "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";

const post = (body: unknown) =>
  new Request("http://localhost/api/handoffs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

function setup() {
  const service = {
    create: vi.fn(async () => ({ id: "h1", status: "received" as const })),
    notify: vi.fn(async () => {}),
  };
  const scheduled: (() => Promise<void>)[] = [];
  const controller = new HandoffController(service, (task) => scheduled.push(task));
  return { service, controller, scheduled };
}

describe("HandoffController.create", () => {
  it("returns 201 straight away and schedules the notifications", async () => {
    const { service, controller, scheduled } = setup();
    const response = await controller.create(post({ conversation_id: conversationId, email: "  " }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: "Handoff received",
      data: { handoff: { id: "h1", status: "received" } },
    });
    expect(service.create).toHaveBeenCalledWith(conversationId, null, { visitor_id: expect.any(String), origin: "visitor" });
    expect(service.notify).not.toHaveBeenCalled();

    await scheduled[0]();
    expect(service.notify).toHaveBeenCalledWith("h1");
  });

  it.each([
    ["a bad conversation id", { conversation_id: "abc" }, "conversation_id"],
    ["a bad email", { conversation_id: conversationId, email: "not-an-email" }, "email"],
  ])("rejects %s", async (_label, body, field) => {
    const { service, controller, scheduled } = setup();
    const response = await controller.create(post(body));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
    expect(json.errors[0].field).toBe(field);
    expect(service.create).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });
});
