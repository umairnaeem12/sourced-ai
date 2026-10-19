import { createSessionToken, isUsablePassword, MIN_PASSWORD_LENGTH, passwordMatches } from "../auth/admin-session";
import { loadConfig } from "../config";
import { ApiError, ErrorCode } from "../http/api-error";
import type { CallerContext } from "../http/caller-context";
import { rateLimitService, type RateLimitService } from "./rate-limit-service";

const FAILED_SIGN_IN_DELAY_MS = 500;

export class AdminSessionService {
  constructor(
    private readonly rateLimits: Pick<RateLimitService, "assertNotBlocked" | "record">,
    private readonly adminPassword: () => string | undefined,
    private readonly delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async signIn(password: string, caller: CallerContext): Promise<{ token: string; maxAge: number }> {
    const adminPassword = this.adminPassword();
    if (!isUsablePassword(adminPassword)) {
      throw new ApiError(
        503,
        `The admin area isn't set up. Set ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters).`,
        ErrorCode.ADMIN_DISABLED,
      );
    }

    // Spec 004: checked before the password, so a locked-out visitor can't confirm a guess.
    await this.rateLimits.assertNotBlocked("admin_sign_in_failure", caller.visitor_id);

    if (!(await passwordMatches(password, adminPassword))) {
      await this.rateLimits.record("admin_sign_in_failure", caller.visitor_id);
      await this.delay(FAILED_SIGN_IN_DELAY_MS);
      throw new ApiError(401, "Wrong password", ErrorCode.INVALID_CREDENTIALS);
    }
    return createSessionToken(adminPassword);
  }
}

export const adminSessionService = new AdminSessionService(rateLimitService, () => loadConfig().ADMIN_PASSWORD);
