import { test, expect } from './helpers.fixture';
import { request } from '@playwright/test';

let seededContractId: string;
let paymentId: string;

const TS = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe('Payments API', () => {

  test.beforeAll(async () => {
    // Fetch a seeded contract to use as the payment target
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { email: 'admin@civic.gov', password: 'admin123' },
    });
    const token = (await loginRes.json()).data.token;

    const contractRes = await ctx.get('/api/contracts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contracts = (await contractRes.json()).data;
    const payable = contracts.find((c: any) => c.status !== 'draft' && c.status !== 'terminated');
    seededContractId = (payable ?? contracts[0])._id;

    await ctx.dispose();
  });

  // ── RBAC Guards ───────────────────────────────────────────────────────────────

  // GET /api/payments uses requireAuthenticated — all logged-in roles can list
  test('viewer can list payments', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/payments', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('auditor can list payments', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/payments', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/payments');
    expect(res.status()).toBe(401);
  });

  // ── List ─────────────────────────────────────────────────────────────────────

  test('officer can list all payments', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get('/api/payments', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('officer can record a payment against a contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/payments', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        contract:      seededContractId,
        amount:        15000,
        paymentDate:   new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNo:   `PAY-PW-${TS}`,
        notes:         'Playwright test payment',
        status:        'pending',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.amount).toBe(15000);
    paymentId = body.data._id;
  });

  test('auditor is forbidden from recording a payment', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/payments', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        contract:    seededContractId,
        amount:      500,
        paymentDate: '2026-06-01',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('viewer is forbidden from recording a payment', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post('/api/payments', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: {
        contract:    seededContractId,
        amount:      500,
        paymentDate: '2026-06-01',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('validation rejects a payment with a negative amount', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/payments', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        contract:    seededContractId,
        amount:      -100,
        paymentDate: '2026-06-01',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('validation rejects a payment with a missing contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/payments', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        amount:      5000,
        paymentDate: '2026-06-01',
      },
    });
    expect(res.status()).toBe(400);
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('officer can get a payment by ID', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data._id).toBe(paymentId);
    expect(body.data.referenceNo).toBe(`PAY-PW-${TS}`);
  });

  test('viewer can get a payment by ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('returns 404 for a non-existent payment ID', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get('/api/payments/000000000000000000000000', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ───────────────────────────────────────────────────────────────────

  test('admin can update a payment status', async ({ apiContext, adminToken }) => {
    const res = await apiContext.put(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'completed', notes: 'Payment confirmed by admin' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('completed');
  });

  test('officer cannot update a payment status (admin only)', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { status: 'reversed' },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor cannot update a payment status (admin only)', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.put(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: { status: 'reversed' },
    });
    expect(res.status()).toBe(403);
  });

});
