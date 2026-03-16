import request from 'supertest';
import app from './testApp';
import { cleanBookings } from './setup';

const VALID_STUDENT = { studentId: 'jc100001', password: 'test123' };

beforeEach(async () => {
  await cleanBookings();
});

describe('POST /api/auth/register', () => {
  it('creates user with valid student ID', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ studentId: 'jc999999', email: 'new999@jcu.edu.sg', password: 'test123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.studentId).toBe('jc999999');
  });

  it('rejects invalid student ID format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ studentId: 'abc123', email: 'bad@jcu.edu.sg', password: 'test123' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate student ID', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ studentId: 'jc100001', email: 'other@jcu.edu.sg', password: 'test123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send(VALID_STUDENT);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.studentId).toBe('jc100001');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ ...VALID_STUDENT, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid student ID or password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns profile with valid token', async () => {
    const { body } = await request(app).post('/api/auth/login').send(VALID_STUDENT);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.studentId).toBe('jc100001');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
