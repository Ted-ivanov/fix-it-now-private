import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: "Добре дошли във Fix It Now!" },
  { path: "/v2", heading: "Какво трябва да се поправи?" },
  { path: "/v3", heading: "Малки ремонти у дома – бързо, чисто и с гаранция" },
  { path: "/v4", heading: "С какво можем да помогнем днес?" },
  { path: "/en/v2", heading: "What needs fixing?" },
];

for (const { path, heading } of pages) {
  test(`design ${path} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Дизайн|Design/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("design switcher moves between designs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Дизайн" }).getByRole("link", { name: "3" }).click();
  await expect(page).toHaveURL(/\/v3$/);
});

test("V2 search suggests a problem and opens the wizard with it", async ({ page }) => {
  await page.goto("/v2");
  await page.getByRole("searchbox").or(page.getByLabel("Какво трябва да се поправи?")).fill("тече");
  await page.getByRole("button", { name: /Тече кран или сифон/ }).click();
  await expect(page).toHaveURL(/\/v2\/book\?category=vik/);
  await expect(page.getByText("Стъпка 2 от 4")).toBeVisible();
});

test("V4 chat booking asks one question at a time", async ({ page }) => {
  await page.goto("/v4/book");
  await page.getByRole("button", { name: /ВиК/ }).click();
  await expect(page.getByText("Какво посещение ви трябва?")).toBeVisible();
  await page.getByRole("button", { name: /Оглед и оферта/ }).click();
  await expect(page.getByText("Кой ден ви е удобен?")).toBeVisible();
});
