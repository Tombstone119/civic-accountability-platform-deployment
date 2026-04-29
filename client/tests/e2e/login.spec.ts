import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers/auth';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows VeriTrack branding', async ({ page }) => {
    await expect(page.getByText('VeriTrack')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('admin login redirects to dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('wrong credentials shows inline error', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid credentials. Please try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('"Back to Public Portal" link navigates to /portal', async ({ page }) => {
    await page.getByText('Back to Public Portal').click();
    await expect(page).toHaveURL(/\/portal/);
  });

  test('submit button is disabled while signing in', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);

    const submitted = page.waitForRequest('**/api/auth/login');
    await page.click('button[type="submit"]');
    await submitted;

    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeDisabled();
  });
});
