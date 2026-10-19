// @vitest-environment node
// Spec 003, admin sessions.
import { describe, expect, it } from "vitest";
import { createSessionToken, isUsablePassword, passwordMatches, SESSION_HOURS, verifySessionToken } from "./admin-session";

const password = "correct horse battery";

describe("admin session tokens", () => {
  it("verifies a fresh token", async () => {
    const { token, maxAge } = await createSessionToken(password);
    expect(maxAge).toBe(SESSION_HOURS * 3600);
    expect(await verifySessionToken(token, password)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const issuedAt = Date.now() - (SESSION_HOURS + 1) * 3600 * 1000;
    const { token } = await createSessionToken(password, issuedAt);
    expect(await verifySessionToken(token, password)).toBe(false);
  });

  it("rejects a token with an edited expiry", async () => {
    const { token } = await createSessionToken(password);
    const [version, , signature] = token.split(".");
    expect(await verifySessionToken(`${version}.${Date.now() + 10 ** 12}.${signature}`, password)).toBe(false);
  });

  it("signs everyone out when the password changes", async () => {
    const { token } = await createSessionToken(password);
    expect(await verifySessionToken(token, "a different long password")).toBe(false);
  });

  it("rejects everything when the admin password is unset or too short", async () => {
    const { token } = await createSessionToken("short");
    expect(await verifySessionToken(token, "short")).toBe(false);
    expect(await verifySessionToken(token, undefined)).toBe(false);
    expect(isUsablePassword("five5")).toBe(false);
    expect(isUsablePassword("six666")).toBe(true);
  });
});

describe("passwordMatches", () => {
  it("matches only the exact password", async () => {
    expect(await passwordMatches(password, password)).toBe(true);
    expect(await passwordMatches(`${password} `, password)).toBe(false);
    expect(await passwordMatches("", password)).toBe(false);
  });
});
