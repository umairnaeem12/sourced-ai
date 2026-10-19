// Spec 003, AC6 (and the amendment): talking to a person from the demo chat. The API is routed to fixtures.
import { expect, test, type Page } from "@playwright/test";

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

async function routeApi(page: Page, handoffStatus: number, handoffBody: unknown) {
  await page.route("**/api/questions", (route) => route.fulfill({ json: notAnswered }));
  await page.route("**/api/handoffs", (route) => route.fulfill({ status: handoffStatus, json: handoffBody }));
}

test("a customer hands an unanswered question to the team with an email", async ({ page }) => {
  await routeApi(page, 201, { success: true, message: "Handoff received", data: { handoff: { id: "h1", status: "received" } } });
  await page.goto("/demo");

  const header = page.getByRole("region", { name: "Pinebrook Supply support" });
  await expect(header.getByRole("button", { name: "Talk to a person" }).first()).toBeDisabled();

  await page.getByRole("button", { name: "Do you price match?" }).click();
  const log = page.getByRole("log", { name: "Conversation" });
  await log.getByRole("button", { name: "Talk to a person" }).click();

  const form = page.getByRole("form", { name: "Talk to a person" });
  await form.getByLabel("Your email (optional)").fill("sam@example.com");
  await form.getByRole("button", { name: "Send to the team" }).click();

  await expect(log.getByText("Sent to the Pinebrook Supply team")).toBeVisible();
  await expect(log.getByText("They’ll reply to you at sam@example.com.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Team notified" })).toBeDisabled();
  await expect(log.getByRole("button", { name: "Talk to a person" })).toHaveCount(0);
});

test("a handoff that can't be saved keeps the form open so the customer can retry", async ({ page }) => {
  await routeApi(page, 500, { success: false, message: "Something went wrong", code: "INTERNAL_ERROR" });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Do you price match?" }).click();
  await page.getByRole("log", { name: "Conversation" }).getByRole("button", { name: "Talk to a person" }).click();

  const form = page.getByRole("form", { name: "Talk to a person" });
  await form.getByRole("button", { name: "Send to the team" }).click();
  await expect(form.getByRole("alert")).toContainText("Something went wrong on our side");
  await expect(form.getByRole("button", { name: "Send to the team" })).toBeEnabled();
});
