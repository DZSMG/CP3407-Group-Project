import request from 'supertest';
import app from './testApp';
import { cleanBookings, testPrisma } from './setup';

let token: string;
let token2: string;
let roomId: number;
let libraryRoomId: number;

beforeAll(async () => {
  const r1 = await request(app).post('/api/auth/login').send({ studentId: 'jc100001', password: 'test123' });
  token = r1.body.token;
  const r2 = await request(app).post('/api/auth/login').send({ studentId: 'jc100002', password: 'test123' });
  token2 = r2.body.token;

  // Get a regular room id
  const blockA = await testPrisma.building.findFirst({ where: { name: 'Block A' } });
  const room = await testPrisma.room.findFirst({ where: { buildingId: blockA!.id } });
  roomId = room!.id;

  // Get a library seat id
  const library = await testPrisma.building.findFirst({ where: { name: 'Library' } });
  const libRoom = await testPrisma.room.findFirst({ where: { buildingId: library!.id } });
  libraryRoomId = libRoom!.id;
});

beforeEach(async () => {
  await cleanBookings();
});

describe('POST /api/bookings', () => {
  it('creates booking successfully', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 2 });
    expect(res.status).toBe(201);
    expect(res.body.booking.roomId).toBe(roomId);
    expect(res.body.booking.startTime).toBe('10:00');
    expect(res.body.booking.endTime).toBe('12:00');
  });

  it('returns 409 for double-booking same room+time', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 2 });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({ roomId, date: '2026-04-01', startTime: '11:00', durationHours: 1 });
    expect(res.status).toBe(409);
  });

  it('allows non-overlapping times on same room', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 2 });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({ roomId, date: '2026-04-01', startTime: '12:00', durationHours: 1 });
    expect(res.status).toBe(201);
  });

  it('enforces library 3-per-week quota', async () => {
    // Book 3 library seats across different seats
    const library = await testPrisma.building.findFirst({ where: { name: 'Library' } });
    const libRooms = await testPrisma.room.findMany({ where: { buildingId: library!.id }, take: 4 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ roomId: libRooms[i].id, date: '2026-04-01', startTime: '10:00', durationHours: 1 });
      expect(res.status).toBe(201);
    }

    // 4th should be rejected
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId: libRooms[3].id, date: '2026-04-01', startTime: '10:00', durationHours: 1 });
    expect(res.status).toBe(429);
  });
});

describe('GET /api/bookings/me', () => {
  it('returns only current user bookings', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 1 });

    const res = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings.length).toBe(1);

    // User 2 should see 0
    const res2 = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${token2}`);
    expect(res2.body.bookings.length).toBe(0);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  it('cancels own booking', async () => {
    const { body } = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 1 });
    const bookingId = body.booking.id;

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CANCELLED');
  });

  it('returns 403 for other user booking', async () => {
    const { body } = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId, date: '2026-04-01', startTime: '10:00', durationHours: 1 });
    const bookingId = body.booking.id;

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });
});
