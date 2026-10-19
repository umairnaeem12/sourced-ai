// Spec 002, demo chat (AC7, AC8, AC9). The API is routed to fixtures; npm run smoke covers the real stack.
import { expect, test, type Page } from "@playwright/test";

const answered = {
  success: true,
  message: "Question answered",
  data: {
    answer: {
      is_answered: true,
      text: "Yes. You can return it within 30 days of delivery as long as it isn't damaged. Since it's been used, a 10% restocking fee comes off the refund.",
      citations: [
        {
          number: 1,
          document_slug: "returns-and-refunds",
          document_title: "Returns and refunds",
          section_number: 2,
          heading: "Used and opened items",
          content: "Used items are accepted if undamaged, minus a 10% restocking fee.",
        },
      ],
    },
  },
};

const notAnswered = {
  success: true,
  message: "No answer found in the docs",
  data: {
    answer: {
      is_answered: false,
      text: "I couldn't find that in Pinebrook Supply's help docs, so I won't guess.",
      citations: [],
    },
  },
};

const busy = {
  success: false,
  message: "The demo is busy right now. Try again in a minute.",
  code: "AI_RATE_LIMITED",
};

async function answerWith(page: Page, status: number, body: unknown) {
  await page.route("**/api/questions", (route) => route.fulfill({ status, json: body }));
}

test("answers a suggested question with a source the visitor can open", async ({ page }) => {
  await answerWith(page, 200, answered);
  await page.goto("/demo");
  await page.getByRole("button", { name: "Can I return a kettle I’ve already used?" }).click();

  await expect(page.getByText(/10% restocking fee comes off the refund/)).toBeVisible();
  const source = page.getByRole("button", { name: "Source 1: Returns and refunds" });
  await source.click();
  await expect(page.getByRole("region", { name: "Source 1: Returns and refunds" })).toContainText(
    "Used items are accepted if undamaged",
  );
});

test("a question the docs don't cover gets an honest reply and no sources", async ({ page }) => {
  await answerWith(page, 200, notAnswered);
  await page.goto("/demo");
  await page.getByLabel("Your question").fill("Do you price match?");
  await page.getByLabel("Your question").press("Enter");

  await expect(page.getByText("so I won't guess")).toBeVisible();
  await expect(page.getByText("Not covered by the docs")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Source/ })).toHaveCount(0);
});

test("a busy AI shows a retry message and the visitor can ask again", async ({ page }) => {
  await answerWith(page, 429, busy);
  await page.goto("/demo");
  await page.getByRole("button", { name: "Do you price match?" }).click();
  await expect(page.getByRole("log", { name: "Conversation" }).getByRole("alert")).toContainText("The demo is busy right now");

  await page.unroute("**/api/questions");
  await answerWith(page, 200, answered);
  await page.getByLabel("Your question").fill("Can I return a used kettle?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("button", { name: "Source 1: Returns and refunds" })).toBeVisible();
});

test("demo page has no horizontal scroll at phone width", async ({ page }) => {
  await answerWith(page, 200, answered);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Can I return a kettle I’ve already used?" }).click();
  await expect(page.getByRole("button", { name: "Source 1: Returns and refunds" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
