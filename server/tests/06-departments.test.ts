import { test, expect } from './helpers.fixture';

let departmentId: string;

const TS = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe('Departments API', () => {

  // ── List ─────────────────────────────────────────────────────────────────────

  test('any authenticated user can list departments', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/departments', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('auditor can list departments', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/departments', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/departments');
    expect(res.status()).toBe(401);
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('admin can create a department', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name:        `Ministry of Testing ${TS}`,
        code:        `MOT-${TS}`.slice(0, 20),
        budget:      5000000,
        description: 'Playwright test department',
        headOfDept:  'Dr. Test Director',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.name).toBe(`Ministry of Testing ${TS}`);
    departmentId = body.data._id;
  });

  test('officer is forbidden from creating a department', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        name: 'Unauthorized Dept',
        code: 'UNAUTH',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor is forbidden from creating a department', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        name: 'Auditor Dept Attempt',
        code: 'AUD-DEPT',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('validation rejects a department without a name', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { code: 'NO-NAME' },
    });
    expect(res.status()).toBe(400);
  });

  test('validation rejects a duplicate department code', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'Duplicate Code Dept',
        code: `MOT-${TS}`.slice(0, 20),
      },
    });
    // Conflict (409) or bad request (400)
    expect([400, 409]).toContain(res.status());
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('viewer can get a department by ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/departments/${departmentId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data._id).toBe(departmentId);
  });

  test('returns 404 for a non-existent department', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/departments/000000000000000000000000', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ───────────────────────────────────────────────────────────────────

  test('admin can update a department', async ({ apiContext, adminToken }) => {
    const res = await apiContext.put(`/api/departments/${departmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { budget: 7500000 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.budget).toBe(7500000);
  });

  test('officer is forbidden from updating a department', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/departments/${departmentId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { budget: 0 },
    });
    expect(res.status()).toBe(403);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  test('officer is forbidden from deleting a department', async ({ apiContext, officerToken }) => {
    const res = await apiContext.delete(`/api/departments/${departmentId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('admin can delete a department with no contracts', async ({ apiContext, adminToken }) => {
    // Create a disposable department
    const createRes = await apiContext.post('/api/departments', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: `Disposable Dept ${TS}`,
        code: `DISP-${TS}`.slice(0, 20),
      },
    });
    const disposableId = (await createRes.json()).data._id;

    const res = await apiContext.delete(`/api/departments/${disposableId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
  });

});
