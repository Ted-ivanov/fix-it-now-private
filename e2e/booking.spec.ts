import { expect, test } from "@playwright/test";
import { bgLabels, enLabels, fillDetails, login, pickFirstSlot } from "./helpers";

test.describe("public booking", () => {
  test("Bulgarian: home → category → inspection → date/time → details → confirmation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Добре дошли във Fix It Now!" })).toBeVisible();
    await page.getByRole("link", { name: /Електро услуги/ }).click();
    await expect(page).toHaveURL(/\/uslugi\/elektro$/);

    await page.getByRole("button", { name: /Оглед и оферта/ }).click();
    await expect(page).toHaveURL(/zapazi-chas\?type=inspection/);

    // Use a later slot so parallel projects don't compete for the same time.
    const time = await pickFirstSlot(page, test.info().project.name === "mobile" ? 6 : 3);
    await fillDetails(page, bgLabels);
    await page.getByRole("button", { name: "Потвърди резервацията" }).click();

    await expect(page.getByRole("heading", { name: "Благодарим! Часът е запазен." })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/FN-[2-9A-Z]{6}/)).toBeVisible();
    await expect(page.getByText(new RegExp(time))).toBeVisible();

    // The booking shows up in the admin.
    await login(page);
    await page.goto("/admin/bookings?view=list");
    await expect(page.getByText("Тест Тестов").first()).toBeVisible();
  });

  test("repair notice: 'inspection instead' switches, 'I understand' continues", async ({ page }) => {
    await page.goto("/uslugi/vik");
    await page.getByRole("button", { name: /Посещение за ремонт/ }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("може да бъде начислена допълнителна такса");
    await dialog.getByRole("button", { name: "Искам оглед вместо това" }).click();
    await expect(page).toHaveURL(/type=inspection/);

    await page.goto("/uslugi/vik");
    await page.getByRole("button", { name: /Посещение за ремонт/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Разбирам, продължи" }).click();
    await expect(page).toHaveURL(/type=repair&ack=1/);
    await expect(page.getByText("Посещение за ремонт")).toBeVisible();
  });

  test("repair booking page without accepting the notice sends you back", async ({ page }) => {
    await page.goto("/uslugi/vik/zapazi-chas?type=repair");
    await expect(page).toHaveURL(/\/uslugi\/vik$/);
  });

  test("English booking works end to end", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { name: "Welcome to Fix It Now!" })).toBeVisible();
    await page.getByRole("link", { name: /Other Repairs/ }).click();
    await expect(page).toHaveURL(/\/en\/services\/other-repairs$/);
    await page.getByRole("button", { name: /Inspection & Quote/ }).click();
    await pickFirstSlot(page, test.info().project.name === "mobile" ? 8 : 5);
    await fillDetails(page, enLabels);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "Thank you! Your visit is booked." })).toBeVisible({ timeout: 20_000 });
  });

  test("language switch keeps you on the same page with the translated URL", async ({ page }) => {
    await page.goto("/uslugi/elektro");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/services\/electrical$/);
    await expect(page.getByRole("heading", { name: "Electrical" })).toBeVisible();
  });

  test("form validation shows messages in the visitor's language", async ({ page }) => {
    await page.goto("/uslugi/elektro/zapazi-chas?type=inspection");
    await pickFirstSlot(page, 10);
    await page.getByRole("button", { name: "Потвърди резервацията" }).click();
    await expect(page.getByText("Моля, въведете валиден български телефонен номер.")).toBeVisible();
    await expect(page.getByText("Необходимо е съгласие, за да продължим.")).toBeVisible();
  });
});
