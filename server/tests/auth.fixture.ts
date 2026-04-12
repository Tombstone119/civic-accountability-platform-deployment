import { test as base, request, APIRequestContext } from '@playwright/test';

type Fixtures = {
  apiContext: APIRequestContext;
  authToken: string;
};

const TEST_USER = {
  name:     'Playwright Tester',
  email:    `playwright_${Date.now()}@test.com`,
  password: 'Test@12345',
};

export const test = base.extend<Fixtures>({

  // SETUP: creates HTTP client | TEARDOWN: destroys it after test
  apiContext: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    await use(ctx);
    await ctx.dispose();
  },

  // SETUP: registers user + logs in, gives token to test
  authToken: async ({ apiContext }, use) => {
    await apiContext.post('/api/auth/register', {
      data: TEST_USER,
    });

    const loginRes = await apiContext.post('/api/auth/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });

    if (loginRes.status() !== 200) {
      const errorBody = await loginRes.text();
      throw new Error(`Failed to login test user. Status: ${loginRes.status()}, Body: ${errorBody}`);
    }

    const body = await loginRes.json();
    if (!body?.data?.token) {
      throw new Error(`Login response did not include token. Body: ${JSON.stringify(body)}`);
    }

    const token: string = body.data.token;
    await use(token);
  },
});

export { expect } from '@playwright/test';