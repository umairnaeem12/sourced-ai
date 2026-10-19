// Spec 003, AC7 and AC8 (spec 005 shell and side panel): the admin area. Runs against the real server and database.
// The sign-in test needs the server started with ADMIN_PASSWORD and the same value
// in E2E_ADMIN_PASSWORD; without it, only the locked-out checks run.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const adminPassword = process.env.E2E_ADMIN_PASSWORD;
// Spec 005 amendment: a public demo dashboard has no sign-in to check.
const adminIsPublic = ["true", "1"].includes((process.env.ADMIN_PUBLIC ?? "").trim().toLowerCase());

test("admin pages redirect to sign-in and the API refuses without a session", async ({ page, request }) => {
  test.skip(adminIsPublic, "ADMIN_PUBLIC is on, so the admin is open by design");
  await page.goto("/admin/gaps");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();

  const response = await request.get("/api/admin/gaps");
  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
});

test("a wrong password is refused", async ({ page }) => {
  test.skip(adminIsPublic, "ADMIN_PUBLIC is on, so sign-in redirects to the dashboard");
  // A random visitor address, so repeated runs don't lock this machine out of /admin.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  await page.goto("/admin/login");
  await page.getByLabel("Admin password").fill("definitely not it");
  await page.getByRole("button", { name: "Sign in" }).click();

  // The server may or may not have ADMIN_PASSWORD set; either way the sign-in is refused.
  await expect(page.getByRole("form", { name: "Admin sign in" }).getByRole("alert")).toContainText(
    adminPassword ? /Wrong password/ : /Wrong password|isn't set up/,
  );
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the right password opens the gap report, handoffs and sign-out", async ({ page }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD (and ADMIN_PASSWORD on the server) to run");
  test.skip(adminIsPublic, "ADMIN_PUBLIC is on, so there is no sign-in or sign-out");

  await page.goto("/admin/login");
  await page.getByLabel("Admin password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin\/overview$/);
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: /^Gap report/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Gap report" })).toBeVisible();
  await expect(page.getByText("Questions asked")).toBeVisible();
  await expect(page.getByRole("table", { name: "Questions Sourced AI couldn't answer" })).toBeVisible();

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: /^Inbox/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Conversations handed to the team" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/gaps");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a handoff lands in the inbox, opens, and moves to Handled", async ({ page, request }) => {
  test.skip(!adminPassword && !adminIsPublic, "Set E2E_ADMIN_PASSWORD (and ADMIN_PASSWORD on the server) to run");

  // An off-topic question is refused before any AI call, so this costs one embedding.
  const conversationId = randomUUID();
  const email = `e2e-${conversationId.slice(0, 8)}@example.com`;
  const asked = await request.post("/api/questions", {
    data: { question: "What's the weather in Lahore today?", conversation_id: conversationId },
  });
  expect(asked.ok()).toBe(true);
  const handedOff = await request.post("/api/handoffs", { data: { conversation_id: conversationId, email } });
  expect(handedOff.status()).toBe(201);

  if (!adminIsPublic) {
    await page.goto("/admin/login");
    await page.getByLabel("Admin password").fill(adminPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/overview$/);
  }
  await page.goto("/admin/handoffs");

  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: `Open conversation with ${email}` }).click();
  const panel = page.getByRole("dialog", { name: email });
  await expect(panel.getByRole("list", { name: "Conversation" })).toContainText("What's the weather in Lahore today?");
  await expect(panel.getByRole("link", { name: "Reply by email" })).toHaveAttribute("href", new RegExp(`^mailto:${email}`));

  // Spec 005 B14: an internal note stays with the handoff.
  await panel.getByLabel("Add a note").fill("Replied by email from the e2e suite.");
  await panel.getByRole("button", { name: "Add note" }).click();
  await expect(panel.getByRole("list", { name: "Notes" })).toContainText("Replied by email from the e2e suite.");

  await panel.getByRole("button", { name: "Mark handled" }).click();
  await expect(panel.getByRole("button", { name: "Reopen" })).toBeVisible();
  await panel.getByRole("button", { name: "Close panel" }).first().click();
  await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(0);
  await page.getByRole("tab", { name: "Handled" }).click();
  await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(1);
});
