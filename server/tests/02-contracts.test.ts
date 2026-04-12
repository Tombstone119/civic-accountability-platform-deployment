import { test, expect } from './helpers.fixture';
import { request } from '@playwright/test';

// Shared state across sequential tests
let vendorId: string;
let departmentId: string;
let contractId: string;
let itemId: string;

const TS = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe('Contracts API', () => {

  test.beforeAll(async () => {
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { email: 'admin@civic.gov', password: 'admin123' },
    });
    const token = (await loginRes.json()).data.token;

    const [vRes, dRes] = await Promise.all([
      ctx.get('/api/vendors',     { headers: { Authorization: `Bearer ${token}` } }),
      ctx.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    vendorId     = (await vRes.json()).data[0]._id;
    departmentId = (await dRes.json()).data[0]._id;

    await ctx.dispose();
  });

  // ── List ─────────────────────────────────────────────────────────────────────

  test('any authenticated user can list contracts', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/contracts', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('total');
  });

  test('auditor can list contracts', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/contracts', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/contracts');
    expect(res.status()).toBe(401);
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('officer can create a contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        contractNo:        `TST-${TS}`,
        title:             'Playwright Test Contract',
        vendor:            vendorId,
        department:        departmentId,
        contractValue:     250000,
        startDate:         '2026-01-01',
        endDate:           '2026-12-31',
        procurementMethod: 'open_tender',
        status:            'draft',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.contractNo).toBe(`TST-${TS}`);
    contractId = body.data._id;
  });

  test('viewer is forbidden from creating a contract', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: {
        contractNo:        `RBAC-${TS}`,
        title:             'Should Not Be Created',
        vendor:            vendorId,
        department:        departmentId,
        contractValue:     1000,
        startDate:         '2026-01-01',
        endDate:           '2026-12-31',
        procurementMethod: 'open_tender',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor is forbidden from creating a contract', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        contractNo:        `AUD-${TS}`,
        title:             'Auditor Cannot Create',
        vendor:            vendorId,
        department:        departmentId,
        contractValue:     1000,
        startDate:         '2026-01-01',
        endDate:           '2026-12-31',
        procurementMethod: 'open_tender',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('validation rejects a contract with missing required fields', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { title: 'Incomplete Contract' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('viewer can retrieve a contract by ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data._id).toBe(contractId);
  });

  test('returns 404 for a non-existent contract ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/contracts/000000000000000000000000', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  test('officer can update a contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { title: 'Updated Playwright Test Contract' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Updated Playwright Test Contract');
  });

  // ── Contract Items ────────────────────────────────────────────────────────────

  test('officer can add a line item to a contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post(`/api/contracts/${contractId}/items`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        description: 'Office Chairs',
        quantity:    50,
        unitPrice:   200,
        unit:        'piece',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.quantity).toBe(50);
    itemId = body.data._id;
  });

  test('viewer can list contract items', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/contracts/${contractId}/items`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('viewer is forbidden from adding a contract item', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post(`/api/contracts/${contractId}/items`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { description: 'Unauthorized Item', quantity: 1, unitPrice: 100, unit: 'piece' },
    });
    expect(res.status()).toBe(403);
  });

  // ── Publish ───────────────────────────────────────────────────────────────────

  test('officer can publish a contract to the public portal', async ({ apiContext, officerToken }) => {
    // Create a fresh active contract to publish
    const createRes = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        contractNo:        `PUB-${TS}`,
        title:             'Contract for Publication',
        vendor:            vendorId,
        department:        departmentId,
        contractValue:     75000,
        startDate:         '2026-01-01',
        endDate:           '2026-06-30',
        procurementMethod: 'open_tender',
        status:            'active',
      },
    });
    const newContractId = (await createRes.json()).data._id;

    const res = await apiContext.post(`/api/contracts/${newContractId}/publish`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('viewer is forbidden from publishing a contract', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post(`/api/contracts/${contractId}/publish`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  test('admin can delete a draft contract', async ({ apiContext, adminToken, officerToken }) => {
    const createRes = await apiContext.post('/api/contracts', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        contractNo:        `DEL-${TS}`,
        title:             'Contract Marked for Deletion',
        vendor:            vendorId,
        department:        departmentId,
        contractValue:     5000,
        startDate:         '2026-01-01',
        endDate:           '2026-12-31',
        procurementMethod: 'open_tender',
        status:            'draft',
      },
    });
    const draftId = (await createRes.json()).data._id;

    const res = await apiContext.delete(`/api/contracts/${draftId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('officer is forbidden from deleting a contract', async ({ apiContext, officerToken }) => {
    const res = await apiContext.delete(`/api/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

});
