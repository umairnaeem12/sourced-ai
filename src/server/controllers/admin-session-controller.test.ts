// @vitest-environment node
// Spec 003 AC8 and spec 004 AC5: admin sign-in, with the lockout.
import { describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, verifySessionToken } from "../auth/admin-session";
import { ApiError, ErrorCode } from "../http/api-error";
import { AdminSessionService } from "../services/admin-session-service";
import { AdminSessionController } from "./admin-session-controller";

const adminPassword = "a long admin password";
const caller = { visitor_id: "visitor-a", origin: "visitor" as const };

function service(password: string | undefined = adminPassword, blocked = false) {
  const rateLimits = {
    assertNotBlocked: vi.fn(async () => {
      if (blocked) throw new ApiError(429, "Too many attempts. Try again in 15 minutes.", ErrorCode.RATE_LIMITED, true, { retry_after_seconds: 600 });
    }),
    record: vi.fn(async () => {}),
  };
  return { rateLimits, sessions: new AdminSessionService(rateLimits, () => password, async () => {}) };
}

const signIn = (controller: AdminSessionController, password: unknown) =>
  controller.create(
    new Request("http://localhost/api/admin/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ password }),
    }),
  );

describe("AdminSessionService.signIn", () => {
  it("returns a valid session token for the right password", async () => {
    const { sessions, rateLimits } = service();
    const { token } = await sessions.signIn(adminPassword, caller);
    expect(await verifySessionToken(token, adminPassword)).toBe(true);
    expect(rateLimits.record).not.toHaveBeenCalled();
  });

  it("records a failure and refuses a wrong password", async () => {
    const { sessions, rateLimits } = service();
    await expect(sessions.signIn("guess", caller)).rejects.toMatchObject({ statusCode: 401, code: ErrorCode.INVALID_CREDENTIALS });
    expect(rateLimits.record).toHaveBeenCalledWith("admin_sign_in_failure", "visitor-a");
  });

  it("refuses even the right password while the visitor is locked out", async () => {
    const { sessions } = service(adminPassword, true);
    await expect(sessions.signIn(adminPassword, caller)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("refuses sign-in when ADMIN_PASSWORD is too short", async () => {
    const { sessions } = service("short");
    await expect(sessions.signIn("short", caller)).rejects.toMatchObject({ statusCode: 503, code: ErrorCode.ADMIN_DISABLED });
  });
});

describe("AdminSessionController", () => {
  it("sets an HTTP-only session cookie on success", async () => {
    const response = await signIn(new AdminSessionController(service().sessions), adminPassword);
    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    const token = cookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1];
    expect(await verifySessionToken(token, adminPassword)).toBe(true);
  });

  it("returns 401 and no cookie for a wrong password", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await signIn(new AdminSessionController(service().sessions), "guess");
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 429 with Retry-After while locked out", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await signIn(new AdminSessionController(service(adminPassword, true).sessions), adminPassword);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
    expect(await response.json()).toMatchObject({ code: ErrorCode.RATE_LIMITED, context: { retry_after_seconds: 600 } });
  });

  it("clears the cookie on sign-out", async () => {
    const response = await new AdminSessionController(service().sessions).remove();
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain(`${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  });
});
