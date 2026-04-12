import { test, expect } from './helpers.fixture';
import { request } from '@playwright/test';

let departmentCode: string;

test.describe('Spending API', () => {

  test.beforeAll(async () => {
    // Fetch a seeded department code for filtering tests
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { email: 'admin@civic.gov', password: 'admin123' },
    });
    const token = (await loginRes.json()).data.token;

    const deptRes = await ctx.get('/api/departments', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const depts = (await deptRes.json()).data;
    if (depts.length > 0) {
      departmentCode = depts[0]._id;
    }
    await ctx.dispose();
  });

  // ── Public Endpoints (no auth required) ──────────────────────────────────────

  test('spending list is publicly accessible without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/spending');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('spending summary is publicly accessible without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/spending/summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('department spending is publicly accessible without authentication', async ({ apiContext }) => {
    if (!departmentCode) {
      test.skip(true, 'No seeded department available');
      return;
    }
    const res = await apiContext.get(`/api/spending/department/${departmentCode}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Admin: Refresh Summary ────────────────────────────────────────────────────

  test('admin can refresh the spending summary', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fiscalYear: 2026 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('officer cannot refresh the spending summary', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { fiscalYear: 2026 },
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated user cannot refresh the spending summary', async ({ apiContext }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      data: { fiscalYear: 2026 },
    });
    expect(res.status()).toBe(401);
  });

  test('validation rejects refresh-summary without a fiscalYear', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  // ── Admin: CRUD ───────────────────────────────────────────────────────────────

  test('officer cannot create a spending record', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/spending', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { fiscalYear: 2026, totalBudget: 1000000, totalSpent: 500000 },
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated user cannot create a spending record', async ({ apiContext }) => {
    const res = await apiContext.post('/api/spending', {
      data: { fiscalYear: 2026, totalBudget: 1000000, totalSpent: 500000 },
    });
    expect(res.status()).toBe(401);
  });

});
