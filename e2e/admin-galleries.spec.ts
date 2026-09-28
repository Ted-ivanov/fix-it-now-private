import { expect, test } from "@playwright/test";
import { jpeg, login } from "./helpers";

test("admin uploads to a new gallery, then adds to it; both show on the public page", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "admin upload is covered once, on desktop");
  const title = `E2E галерия ${Date.now()}`;

  await login(page);
  await page.goto("/admin/galleries/upload");
  await page.getByText("Създай нова галерия").click();
  await page.getByLabel("Заглавие (български) *").fill(title);
  await page.getByLabel("Услуга").selectOption({ label: "Довършителни работи" });
  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.jpg", mimeType: "image/jpeg", buffer: await jpeg("#c2410c") },
    { name: "two.jpg", mimeType: "image/jpeg", buffer: await jpeg("#1e40af", 1600, 2400) },
  ]);
  await page.getByRole("button", { name: "Качи 2 снимки" }).click();
  await expect(page.getByText("2 от 2 готови.")).toBeVisible({ timeout: 60_000 });

  await page.goto("/admin/galleries/upload");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(title) }).click();
  await page.locator('input[type="file"]').setInputFiles([
    { name: "three.jpg", mimeType: "image/jpeg", buffer: await jpeg("#15803d") },
  ]);
  await page.getByRole("button", { name: "Качи 1 снимка" }).click();
  await expect(page.getByText("1 от 1 готови.")).toBeVisible({ timeout: 60_000 });

  await page.goto("/zavarsheni-proekti");
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toContainText("3 снимки");
  await card.click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("list").getByRole("button")).toHaveCount(3);
});

test("admin pages need a login", async ({ page }) => {
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login/);
});
