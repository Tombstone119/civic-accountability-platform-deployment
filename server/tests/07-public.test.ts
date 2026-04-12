import { test, expect } from './helpers.fixture';
import { request } from '@playwright/test';

let publicRecordId: string;
let commentId: string;

test.describe('Public Portal API', () => {

  test.beforeAll(async () => {
    // Resolve a seeded public record ID for subsequent tests
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const res = await ctx.get('/api/public/records');
    const body = await res.json();
    if (body.data && body.data.length > 0) {
      publicRecordId = body.data[0]._id;
    }
    await ctx.dispose();
  });

  // ── Health ────────────────────────────────────────────────────────────────────

  test('health endpoint responds without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Overview (no auth) ────────────────────────────────────────────────────────

  test('public overview is accessible without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/overview');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Overview returns aggregate stats — should have some structure
    expect(body.data).toBeTruthy();
  });

  // ── Currencies ────────────────────────────────────────────────────────────────

  test('currency list is accessible without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/currencies');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeTruthy();
  });

  // ── Public Records ────────────────────────────────────────────────────────────

  test('public records list is accessible without authentication', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/records');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
  });

  test('public records can be filtered by a search query', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/records?q=contract&page=1&limit=5');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('public records can be paginated', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/records?page=1&limit=2');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pagination.limit).toBe(2);
  });

  test('returns 404 for a non-existent public record', async ({ apiContext }) => {
    const res = await apiContext.get('/api/public/records/000000000000000000000000');
    expect(res.status()).toBe(404);
  });

  test('can retrieve a single public record by ID', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.get(`/api/public/records/${publicRecordId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data._id).toBe(publicRecordId);
  });

  // ── Comments ──────────────────────────────────────────────────────────────────

  test('approved comments for a record are publicly accessible', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.get(`/api/public/records/${publicRecordId}/comments`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('citizen can submit a comment without authentication', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.post(`/api/public/records/${publicRecordId}/comments`, {
      data: {
        authorName:  'Jane Citizen',
        content:     'This contract amount seems high compared to the market rate. Requesting transparency.',
        authorEmail: 'jane.citizen@example.com',
        isAnonymous: false,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    // New comments start as pending — not immediately visible on the portal
    expect(body.data.status).toBe('pending');
    commentId = body.data._id;
  });

  test('citizen can submit an anonymous comment', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.post(`/api/public/records/${publicRecordId}/comments`, {
      data: {
        authorName:  'Anonymous',
        content:     'Whistleblower: I witnessed this contract being awarded without proper process.',
        isAnonymous: true,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.isAnonymous).toBe(true);
    expect(body.data.status).toBe('pending');
  });

  test('validation rejects a comment with content that is too short', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.post(`/api/public/records/${publicRecordId}/comments`, {
      data: {
        authorName: 'Short',
        content:    'Too short', // < 10 chars is rejected
      },
    });
    expect(res.status()).toBe(400);
  });

  test('validation rejects a comment missing required authorName', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.post(`/api/public/records/${publicRecordId}/comments`, {
      data: {
        content: 'This is a valid comment but has no author name.',
      },
    });
    expect(res.status()).toBe(400);
  });

  // ── Comment Moderation (admin only) ───────────────────────────────────────────

  test('admin can approve a comment', async ({ apiContext, adminToken }) => {
    if (!commentId) {
      test.skip(true, 'No comment was created to moderate');
      return;
    }
    // Correct endpoint: PUT /api/public/comments/:id  (no /moderate suffix)
    const res = await apiContext.put(`/api/public/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'approved', isFlagged: false },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('approved');
  });

  test('non-admin cannot moderate a comment', async ({ apiContext, officerToken }) => {
    if (!commentId) {
      test.skip(true, 'No comment was created to moderate');
      return;
    }
    const res = await apiContext.put(`/api/public/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { status: 'rejected' },
    });
    expect(res.status()).toBe(403);
  });

  test('admin can list all comments for moderation', async ({ apiContext, adminToken }) => {
    const res = await apiContext.get('/api/public/comments', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('officer cannot access the admin comment list', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get('/api/public/comments', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  // ── Currency Conversion ───────────────────────────────────────────────────────

  test('contract value currency conversion is publicly accessible', async ({ apiContext }) => {
    if (!publicRecordId) {
      test.skip(true, 'No seeded public records available');
      return;
    }
    const res = await apiContext.get(
      `/api/public/records/${publicRecordId}/convert?from=USD&to=EUR`
    );
    // Live external API call — accept success or service-unavailable gracefully
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  // ── Spending Summaries ────────────────────────────────────────────────────────

  test('overall spending summary is publicly accessible', async ({ apiContext }) => {
    const res = await apiContext.get('/api/spending/summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('admin can trigger a spending summary refresh', async ({ apiContext, adminToken }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fiscalYear: 2026 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('officer cannot trigger a spending summary refresh', async ({ apiContext, officerToken }) => {
    const res = await apiContext.post('/api/spending/refresh-summary', {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { fiscalYear: 2026 },
    });
    expect(res.status()).toBe(403);
  });

});
