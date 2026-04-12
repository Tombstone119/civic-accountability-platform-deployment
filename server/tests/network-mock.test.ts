import { test, expect } from '@playwright/test';

const CLIENT_URL = 'http://localhost:3000';

test.describe('Network Mocking — CAP Login API', () => {

  /**
   * Feature: page.route() with route.continue()
   * Intercept the outgoing request and inspect its payload before letting it through.
   * The real server handles the request; we just observe the payload.
   */
  test('intercept login request and verify payload', async ({ page }) => {
    let interceptedPayload: Record<string, unknown> = {};

    await page.route('**/api/auth/login', async route => {
      const body = route.request().postData();
      if (body) {
        interceptedPayload = JSON.parse(body);
      }
      await route.continue(); // forward to the real server
    });

    await page.goto(`${CLIENT_URL}/login`);
    await page.fill('input[type="email"]', 'admin@civic.gov');
    await page.fill('input[type="password"]', 'admin123');

    await Promise.all([
      page.waitForRequest('**/api/auth/login'),
      page.click('button[type="submit"]'),
    ]);

    expect(interceptedPayload.email).toBe('admin@civic.gov');
    expect(interceptedPayload).toHaveProperty('password');

    console.log('✅ Request intercepted — email:', interceptedPayload.email);
  });

  /**
   * Feature: page.route() with route.fulfill()
   * Replace the real server response with a controlled 503 error.
   * Verifies the UI correctly handles server-side failures.
   */
  test('mock 503 error — UI displays error message', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Service Unavailable' }),
      });
    });

    await page.goto(`${CLIENT_URL}/login`);
    await page.fill('input[type="email"]', 'admin@civic.gov');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // LoginPage catch block sets this message on any failed login
    await expect(
      page.getByText('Invalid credentials. Please try again.')
    ).toBeVisible();

    console.log('✅ UI correctly showed error message for mocked 503 response');
  });

  /**
   * Feature: page.route() with route.fulfill() — happy path
   * Replace the real server with a fake success response.
   * Also mock all other API calls so the dashboard renders without a real backend.
   *
   * Demonstrates: full UI flow test with zero dependency on a live database.
   */
  test('mock successful login — verify redirect to dashboard', async ({ page }) => {
    // Step 1: Catch-all mock for all /api/ requests (prevents 401 redirects from dashboard).
    // Registered first — Playwright routes are LIFO so this is matched last.
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        }),
      });
    });

    // Step 2: Specific mock for login — registered last, matched first (LIFO).
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-jwt-token-for-demo',
            user: {
              _id:   'mock-id-000000000000',
              name:  'Mock Admin',
              email: 'admin@civic.gov',
              role:  'admin',
            },
          },
        }),
      });
    });

    await page.goto(`${CLIENT_URL}/login`);
    await page.fill('input[type="email"]', 'admin@civic.gov');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Successful login navigates to '/dashboard'
    await expect(page).toHaveURL(`${CLIENT_URL}/dashboard`);
    await expect(page.getByText('Dashboard')).toBeVisible();

    console.log('✅ Redirected to dashboard — login succeeded with mocked response');
  });

});
