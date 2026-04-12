import { test as base, request, APIRequestContext } from '@playwright/test';

type RoleFixtures = {
  apiContext: APIRequestContext;
  adminToken: string;
  officerToken: string;
  auditorToken: string;
  viewerToken: string;
};

async function loginAs(
  ctx: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  if (res.status() !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status()}`);
  }
  return (await res.json()).data.token;
}

export const test = base.extend<RoleFixtures>({

  // Fresh isolated HTTP client per test
  apiContext: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    await use(ctx);
    await ctx.dispose();
  },

  adminToken: async ({ apiContext }, use) => {
    await use(await loginAs(apiContext, 'admin@civic.gov', 'admin123'));
  },

  officerToken: async ({ apiContext }, use) => {
    await use(await loginAs(apiContext, 'officer@civic.gov', 'officer123'));
  },

  auditorToken: async ({ apiContext }, use) => {
    await use(await loginAs(apiContext, 'auditor@civic.gov', 'auditor123'));
  },

  // viewer@civic.gov was removed from seed — register a fresh viewer user instead.
  // Registration defaults to the 'viewer' role.
  viewerToken: async ({ apiContext }, use) => {
    const email = `viewer_${Date.now()}@test.com`;
    const registerRes = await apiContext.post('/api/auth/register', {
      data: { name: 'Test Viewer', email, password: 'Test@12345' },
    });
    if (registerRes.status() !== 201) {
      throw new Error(`Failed to register viewer user: HTTP ${registerRes.status()}`);
    }
    await use(await loginAs(apiContext, email, 'Test@12345'));
  },
});

export { expect } from '@playwright/test';
