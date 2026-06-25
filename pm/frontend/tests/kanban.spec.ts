import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your username").fill("e2e");
  await page.getByPlaceholder("Enter your password").fill("e2e");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('[data-testid^="column-"]');
}

test("loads the kanban board", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.locator('[data-testid^="card-"]').last().getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await login(page);

  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Move me");
  await firstColumn.getByRole("button", { name: /add card/i }).click();

  const card = firstColumn.locator('[data-testid^="card-"]').filter({ hasText: "Move me" }).last();
  await expect(card.getByText("Move me")).toBeVisible();
  const cardTestId = await card.getAttribute("data-testid");
  const targetColumn = page.getByTestId("column-col-review");

  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();

  await expect(targetColumn.locator(`[data-testid="${cardTestId}"]`)).toBeVisible();
});
