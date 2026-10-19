// @vitest-environment node
// Spec 005 B28 and AC18.
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../http/api-error";
import { NotificationError, type HandoffNotifier } from "../notifications/handoff-notifier";
import { NotificationTestService } from "./notification-test-service";
import type { ChannelSettings } from "./settings-service";

const caller = { visitor_id: "admin", origin: "visitor" as const };

function setup(state: ChannelSettings["state"], send: HandoffNotifier["send"] = async () => "sent") {
  const notifier = { channel: "slack" as const, send: vi.fn(send) };
  const consume = vi.fn(async () => {});
  const service = new NotificationTestService(
    { channel: () => ({ channel: "slack", state, missing: state === "missing_settings" ? ["SLACK_WEBHOOK_URL"] : [], target: null, signed: null }) },
    () => notifier,
    () => "Pinebrook Supply",
    { consume },
  );
  return { service, notifier, consume };
}

describe("NotificationTestService.send", () => {
  it("sends a sample handoff marked as a test", async () => {
    const { service, notifier, consume } = setup("connected");
    await expect(service.send("slack", caller)).resolves.toBe("sent");
    expect(consume).toHaveBeenCalledWith("admin_test_alert", "admin");
    expect(notifier.send).toHaveBeenCalledWith(expect.objectContaining({ is_test: true, store_name: "Pinebrook Supply" }));
  });

  it("refuses a channel that isn't connected, before using up the rate limit", async () => {
    const { service, consume } = setup("missing_settings");
    await expect(service.send("slack", caller)).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCode.NOTIFICATION_NOT_CONFIGURED,
      context: { missing: ["SLACK_WEBHOOK_URL"] },
    });
    expect(consume).not.toHaveBeenCalled();
  });

  it("reports a failed delivery with its detail", async () => {
    const { service } = setup("connected", async () => {
      throw new NotificationError("slack", "HTTP 404 no_service");
    });
    await expect(service.send("slack", caller)).rejects.toMatchObject({
      statusCode: 502,
      code: ErrorCode.NOTIFICATION_FAILED,
      context: { detail: "HTTP 404 no_service" },
    });
  });
});
