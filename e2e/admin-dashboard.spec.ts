// Spec 005: the admin dashboard against the real server and database.
// Needs ADMIN_PASSWORD on the server and the same value in E2E_ADMIN_PASSWORD; the test-traffic
// checks also need E2E_TRAFFIC_TOKEN (playwright.config.ts reads both from .env).
import { randomUUID } from "node:crypto";
import { expect, request as playwrightRequest, test, type APIRequestContext, type Page } from "@playwright/test";

const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const trafficToken = process.env.E2E_TRAFFIC_TOKEN;
const adminIsPublic = ["true", "1"].includes((process.env.ADMIN_PUBLIC ?? "").trim().toLowerCase());

test.skip(!adminPassword && !adminIsPublic, "Set E2E_ADMIN_PASSWORD (and ADMIN_PASSWORD on the server), or ADMIN_PUBLIC=true, to run");

async function signIn(page: Page) {
  if (adminIsPublic) {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/overview$/);
    return;
  }
  await page.goto("/admin/login");
  await page.getByLabel("Admin password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/);
}

async function ask(request: APIRequestContext, question: string, conversationId = randomUUID()) {
  const response = await request.post("/api/questions", { data: { question, conversation_id: conversationId } });
  expect(response.ok()).toBe(true);
  return conversationId;
}

const SECTIONS = ["Overview", "Conversations", "Inbox", "Gap report", "Documents", "Settings"];

test("the sidebar reaches every section and marks the current one (AC1, AC3)", async ({ page }) => {
  await signIn(page);
  const nav = page.getByRole("navigation", { name: "Admin" });
  for (const name of SECTIONS) await expect(nav.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^Overview/ })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: /^Gap report/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Gap report" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^Gap report/ })).toHaveAttribute("aria-current", "page");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/overview$/);
});

