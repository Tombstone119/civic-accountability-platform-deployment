import { test, expect } from './auth.fixture';

test.describe('Auth API', () => {

  test('should register a new user', async ({ apiContext }) => {
    const email = `newuser_${Date.now()}@test.com`;

    const response = await apiContext.post('/api/auth/register', {
      data: { name: 'Demo User', email, password: 'Test@12345' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.role).toBe('viewer'); // registration defaults to viewer
  });

  test('should reject registration with a duplicate email', async ({ apiContext }) => {
    const email = `dup_${Date.now()}@test.com`;
    await apiContext.post('/api/auth/register', {
      data: { name: 'First User', email, password: 'Test@12345' },
    });

    const response = await apiContext.post('/api/auth/register', {
      data: { name: 'Duplicate User', email, password: 'Test@12345' },
    });

    expect([400, 409]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should login with correct credentials', async ({ apiContext }) => {
    const email = `login_${Date.now()}@test.com`;

    await apiContext.post('/api/auth/register', {
      data: { name: 'Login Test', email, password: 'Test@12345' },
    });

    const response = await apiContext.post('/api/auth/login', {
      data: { email, password: 'Test@12345' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
  });

  test('should reject wrong password', async ({ apiContext }) => {
    const response = await apiContext.post('/api/auth/login', {
      data: { email: 'nobody@test.com', password: 'wrongpassword' },
    });

    expect(response.status()).not.toBe(200);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should reject login with missing fields', async ({ apiContext }) => {
    const response = await apiContext.post('/api/auth/login', {
      data: { email: 'admin@civic.gov' }, // missing password
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should access profile with valid token', async ({ apiContext, authToken }) => {
    const response = await apiContext.get('/api/auth/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('user');
  });

  test('should reject profile access without token', async ({ apiContext }) => {
    const response = await apiContext.get('/api/auth/profile');
    expect(response.status()).toBe(401);
  });

  test('should reject profile access with an invalid token', async ({ apiContext }) => {
    const response = await apiContext.get('/api/auth/profile', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(response.status()).toBe(401);
  });

  test('should update own profile name', async ({ apiContext, authToken }) => {
    const response = await apiContext.put('/api/auth/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: 'Updated Name' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.name).toBe('Updated Name');
  });

});
