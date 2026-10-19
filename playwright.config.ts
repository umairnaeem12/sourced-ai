import { defineConfig, devices } from "@playwright/test";

// Spec 005: reads E2E_ADMIN_PASSWORD and E2E_TRAFFIC_TOKEN from .env when it exists.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env (CI sets the variables itself).
}

// Marks the suite's own questions and handoffs as test traffic, kept out of the admin reports.
const trafficToken = process.env.E2E_TRAFFIC_TOKEN?.trim();

// E2E_BASE_URL points the suite at a deployed site (spec 004); otherwise it runs against local dev.
const deployedUrl = process.env.E2E_BASE_URL;
const baseURL = deployedUrl ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // next dev compiles a page on its first visit, which can take several seconds.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    extraHTTPHeaders: trafficToken ? { "x-sourced-test": trafficToken } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Port 3100 so it never picks up another project's dev server on 3000.
  webServer: deployedUrl
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
      },
});
