import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Contracts list', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/contracts');
    await expect(page.getByText('Government Contracts')).toBeVisible();
  });

  test('shows page heading and contract count', async ({ page }) => {
    await expect(page.getByText(/\d+ contracts found/)).toBeVisible();
  });

  test('renders table column headers', async ({ page }) => {
    await expect(page.getByText('Contract No.')).toBeVisible();
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Vendor')).toBeVisible();
    await expect(page.getByText('Department')).toBeVisible();
    await expect(page.getByText('Value')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
  });

  test('filter panel is visible', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible();
  });

  test('"New Contract" button is visible for admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Contract/i })).toBeVisible();
  });

  test('clicking contract number navigates to contract detail', async ({ page }) => {
    // Contract numbers follow the pattern CON-YYYY-NNN
    const contractLink = page.getByText(/^CON-\d{4}-\d{3}$/).first();
    await expect(contractLink).toBeVisible();
    const contractText = await contractLink.textContent();
    await contractLink.click();
    await expect(page).toHaveURL(/\/contracts\/.+/);
    // Contract number appears in the detail page breadcrumb
    await expect(page.getByText(contractText!)).toBeVisible();
  });

  test('search filters contracts by vendor name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search contracts, vendors..."]');
    await searchInput.fill('ABC Construction');
    await searchInput.press('Enter');

    await expect(page.getByText('ABC Construction Co.')).toBeVisible();
  });
});

test.describe('Contract Detail page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/contracts');
    await expect(page.getByText('Government Contracts')).toBeVisible();

    const contractLink = page.getByText(/^CON-\d{4}-\d{3}$/).first();
    await contractLink.click();
    await expect(page).toHaveURL(/\/contracts\/.+/);
  });

  test('shows contract title as page heading', async ({ page }) => {
    // The contract title is rendered as an <h1>
    await expect(page.locator('h1')).toBeVisible();
  });

  test('shows "Contract Overview" section', async ({ page }) => {
    await expect(page.getByText('Contract Overview')).toBeVisible();
  });

  test('shows contract number in overview section', async ({ page }) => {
    await expect(page.getByText('Contract No.')).toBeVisible();
    await expect(page.getByText(/CON-\d{4}-\d{3}/)).toBeVisible();
  });

  test('breadcrumb shows Contracts link back to list', async ({ page }) => {
    await page.getByText('Contracts').first().click();
    await expect(page).toHaveURL(/\/contracts$/);
  });
});
