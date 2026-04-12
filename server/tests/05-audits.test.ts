import { test, expect } from './helpers.fixture';

let auditId: string;
let findingId: string;

const TS = Date.now();

test.describe('Audits API', () => {

  // ── RBAC Guards for Listing ───────────────────────────────────────────────────

  // GET /api/audits uses requireAuthenticated — all logged-in roles can list
  test('viewer can list audits', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/audits', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('officer can list audits', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get('/api/audits', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/audits');
    expect(res.status()).toBe(401);
  });

  // ── List ─────────────────────────────────────────────────────────────────────

  test('auditor can list audits', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/audits', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('auditor can create an audit', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/audits', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        auditType:       'routine',
        startDate:       '2026-03-01',
        endDate:         '2026-03-31',
        summary:         'Routine quarterly review — Playwright test audit',
        recommendations: 'Improve documentation retention practices',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.auditType).toBe('routine');
    auditId = body.data._id;
  });

  test('officer is forbidden from creating an audit', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/audits', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { auditType: 'compliance' },
    });
    expect(res.status()).toBe(403);
  });

  test('viewer is forbidden from creating an audit', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post('/api/audits', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { auditType: 'routine' },
    });
    expect(res.status()).toBe(403);
  });

  test('validation rejects an audit with an invalid type', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/audits', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: { auditType: 'invalid_type' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('viewer can get an audit by ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/audits/${auditId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data._id).toBe(auditId);
  });

  test('returns 404 for a non-existent audit ID', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/audits/000000000000000000000000', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  test('auditor can update an audit status', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.put(`/api/audits/${auditId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: { status: 'in_progress', summary: 'Audit is now in progress' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('in_progress');
  });

  test('officer is forbidden from updating an audit', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/audits/${auditId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { status: 'completed' },
    });
    expect(res.status()).toBe(403);
  });

  // ── Findings (auditor-exclusive create/update/delete) ─────────────────────────

  test('officer is forbidden from adding an audit finding', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post(`/api/audits/${auditId}/findings`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        findingType: 'delay',
        severity:    'low',
        description: 'Minor delivery delay',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('viewer is forbidden from adding an audit finding', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post(`/api/audits/${auditId}/findings`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: {
        findingType: 'delay',
        severity:    'low',
        description: 'This should fail',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor can add a finding to an audit', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post(`/api/audits/${auditId}/findings`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        findingType:    'overpricing',
        severity:       'medium',
        title:          'Unit price exceeds market rate',
        description:    'The price per unit is 40% above the market benchmark for comparable goods.',
        recommendation: 'Request price justification and seek alternative quotes.',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.severity).toBe('medium');
    findingId = body.data._id;
  });

  test('viewer can list findings for an audit', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/audits/${auditId}/findings`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('auditor can update a finding', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.put(`/api/audits/${auditId}/findings/${findingId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: { severity: 'high', status: 'open' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.severity).toBe('high');
  });

  test('officer is forbidden from updating a finding', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/audits/${auditId}/findings/${findingId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { severity: 'low' },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor can delete a finding', async ({ apiContext, auditorToken }) => {
    // Add a disposable finding first
    const addRes = await apiContext.post(`/api/audits/${auditId}/findings`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        findingType: 'delay',
        severity:    'low',
        title:       'Minor delay finding — disposable',
        description: 'This finding will be deleted by the test.',
      },
    });
    const disposableFindingId = (await addRes.json()).data._id;

    const res = await apiContext.delete(`/api/audits/${auditId}/findings/${disposableFindingId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('officer is forbidden from deleting a finding', async ({ apiContext, officerToken }) => {
    const res = await apiContext.delete(`/api/audits/${auditId}/findings/${findingId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  // ── Delete Audit ───────────────────────────────────────────────────────────────

  test('auditor cannot delete an audit (admin only)', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.delete(`/api/audits/${auditId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('admin can delete an audit and cascade its findings', async ({ apiContext, adminToken, auditorToken }) => {
    // Create a disposable audit
    const createRes = await apiContext.post('/api/audits', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        auditType: 'compliance',
        startDate: '2026-04-01',
        endDate:   '2026-04-30',
        summary:   'Disposable audit for deletion test',
      },
    });
    const disposableAuditId = (await createRes.json()).data._id;

    const res = await apiContext.delete(`/api/audits/${disposableAuditId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);

    const checkRes = await apiContext.get(`/api/audits/${disposableAuditId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(checkRes.status()).toBe(404);
  });

});
