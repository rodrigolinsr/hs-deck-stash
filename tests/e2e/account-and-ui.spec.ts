import { expect, test } from "@playwright/test";

test("login is rebranded, uses local artwork, and has no demo autofill", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByAltText("HSDeckStash").first()).toBeVisible();
  await expect(page.locator('img[src="/tavern.jpeg"]')).toHaveCount(1);
  await expect(page.getByTestId("auth-fill-demo-button")).toHaveCount(0);
  await expect(page.getByText("Demo account")).toHaveCount(0);
});

test("theme toggle and a long deck code keep the interface usable", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.getByTestId("auth-email-input").fill("demo@deckstash.app");
  await page.getByTestId("auth-password-input").fill("tavern123");
  await page.getByTestId("auth-submit-button").click();
  await expect(page.getByTestId("import-deck-button")).toBeVisible();

  await expect(page.locator('[data-testid^="edit-deck-button-"]').first()).toBeVisible();
  await page.locator('[data-testid^="delete-deck-button-"]').first().click();
  await expect(page.getByTestId("delete-deck-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep deck" }).click();

  await page.getByTestId("import-deck-button").click();
  const dialog = page.getByTestId("deck-import-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("deck-code-input").fill("A".repeat(2_000));
  const bounds = await dialog.boundingBox();
  expect(bounds?.width).toBeLessThanOrEqual(600);
  await expect(page.getByTestId("deck-code-input")).toHaveCSS("resize", "vertical");
});

test("an annotated Hearthstone paste proposes its deck name before filling the form", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-email-input").fill("demo@deckstash.app");
  await page.getByTestId("auth-password-input").fill("tavern123");
  await page.getByTestId("auth-submit-button").click();
  await page.getByTestId("import-deck-button").click();

  const exportText = [
    "### Clipboard Test Deck",
    "# Class: Death Knight",
    "# Format: Standard",
    "",
    "AAECAfHhBAyV5ATDgweRqwfSrgeosQfQvwfqyQf2yQeb1Ae/3wey4wf85wcJodQEh/YEgf0GloIHl4IHvJQHupUHmsUH0MUHAAA=",
  ].join("\n");
  await page.getByTestId("deck-code-input").evaluate((element, text) => {
    const clipboard = new DataTransfer();
    clipboard.setData("text", text);
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: clipboard }));
  }, exportText);

  await expect(page.getByTestId("clipboard-deck-confirmation")).toContainText("Clipboard Test Deck");
  await page.getByTestId("clipboard-deck-confirm-button").click();
  await expect(page.getByTestId("deck-name-input")).toHaveValue("Clipboard Test Deck");
});

test("profile name submits and reports its saved state", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-email-input").fill("demo@deckstash.app");
  await page.getByTestId("auth-password-input").fill("tavern123");
  await page.getByTestId("auth-submit-button").click();
  await page.getByTestId("profile-link").click();

  const name = page.locator("#profile-name");
  await name.fill("HSDeckStash Demo");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByTestId("profile-save-status")).toContainText("Saved");
  await expect(page.getByTestId("profile-link")).toContainText("HSDeckStash Demo");

  // Leave the shared local demo account in its normal state for subsequent tests.
  await name.fill("demo");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByTestId("profile-save-status")).toContainText("Saved");
});

test("mobile login keeps its deck-library introduction", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "This is the compact mobile layout only.");
  await page.goto("/login");
  await expect(page.getByTestId("mobile-login-intro")).toBeVisible();
  await expect(page.getByTestId("mobile-login-intro")).toContainText("Never lose a great deck code.");
  await expect(page.getByTestId("mobile-why-use")).toContainText("Why use HSDeckStash?");
});

test("folders can be created and used as a deck filter", async ({ page }) => {
  const folderName = `Folder check ${Date.now()}`;
  await page.goto("/login");
  await page.getByTestId("auth-email-input").fill("demo@deckstash.app");
  await page.getByTestId("auth-password-input").fill("tavern123");
  await page.getByTestId("auth-submit-button").click();

  await page.getByTestId("create-folder-button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("e.g. Legend climb").fill(folderName);
  await dialog.getByRole("button", { name: "Create folder" }).click();
  await expect(page.getByText(folderName, { exact: true })).toBeVisible();
  await page.getByText(folderName, { exact: true }).click();
  await expect(page.getByTestId("decks-empty-state")).toContainText("Nothing matches that filter");
  await expect(page.getByTestId("class-filter-bar")).toContainText("All decks 0");
  await expect(page.getByTestId("class-filter-paladin")).toHaveCount(0);
});

test("deck folder selector displays a folder name, never its internal ID", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-email-input").fill("demo@deckstash.app");
  await page.getByTestId("auth-password-input").fill("tavern123");
  await page.getByTestId("auth-submit-button").click();
  await page.getByTestId("import-deck-button").click();
  await expect(page.getByTestId("deck-folder-select")).toHaveText("Unfiled");
});
