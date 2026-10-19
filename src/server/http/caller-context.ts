import { createHash, timingSafeEqual } from "node:crypto";

export type TrafficOrigin = "visitor" | "test";

export interface CallerContext {
  // SHA-256 of the visitor's IP; the raw address is never stored or logged.
  visitor_id: string;
  // Spec 005: the e2e suite's own questions and handoffs are kept out of admin reports.
  origin: TrafficOrigin;
}

export const TEST_TRAFFIC_HEADER = "x-sourced-test";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isTestTraffic(request: Request, token: string | undefined): boolean {
  const sent = request.headers.get(TEST_TRAFFIC_HEADER);
  if (!token || !sent) return false;
  return timingSafeEqual(digest(sent), digest(token));
}

export function callerOf(request: Request, testToken = process.env.E2E_TRAFFIC_TOKEN?.trim() || undefined): CallerContext {
  // On Vercel the first x-forwarded-for entry is the client; later entries are proxies.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return {
    visitor_id: createHash("sha256").update(ip).digest("hex").slice(0, 32),
    origin: isTestTraffic(request, testToken) ? "test" : "visitor",
  };
}

// Admin reads include test rows only for the test suite's own session.
export function includesTestTraffic(request: Request | Headers): boolean {
  const headers = request instanceof Headers ? request : request.headers;
  return isTestTraffic(new Request("http://admin.local", { headers }), process.env.E2E_TRAFFIC_TOKEN?.trim() || undefined);
}
