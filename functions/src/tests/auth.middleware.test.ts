process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.middleware';
import { HonoEnv } from '../types/env';

function createTestApp() {
  const app = new Hono<HonoEnv>();
  app.use('*', authMiddleware);
  app.get('/test', (c) => {
    return c.json({ success: true, user: c.get('user') });
  });
  return app;
}

test('1. AuthMiddleware - Missing Authorization header (401 UNAUTHORIZED)', async () => {
  const app = createTestApp();

  // Missing header
  const res1 = await app.request('/test');
  assert.equal(res1.status, 401);
  const json1: any = await res1.json();
  assert.equal(json1.success, false);
  assert.equal(json1.error.code, 'UNAUTHORIZED');
  assert.match(json1.error.message, /Authorization header missing or invalid/i);

  // Empty string header
  const res2 = await app.request('/test', { headers: { authorization: '' } });
  assert.equal(res2.status, 401);
  const json2: any = await res2.json();
  assert.equal(json2.success, false);
  assert.equal(json2.error.code, 'UNAUTHORIZED');
});

test('2. AuthMiddleware - Malformed token formats (401)', async () => {
  const app = createTestApp();

  // No Bearer prefix
  const res1 = await app.request('/test', { headers: { authorization: 'Basic dXNlcjpwYXNz' } });
  assert.equal(res1.status, 401);

  // Bearer without space
  const res2 = await app.request('/test', { headers: { authorization: 'Bearertoken123' } });
  assert.equal(res2.status, 401);

  // Bearer keyword followed by only spaces
  const res3 = await app.request('/test', { headers: { authorization: 'Bearer    ' } });
  assert.equal(res3.status, 401);
});

test('3. AuthMiddleware - Dev mock token format (mock:uid:email) (200 / sets req.user)', async () => {
  const app = createTestApp();

  // Standard format: mock:uid:email
  const res1 = await app.request('/test', {
    headers: { authorization: 'Bearer mock:user-afl2-001:afl2_dev@test.local' }
  });
  assert.equal(res1.status, 200);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.deepEqual(json1.user, {
    uid: 'user-afl2-001',
    email: 'afl2_dev@test.local',
    name: 'Mock User',
    role: 'student'
  });

  // Extended format with name: mock:uid:email:name
  const res2 = await app.request('/test', {
    headers: { authorization: 'Bearer mock:john-doe:john@example.com:John Doe' }
  });
  assert.equal(res2.status, 200);
  const json2: any = await res2.json();
  assert.deepEqual(json2.user, {
    uid: 'john-doe',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'student'
  });

  // Legacy format: mock-token-<uid>
  const res3 = await app.request('/test', {
    headers: { authorization: 'Bearer mock-token-legacy-42' }
  });
  assert.equal(res3.status, 200);
  const json3: any = await res3.json();
  assert.equal(json3.user.uid, 'legacy-42');
  assert.equal(json3.user.email, 'legacy-42@example.com');
});
