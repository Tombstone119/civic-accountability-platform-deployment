import { test, expect } from './helpers.fixture';
import { request } from '@playwright/test';

let targetUserId: string;

const TS = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe('Users API', () => {

  test.beforeAll(async () => {
    // Register a user to be the target of admin operations
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5000',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const registerRes = await ctx.post('/api/auth/register', {
      data: {
        name:     `Target User ${TS}`,
        email:    `target_${TS}@test.com`,
        password: 'Test@12345',
      },
    });
    targetUserId = (await registerRes.json()).data.user._id;
    await ctx.dispose();
  });

  // ── RBAC Guards ───────────────────────────────────────────────────────────────

  test('unauthenticated request is rejected', async ({ apiContext }) => {
    const res = await apiContext.get('/api/users');
    expect(res.status()).toBe(401);
  });

  test('officer cannot list users', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get('/api/users', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('auditor cannot list users', async ({ apiContext, auditorToken }) => {
    const res = await apiContext.get('/api/users', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('viewer cannot list users', async ({ apiContext, viewerToken }) => {
    const res = await apiContext.get('/api/users', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  // ── List ─────────────────────────────────────────────────────────────────────

  test('admin can list all users', async ({ apiContext, adminToken }) => {
    const res = await apiContext.get('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('pagination');
  });

  test('admin can filter users by role', async ({ apiContext, adminToken }) => {
    const res = await apiContext.get('/api/users?role=admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.every((u: any) => u.role === 'admin')).toBe(true);
  });

  // ── Read ─────────────────────────────────────────────────────────────────────

  test('admin can get a user by ID', async ({ apiContext, adminToken }) => {
    const res = await apiContext.get(`/api/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data._id).toBe(targetUserId);
  });

  test('officer cannot get a user by ID', async ({ apiContext, officerToken }) => {
    const res = await apiContext.get(`/api/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('returns 404 for a non-existent user', async ({ apiContext, adminToken }) => {
    const res = await apiContext.get('/api/users/000000000000000000000000', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Update ───────────────────────────────────────────────────────────────────

  test('admin can update a user role', async ({ apiContext, adminToken }) => {
    const res = await apiContext.put(`/api/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { role: 'procurement_officer' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('procurement_officer');
  });

  test('admin can deactivate a user', async ({ apiContext, adminToken }) => {
    const res = await apiContext.put(`/api/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isActive: false },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isActive).toBe(false);
  });

  test('officer cannot update a user', async ({ apiContext, officerToken }) => {
    const res = await apiContext.put(`/api/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
      data: { role: 'admin' },
    });
    expect(res.status()).toBe(403);
  });

});
