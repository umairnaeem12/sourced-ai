import { z } from "zod";
import { clearedSessionCookie, sessionCookie } from "../auth/admin-session";
import { callerOf } from "../http/caller-context";
import { responseHandler } from "../http/response-handler";
import { adminSessionService, type AdminSessionService } from "../services/admin-session-service";

const signInSchema = z.object(
  { password: z.string({ error: "Enter the admin password" }).min(1, "Enter the admin password").max(200) },
  { error: "Send a JSON body with a password" },
);

export class AdminSessionController {
  constructor(private readonly service: Pick<AdminSessionService, "signIn">) {}

  create = async (request: Request): Promise<Response> => {
    try {
      const body: unknown = await request.json().catch(() => null);
      const { password } = signInSchema.parse(body);
      const { token, maxAge } = await this.service.signIn(password, callerOf(request));
      return responseHandler.noContent({ "set-cookie": sessionCookie(token, maxAge) });
    } catch (error) {
      return responseHandler.fromError(error);
    }
  };

  remove = async (): Promise<Response> => responseHandler.noContent({ "set-cookie": clearedSessionCookie() });
}

export const adminSessionController = new AdminSessionController(adminSessionService);
