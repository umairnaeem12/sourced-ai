// Spec 005 amendment, AC22 and AC23: the demo can open the dashboard to everyone.
// The server and this suite read ADMIN_PUBLIC from the same .env.
import { expect, test } from "@playwright/test";

const adminIsPublic = ["true", "1"].includes((process.env.ADMIN_PUBLIC ?? "").trim().toLowerCase());

test.describe("with ADMIN_PUBLIC on", () => {
  test.skip(!adminIsPublic, "Set ADMIN_PUBLIC=true on the server to run");

  test("the demo links to the dashboard, which opens without signing in", async ({ page, request }) => {
    await page.goto("/demo");
    await page.getByRole("navigation", { name: "Demo" }).getByRole("link", { name: "Admin dashboard" }).click();
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("Public demo: anyone with the link can view and change this dashboard.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

    expect((await request.get("/api/admin/overview")).status()).toBe(200);
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin\/overview$/);
  });
});

test.describe("with ADMIN_PUBLIC off", () => {
  test.skip(adminIsPublic, "ADMIN_PUBLIC is on");

  test("the demo has no admin link and the dashboard still needs the password", async ({ page, request }) => {
    await page.goto("/demo");
    await expect(page.getByRole("link", { name: "Admin dashboard" })).toHaveCount(0);
    expect((await request.get("/api/admin/overview")).status()).toBe(401);
  });
});
