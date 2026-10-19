// @vitest-environment node
// Spec 002, AC6 and the response envelope.
import { describe, expect, it, vi } from "vitest";
import { ApiError, ErrorCode } from "../http/api-error";
import { QuestionController } from "./question-controller";

const post = (body: unknown) =>
  new Request("http://localhost/api/questions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const answer = { is_answered: true, text: "Yes.", citations: [] };

describe("QuestionController.create", () => {
  it("wraps the answer in the envelope", async () => {
    const service = { answer: vi.fn(async () => answer) };
    const response = await new QuestionController(service).create(post({ question: "  Can I return it?  " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "Question answered", data: { answer } });
    expect(service.answer).toHaveBeenCalledWith("Can I return it?", null, { visitor_id: expect.any(String), origin: "visitor" });
  });

  it.each([
    ["an empty question", { question: "   " }],
    ["a 501-character question", { question: "a".repeat(501) }],
    ["a missing question", {}],
  ])("rejects %s with a question field error", async (_label, body) => {
    const service = { answer: vi.fn() };
    const response = await new QuestionController(service).create(post(body));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ success: false, code: ErrorCode.VALIDATION_ERROR });
    expect(json.errors[0].field).toBe("question");
    expect(service.answer).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const response = await new QuestionController({ answer: vi.fn() }).create(post("not json"));
    expect(response.status).toBe(400);
  });

  it("passes an ApiError's status and code through", async () => {
    const service = {
      answer: vi.fn(async () => {
        throw new ApiError(429, "The demo is busy right now. Try again in a minute.", ErrorCode.AI_RATE_LIMITED);
      }),
    };
    const response = await new QuestionController(service).create(post({ question: "q" }));

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ success: false, code: ErrorCode.AI_RATE_LIMITED });
  });

  it("hides unexpected errors behind INTERNAL_ERROR", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const service = {
      answer: vi.fn(async () => {
        throw new Error("connection refused at 10.0.0.1");
      }),
    };
    const response = await new QuestionController(service).create(post({ question: "q" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ success: false, message: "Something went wrong", code: ErrorCode.INTERNAL_ERROR });
  });

  it("passes the conversation id through and rejects one that isn't a UUID", async () => {
    const service = { answer: vi.fn(async () => answer) };
    const controller = new QuestionController(service);
    const conversationId = "6f1d4c2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";

    await controller.create(post({ question: "q", conversation_id: conversationId }));
    expect(service.answer).toHaveBeenCalledWith("q", conversationId, { visitor_id: expect.any(String), origin: "visitor" });

    const response = await controller.create(post({ question: "q", conversation_id: "abc" }));
    expect(response.status).toBe(400);
  });
});
