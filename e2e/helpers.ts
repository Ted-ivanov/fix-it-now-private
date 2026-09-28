import type { Page } from "@playwright/test";
import sharp from "sharp";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@fixitnow.bg";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "FixItNow-local-2026";

/** A colourful JPEG so uploads have something real to process. */
export async function jpeg(color: string, width = 2400, height = 1600) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

/** Picks the first bookable day and a free time; returns the chosen time label. */
export async function pickFirstSlot(page: Page, slotIndex = 0) {
  await page.locator("button[data-day]:not([disabled])").first().click();
  const slots = page.getByRole("radio");
  await slots.first().waitFor();
  const count = await slots.count();
  const slot = slots.nth(Math.min(slotIndex, count - 1));
  const label = (await slot.textContent())!.trim();
  await slot.click();
  return label;
}

export async function fillDetails(
  page: Page,
  labels: { name: string; phone: string; email: string; address: string; description: string },
) {
  await page.getByLabel(labels.name).fill("Тест Тестов");
  await page.getByLabel(labels.phone, { exact: true }).fill("0888 123 456");
  await page.getByLabel(labels.email, { exact: true }).fill("e2e@example.com");
  await page.getByLabel(labels.address).fill("ул. Тестова 1, София");
  await page.getByLabel(labels.description).fill("Автоматичен тест: не работи контакт.");
  await page.getByRole("checkbox").click();
}

export const bgLabels = {
  name: "Име и фамилия",
  phone: "Телефон",
  email: "Имейл",
  address: "Адрес",
  description: "Опишете проблема",
};

export const enLabels = {
  name: "Full name",
  phone: "Phone",
  email: "Email",
  address: "Address",
  description: "Describe the problem",
};

export async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Имейл").fill(ADMIN_EMAIL);
  await page.getByLabel("Парола").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Вход" }).click();
  await page.getByRole("heading", { name: "Табло" }).waitFor();
}
