// @vitest-environment node
// Spec 005 B15 and AC10: raw setting errors become "not connected".
import { describe, expect, it } from "vitest";
import { notificationProblem } from "./notification-status";

describe("notificationProblem", () => {
  it.each([
    ["SLACK_WEBHOOK_URL is not set", "not_configured"],
    ["Slack unavailable: SLACK_WEBHOOK_URL is not set", "not_configured"],
    ["HANDOFF_WEBHOOK_URL must use https (http is allowed for localhost only)", "not_configured"],
    ["HTTP 404 no_service", "delivery_failed"],
    ["The operation was aborted due to timeout", "delivery_failed"],
  ] as const)("reads %j as %s", (error, problem) => {
    expect(notificationProblem({ channel: "slack", status: "failed", error })).toBe(problem);
  });

  it("has no problem when the alert went out", () => {
    expect(notificationProblem({ channel: "email", status: "sent", error: null })).toBeNull();
    expect(notificationProblem({ channel: "email", status: "logged", error: null })).toBeNull();
  });
});
