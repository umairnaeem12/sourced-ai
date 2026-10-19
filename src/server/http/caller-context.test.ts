// @vitest-environment node
// Spec 005 AC20: only the right token marks a request as test traffic.
import { describe, expect, it } from "vitest";
import { callerOf, includesTestTraffic, TEST_TRAFFIC_HEADER } from "./caller-context";

const request = (headers: Record<string, string> = {}) => new Request("http://localhost/api/questions", { headers });

describe("callerOf", () => {
  it("treats a request with the matching token as test traffic", () => {
    expect(callerOf(request({ [TEST_TRAFFIC_HEADER]: "s3cret-token" }), "s3cret-token").origin).toBe("test");
  });

  it("treats a wrong token as a normal visitor", () => {
    expect(callerOf(request({ [TEST_TRAFFIC_HEADER]: "guess" }), "s3cret-token").origin).toBe("visitor");
  });

  it("ignores the header entirely when no token is configured", () => {
    expect(callerOf(request({ [TEST_TRAFFIC_HEADER]: "anything" }), undefined).origin).toBe("visitor");
  });

  it("hashes the visitor address", () => {
    const caller = callerOf(request({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), undefined);
    expect(caller.visitor_id).toMatch(/^[0-9a-f]{32}$/);
    expect(caller.visitor_id).not.toContain("203");
  });

  it("reads test traffic from bare headers for server components", () => {
    process.env.E2E_TRAFFIC_TOKEN = "layout-token";
    expect(includesTestTraffic(new Headers({ [TEST_TRAFFIC_HEADER]: "layout-token" }))).toBe(true);
    expect(includesTestTraffic(new Headers())).toBe(false);
    delete process.env.E2E_TRAFFIC_TOKEN;
  });
});
