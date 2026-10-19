// Spec 001, landing page (and the 2026-10-17 amendment).
import { expect, test, type Page } from "@playwright/test";

async function scrollThroughPage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.mouse.wheel(0, 600);
  }
  await expect(page.getByRole("heading", { name: /answers they can check/i })).toBeInViewport();
}

test("header link jumps to the How it works section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "How it works" }).click();
  await expect(page.getByRole("heading", { name: /cited answer in four steps/i })).toBeInViewport();
});

test("chat replay reaches a cited answer", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Source: Returns and refunds, section 2", { exact: true }).filter({ visible: true }),
  ).toBeVisible({ timeout: 15_000 });
});

test("reduced motion shows the finished conversation at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const visible = (text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
  await expect(visible("Source: Returns and refunds, section 2")).toBeVisible({ timeout: 1_000 });
  await expect(visible("Sent to #support-handoff and added to the gap report")).toBeVisible({
    timeout: 1_000,
  });
});

test("FAQ answers open from their question", async ({ page }) => {
  await page.goto("/#faq");
  const question = page.getByRole("button", { name: "Which AI does it use?" });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/Gemini by default/)).toBeVisible();
});

test("page has no horizontal scroll at phone width with animations running", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await scrollThroughPage(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("unknown URL shows not found with a working link home", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sourced AI");
});
