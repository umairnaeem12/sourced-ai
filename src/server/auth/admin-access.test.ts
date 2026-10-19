// @vitest-environment node
// Spec 005 amendment, AC22 and AC23.
import { describe, expect, it } from "vitest";
import { isAdminPublic } from "./admin-access";

describe("isAdminPublic", () => {
  it.each([
    ["true", true],
    ["TRUE", true],
    ["1", true],
    ["false", false],
    ["", false],
    [undefined, false],
    ["yes please", false],
  ])("reads ADMIN_PUBLIC=%j as %s", (value, expected) => {
    expect(isAdminPublic({ ADMIN_PUBLIC: value })).toBe(expected);
  });
});
