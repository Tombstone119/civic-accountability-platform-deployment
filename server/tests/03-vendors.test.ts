import { test, expect } from './helpers.fixture';

let vendorId: string;
let documentId: string;

const TS = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe('Vendors API', () => {

  // ── List ─────────────────────────────────────────────────────────────────────

  test('any authenticated user can list vendors', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/vendors', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('auditor can list vendors', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/vendors', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/vendors');
    expect(res.status()).toBe(401);
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('officer can create a vendor', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/vendors', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        name:           `Playwright Supplies Ltd ${TS}`,
        registrationNo: `REG-PW-${TS}`,
        email:          `vendor_${TS}@example.com`,
        phone:          '+94711234567',
        address:        '42 Test Street, Colombo',
        category:       'supplies',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.name).toBe(`Playwright Supplies Ltd ${TS}`);
    vendorId = body.data._id;
  });

  test('viewer is forbidden from creating a vendor', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.post('/api/vendors', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: {
        name:           'Should Fail',
        registrationNo: 'REG-FAIL',
        email:          'fail@example.com',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor is forbidden from creating a vendor', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.post('/api/vendors', {
      headers: { Authorization: `Bearer ${auditorToken}` },
      data: {
        name:           'Auditor Should Fail',
        registrationNo: 'REG-AUD-FAIL',
        email:          'audfail@example.com',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('validation rejects a vendor with a missing registration number', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/vendors', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { name: 'Incomplete Vendor', email: 'incomplete@example.com' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('any authenticated user can retrieve a vendor by ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data._id).toBe(vendorId);
  });

  test('returns 404 for a non-existent vendor ID', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/vendors/000000000000000000000000', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  test('officer can update a vendor', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { phone: '+94719999999' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.phone).toBe('+94719999999');
  });

  // ── Vendor Documents ──────────────────────────────────────────────────────────

  test('officer can add a document to a vendor', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post(`/api/vendors/${vendorId}/documents`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        documentType: 'tax_clearance',
        documentNo:   `TAX-${TS}`,
        issuedDate:   '2025-01-01',
        expiryDate:   '2026-12-31',
        issuedBy:     'Inland Revenue Department',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    documentId = body.data._id;
  });

  test('officer can list vendor documents', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get(`/api/vendors/${vendorId}/documents`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('viewer is forbidden from listing vendor documents', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get(`/api/vendors/${vendorId}/documents`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  // ── Blacklist ─────────────────────────────────────────────────────────────────

  test('officer cannot blacklist a vendor', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post(`/api/vendors/${vendorId}/blacklist`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { reason: 'Unauthorized attempt' },
    });
    expect(res.status()).toBe(403);
  });

  test('admin can blacklist a vendor', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post(`/api/vendors/${vendorId}/blacklist`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { reason: 'Test blacklist — Playwright', blacklistedBy: 'admin@civic.gov' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isBlacklisted).toBe(true);
  });

  test('admin can remove a vendor from the blacklist', async ({ apiContext, adminToken }) => {
    const res = await apiContext.delete(`/api/vendors/${vendorId}/blacklist`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isBlacklisted).toBe(false);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  test('officer can delete a vendor (cascade cancels linked contracts)', async ({ apiContext, officerToken }) => {
    // Create a disposable vendor with no contracts
    const createRes = await apiContext.post('/api/vendors', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: {
        name:           `Disposable Vendor ${TS}`,
        registrationNo: `REG-DEL-${TS}`,
        email:          `disposable_${TS}@example.com`,
        category:       'services',
      },
    });
    const disposableId = (await createRes.json()).data._id;

    const res = await apiContext.delete(`/api/vendors/${disposableId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(200);

    // Verify vendor is gone
    const checkRes = await apiContext.get(`/api/vendors/${disposableId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(checkRes.status()).toBe(404);
  });

  test('viewer is forbidden from deleting a vendor', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.delete(`/api/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor is forbidden from deleting a vendor', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.delete(`/api/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(403);
  });

});
