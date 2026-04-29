import { defineConfig, devices } from '@playwright/test';

/**
 * Client-side E2E config. Distinct from server/playwright.config.ts which
 * covers API and network-mock tests. Run with:
 *   npx playwright test --config playwright.e2e.config.ts
 *
 * Requires the full dev stack (client + server). The webServer block starts
 * both via `npm run dev`. In dev mode the existing servers are reused if
 * already running; in CI they are started fresh.
 */
export default defineConfig({
  testDir: './client/tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never', outputFolder: 'client/playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `npm run dev` starts both Express (port 5000) and Vite (port 3000).
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
