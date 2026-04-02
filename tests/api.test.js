const request = require('supertest');
const app = require('../src/app');

let adminToken, analystToken, viewerToken;

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('returns token for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@finance.dev', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    adminToken = res.body.token;
  });

  test('returns token for valid analyst credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'analyst@finance.dev', password: 'analyst123' });
    expect(res.status).toBe(200);
    analystToken = res.body.token;
  });

  test('returns token for valid viewer credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@finance.dev', password: 'viewer123' });
    expect(res.status).toBe(200);
    viewerToken = res.body.token;
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@finance.dev', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('returns 422 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@finance.dev' });
    expect(res.status).toBe(422);
  });
});

// ─── Records (CRUD + Access Control) ─────────────────────────────────────────

describe('GET /api/records', () => {
  test('allows viewer to list records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  test('supports type filter', async () => {
    const res = await request(app)
      .get('/api/records?type=income')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.type).toBe('income'));
  });
});

describe('POST /api/records', () => {
  test('admin can create a record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 5000, type: 'income', category: 'Test', date: '2026-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test('viewer cannot create a record (403)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 5000, type: 'income', category: 'Test', date: '2026-01-15' });
    expect(res.status).toBe(403);
  });

  test('analyst cannot create a record (403)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 5000, type: 'income', category: 'Test', date: '2026-01-15' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: -100, type: 'income' });
    expect(res.status).toBe(422);
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/summary', () => {
  test('analyst can access summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBeDefined();
    expect(res.body.netBalance).toBeDefined();
  });

  test('viewer cannot access summary (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/recent', () => {
  test('all authenticated users can see recent activity', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recent)).toBe(true);
  });
});

describe('GET /api/dashboard/trends', () => {
  test('admin can see monthly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?months=3')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trends).toHaveLength(3);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  test('admin can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('viewer cannot list all users (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
