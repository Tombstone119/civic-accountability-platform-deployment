import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  projects: [
    // ── API / Integration tests (no browser) ─────────────────────────────────
    // Runs all numbered test files against the live Express API.
    {
      name: 'api',
      testMatch: /\d{2}-.*\.test\.ts/,
      use: {
        baseURL: 'http://localhost:5000',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },

    // ── Browser / Network-mock tests ─────────────────────────────────────────
    // Runs the network-mock test against the running Vite dev server (port 3000).
    {
      name: 'browser',
      testMatch: /network-mock\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
  ],
});
