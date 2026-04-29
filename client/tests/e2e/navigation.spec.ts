import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Authenticated sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard is the landing page after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('navigates to Contracts via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Contracts' }).click();
    await expect(page).toHaveURL(/\/contracts$/);
    await expect(page.getByText('Government Contracts')).toBeVisible();
  });

  test('navigates to Vendors via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Vendors' }).click();
    await expect(page).toHaveURL(/\/vendors$/);
    await expect(page.getByText('Vendor Registry')).toBeVisible();
  });

  test('navigates to Payments via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Payments' }).click();
    await expect(page).toHaveURL(/\/payments$/);
  });

  test('navigates to Audit Reports via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Audit Reports' }).click();
    await expect(page).toHaveURL(/\/audits$/);
  });

  test('navigates to Departments via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Departments' }).click();
    await expect(page).toHaveURL(/\/departments$/);
  });

  test('navigates to Spending via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Spending' }).click();
    await expect(page).toHaveURL(/\/spending$/);
  });

  test('admin sees admin-only links (Users, Comments)', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Comments' })).toBeVisible();
  });

  test('unauthenticated visit to /dashboard redirects to /login', async ({ page: anonPage }) => {
    await anonPage.goto('/dashboard');
    await expect(anonPage).toHaveURL(/\/login/);
  });
});
