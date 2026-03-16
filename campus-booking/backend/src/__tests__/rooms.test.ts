import request from 'supertest';
import app from './testApp';

let token: string;

beforeAll(async () => {
  const { body } = await request(app)
    .post('/api/auth/login')
    .send({ studentId: 'jc100001', password: 'test123' });
  token = body.token;
});

describe('GET /api/buildings', () => {
  it('returns all buildings', async () => {
    const res = await request(app)
      .get('/api/buildings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.buildings.length).toBeGreaterThanOrEqual(5);
    expect(res.body.buildings.map((b: any) => b.name)).toContain('Block A');
  });
});

describe('GET /api/rooms', () => {
  it('filters by building and floor', async () => {
    const buildingsRes = await request(app)
      .get('/api/buildings')
      .set('Authorization', `Bearer ${token}`);
    const blockA = buildingsRes.body.buildings.find((b: any) => b.name === 'Block A');

    const res = await request(app)
      .get(`/api/rooms?buildingId=${blockA.id}&floor=Level%201`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBeGreaterThan(0);
    res.body.rooms.forEach((r: any) => {
      expect(r.floor).toBe('Level 1');
      expect(r.buildingId).toBe(blockA.id);
    });
  });
});

describe('GET /api/rooms/floor-availability', () => {
  it('returns rooms with availability', async () => {
    const buildingsRes = await request(app)
      .get('/api/buildings')
      .set('Authorization', `Bearer ${token}`);
    const blockA = buildingsRes.body.buildings.find((b: any) => b.name === 'Block A');

    const res = await request(app)
      .get(`/api/rooms/floor-availability?buildingId=${blockA.id}&floor=Level%201&date=2026-04-01&startTime=10:00&durationHours=1`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBeGreaterThan(0);
    res.body.rooms.forEach((r: any) => {
      expect(r).toHaveProperty('isAvailable');
      expect(r).toHaveProperty('room');
    });
  });
});
