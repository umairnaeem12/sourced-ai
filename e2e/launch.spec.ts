// Spec 004, AC6 and AC7: rate-limit messages in the chat, security headers, robots.txt.
import { expect, test } from "@playwright/test";

test("a visitor who asks too quickly is told to wait and can ask again later", async ({ page }) => {
  let limited = true;
  await page.route("**/api/questions", (route) =>
    limited
      ? route.fulfill({
          status: 429,
          headers: { "retry-after": "420" },
          json: {
            success: false,
            message: "You're asking quickly. Try again in a few minutes.",
            code: "RATE_LIMITED",
            context: { retry_after_seconds: 420 },
          },
        })
      : route.fulfill({
          json: {
            success: true,
            message: "No answer found in the docs",
            data: { answer: { is_answered: false, text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.", citations: [] } },
          },
        }),
  );
  await page.goto("/demo");
  await page.getByRole("button", { name: "Do you price match?" }).click();
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByRole("alert")).toContainText("asking quickly");

  limited = false;
  await page.getByLabel("Your question").fill("Do you price match?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(log.getByText("so I won't guess")).toBeVisible();
});

test("pages and the API send the security headers", async ({ request }) => {
  for (const path of ["/", "/demo"]) {
    const response = await request.get(path);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  }
  const api = await request.post("/api/questions", { data: { question: "" } });
  expect(api.status()).toBe(400);
  expect(api.headers()["x-content-type-options"]).toBe("nosniff");
});

test("robots.txt keeps the admin area and the API out of search", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /api");
});