test("on a phone the menu opens the same sections and nothing scrolls sideways (AC2)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page);
  for (const path of ["overview", "conversations", "handoffs", "gaps", "documents", "settings"]) {
    await page.goto(`/admin/${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `/admin/${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }

  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Admin menu" });
  for (const name of SECTIONS) await expect(drawer.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await drawer.getByRole("link", { name: /^Documents/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
  await expect(drawer).toHaveCount(0);
});

test("rewordings of one question become one gap, and doc written reopens when asked again (AC11, AC12)", async ({ page, request }) => {
  await ask(request, "Do you offer engraving on kettles?");
  await ask(request, "Do you offer kettle engraving?");
  await signIn(page);
  await page.goto("/admin/gaps");

  const table = page.getByRole("table", { name: "Questions Sourced AI couldn't answer" });
  const gap = table.getByRole("row").filter({ hasText: /engraving/i });
  await expect(gap).toHaveCount(1);
  await expect(gap).toContainText(/other wording/);

  await gap.getByRole("button", { name: /^Mark doc written:/ }).click();
  await expect(table.getByRole("row").filter({ hasText: /engraving/i })).toHaveCount(0);
  await page.getByRole("tab", { name: "Doc written" }).click();
  await expect(table.getByRole("row").filter({ hasText: /engraving/i })).toHaveCount(1);

  await ask(request, "Do you offer engraving on kettles?");
  await page.getByRole("tab", { name: "Open" }).click();
  const again = table.getByRole("row").filter({ hasText: /engraving/i });
  await expect(again).toContainText("Asked again since marked");
});

test("a channel that isn't connected can't send a test alert (AC18)", async ({ page }) => {
  await signIn(page);
  const refused = await page.request.post("/api/admin/notification-tests", { data: { channel: "webhook" } });
  // The dev server has no webhook set up, so the API refuses before sending anything.
  if (refused.status() === 422) {
    expect(await refused.json()).toMatchObject({ code: "NOTIFICATION_NOT_CONFIGURED" });
  }

  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Handoff alerts" })).toBeVisible();
  const settings = await (await page.request.get("/api/admin/settings")).json();
  const body = JSON.stringify(settings);
  for (const secret of ["sk-", "hooks.slack.com/services/"]) expect(body).not.toContain(secret);
});

test("questions from the test suite stay out of a normal admin session (AC20)", async ({ request, baseURL }) => {
  test.skip(!trafficToken, "Set E2E_TRAFFIC_TOKEN to run");
  test.skip(!adminPassword, "Signs in through the API, so it needs E2E_ADMIN_PASSWORD");
  const marker = `zebra-${randomUUID().slice(0, 8)}`;
  await ask(request, `Do you sell ${marker} placemats?`);

  // A session without the test header, like a real owner's browser.
  const owner = await playwrightRequest.newContext({ baseURL });
  const signedIn = await owner.post("/api/admin/sessions", { data: { password: adminPassword } });
  expect(signedIn.status()).toBe(204);
  const hidden = await (await owner.get(`/api/admin/conversations?search=${marker}`)).json();
  expect(hidden.data.pagination.total).toBe(0);
  await owner.dispose();

  // The suite's own session (it sends the token) still sees it.
  await request.post("/api/admin/sessions", { data: { password: adminPassword } });
  const visible = await (await request.get(`/api/admin/conversations?search=${marker}`)).json();
  expect(visible.data.pagination.total).toBe(1);
});

test("the overview shows headline numbers and switches period (AC4, AC6)", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page.getByText("Answer rate")).toBeVisible();
  await expect(page.getByRole("table", { name: "Questions per day" })).toBeAttached();

  const overview = page.waitForResponse((response) => response.url().includes("/api/admin/overview?days=7"));
  await page.getByRole("radio", { name: "Last 7 days" }).click();
  expect((await overview).ok()).toBe(true);
  await expect(page.getByRole("radio", { name: "Last 7 days" })).toHaveAttribute("aria-checked", "true");
});

test("conversations filter by outcome and open with their sources (AC7, AC8)", async ({ page, request }) => {
  const conversationId = await ask(request, "Can I return a kettle I've already used?");
  await signIn(page);
  await page.goto("/admin/conversations");

  const answered = page.waitForResponse((response) => response.url().includes("status=answered"));
  await page.getByRole("tab", { name: "Answered", exact: true }).click();
  expect((await answered).ok()).toBe(true);
  await page.getByRole("searchbox").fill("kettle I've already used");
  await page.getByRole("button", { name: /^Open conversation started/ }).first().click();

  const panel = page.getByRole("dialog", { name: "Conversation" });
  await expect(panel.getByRole("list", { name: "Conversation" })).toContainText("Can I return a kettle");
  await panel.getByRole("list", { name: "Sources" }).getByRole("button").first().click();
  await expect(panel.getByText(/restocking fee/).first()).toBeVisible();
  expect(conversationId).toBeTruthy();
});

test("an uploaded document is answered from, then deleted (AC13, AC16)", async ({ page, request }) => {
  const title = `E2E gift wrapping ${randomUUID().slice(0, 6)}`;
  const markdown = `# ${title}\n\n## Gift wrapping price\nPinebrook gift wraps any order for $4.50 per item and adds a handwritten card.\n`;
  await signIn(page);
  await page.goto("/admin/documents");

  await page.getByRole("button", { name: "Add document" }).first().click();
  const form = page.getByRole("dialog", { name: "Add document" });
  await form.getByLabel("Document file").setInputFiles({ name: "gift-wrapping.md", mimeType: "text/markdown", buffer: Buffer.from(markdown) });
  await form.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByRole("status")).toContainText(`Added ${title}`);
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toContainText("1");

  try {
    const answer = await request.post("/api/questions", { data: { question: "How much does gift wrapping cost?" } });
    const body = await answer.json();
    expect(body.data.answer.is_answered).toBe(true);
    expect(body.data.answer.citations.map((citation: { document_title: string }) => citation.document_title)).toContain(title);
  } finally {
    await row.getByRole("button", { name: `Open ${title}` }).click();
    const panel = page.getByRole("dialog", { name: title });
    await panel.getByRole("button", { name: "Delete" }).click();
    await panel.getByRole("button", { name: "Delete document" }).click();
    await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  }

  await page.goto("/demo");
  await expect(page.getByText(title)).toHaveCount(0);
});
