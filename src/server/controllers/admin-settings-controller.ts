import { z } from "zod";
import { callerOf } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { notificationTestService, type NotificationTestService } from "../services/notification-test-service";
import { settingsService, type SettingsService } from "../services/settings-service";

const testAlertSchema = z.object(
  { channel: z.enum(["slack", "email", "webhook"], { error: "channel must be slack, email or webhook" }) },
  { error: "Send a JSON body with the channel" },
);

export class AdminSettingsController {
  constructor(
    private readonly settings: Pick<SettingsService, "view">,
    private readonly tests: Pick<NotificationTestService, "send">,
  ) {}

  show = async (): Promise<Response> => {
    try {
      return responseHandler.ok("Settings retrieved", { settings: this.settings.view() });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  sendTest = async (request: Request): Promise<Response> => {
    try {
      const { channel } = testAlertSchema.parse(await request.json().catch(() => null));
      const result = await this.tests.send(channel, callerOf(request));
      return responseHandler.ok(result === "sent" ? "Test alert sent" : "Test alert written to the server log", { result });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };
}

export const adminSettingsController = new AdminSettingsController(settingsService, notificationTestService);
