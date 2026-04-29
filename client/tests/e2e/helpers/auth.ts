import type { Page } from '@playwright/test';

export const ADMIN = { email: 'admin@civic.gov', password: 'admin123' } as const;

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}
