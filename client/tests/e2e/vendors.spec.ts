import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Vendor Registry list', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vendors');
    await expect(page.getByText('Vendor Registry')).toBeVisible();
  });

  test('shows page heading and vendor count', async ({ page }) => {
    await expect(page.getByText(/\d+ registered vendors/)).toBeVisible();
  });

  test('renders seeded vendors in the table', async ({ page }) => {
    await expect(page.getByText('ABC Construction Co.')).toBeVisible();
    await expect(page.getByText('TechPro Solutions Ltd.')).toBeVisible();
  });

  test('filter panel is visible with Status and Blacklist Status sections', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Blacklist Status')).toBeVisible();
  });

  test('search by name filters the vendor table', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search vendors..."]');
    await searchInput.fill('ABC');
    await searchInput.press('Enter');

    await expect(page.getByText('ABC Construction Co.')).toBeVisible();
    await expect(page.getByText('TechPro Solutions Ltd.')).not.toBeVisible();
  });

  test('clicking vendor name navigates to vendor detail page', async ({ page }) => {
    await page.getByText('ABC Construction Co.').click();
    await expect(page).toHaveURL(/\/vendors\/.+/);
  });

  test('"Register Vendor" button is visible for admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Register Vendor/i })).toBeVisible();
  });
});

test.describe('Vendor Detail page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vendors');
    await expect(page.getByText('Vendor Registry')).toBeVisible();
    await page.getByText('ABC Construction Co.').click();
    await expect(page).toHaveURL(/\/vendors\/.+/);
  });

  test('shows vendor name as heading', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'ABC Construction Co.' })).toBeVisible();
  });

  test('shows vendor registration number', async ({ page }) => {
    await expect(page.getByText('REG-001')).toBeVisible();
  });

  test('breadcrumb shows Vendors link back to list', async ({ page }) => {
    const vendorsLink = page.getByRole('link', { name: 'Vendors' });
    await vendorsLink.click();
    await expect(page).toHaveURL(/\/vendors$/);
  });

  test('admin can see Edit and Blacklist action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Blacklist|Remove from Blacklist/i }),
    ).toBeVisible();
  });
});
