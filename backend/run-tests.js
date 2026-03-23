/**
 * Comprehensive end-to-end test for the JCU Campus Booking API
 */
const http = require('http');

const BASE = 'http://localhost:3001/api';
let passed = 0;
let failed = 0;
let token1, token2, bookingId1, bookingId2;

function request(method, path, body, auth) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = 'Bearer ' + auth;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  const today = new Date().toISOString().split('T')[0];

  // Reset test data for clean slate
  const Database = require('better-sqlite3');
  const db = new Database('./database/campus_booking.db');
  db.exec("DELETE FROM bookings");
  db.exec("DELETE FROM sqlite_sequence WHERE name='bookings'");
  db.exec("DELETE FROM users WHERE student_id = '19990001'");
  db.close();
  console.log('Cleaned up test data\n');

  // ─── 1. HEALTH CHECK ───────────────────────────────────────────────────
  console.log('=== 1. HEALTH CHECK ===');
  const h = await request('GET', '/health');
  assert('status ok', h.body.status === 'ok');
  assert('returns 173 rooms', h.body.rooms === 173, `got ${h.body.rooms}`);
  assert('has timestamp', typeof h.body.timestamp === 'string');

  // ─── 2. BUILDINGS ──────────────────────────────────────────────────────
  console.log('\n=== 2. BUILDINGS ===');
  const bldgs = await request('GET', '/buildings');
  assert('returns array', Array.isArray(bldgs.body), typeof bldgs.body);
  assert('5 buildings', bldgs.body.length === 5, `got ${bldgs.body.length}`);
  assert('has room_count', bldgs.body[0].room_count !== undefined);
  const bldgNames = bldgs.body.map(b => b.name);
  assert('Block A present', bldgNames.includes('Block A'));
  assert('Library present', bldgNames.includes('Library'));

  // ─── 3. AUTH - REGISTER ────────────────────────────────────────────────
  console.log('\n=== 3. AUTH - REGISTER ===');
  // Valid 8-digit student ID starting with "1", password = ddmmyyyy
  const reg = await request('POST', '/auth/register', { studentId: '19990001', email: 'test@jcu.edu.sg', password: '15061999' });
  assert('register returns 201', reg.status === 201, `got ${reg.status}: ${JSON.stringify(reg.body)}`);
  assert('register has token', typeof reg.body.token === 'string');
  assert('register has user.studentId', reg.body.user?.studentId === '19990001');
  assert('register assigns student role', reg.body.user?.role === 'student');

  const regDup = await request('POST', '/auth/register', { studentId: '19990001', password: '15061999' });
  assert('duplicate register returns 409', regDup.status === 409, `got ${regDup.status}`);

  // Invalid: old jc-prefix format
  const regOldFormat = await request('POST', '/auth/register', { studentId: 'jc100001', password: '01011990' });
  assert('old jc-prefix format returns 400', regOldFormat.status === 400, `got ${regOldFormat.status}`);

  // Invalid: does not start with "1"
  const regBadPrefix = await request('POST', '/auth/register', { studentId: '24100001', password: '01011990' });
  assert('ID not starting with 1 returns 400', regBadPrefix.status === 400, `got ${regBadPrefix.status}`);

  // Invalid: too short (7 digits)
  const regShort = await request('POST', '/auth/register', { studentId: '1234567', password: '01011990' });
  assert('7-digit ID returns 400', regShort.status === 400, `got ${regShort.status}`);

  // Invalid: too long (9 digits)
  const regLong = await request('POST', '/auth/register', { studentId: '123456789', password: '01011990' });
  assert('9-digit ID returns 400', regLong.status === 400, `got ${regLong.status}`);

  // Invalid: generic bad format
  const regBadId = await request('POST', '/auth/register', { studentId: 'badformat', password: 'x' });
  assert('non-numeric ID returns 400', regBadId.status === 400, `got ${regBadId.status}`);

  // ─── 4. AUTH - LOGIN ───────────────────────────────────────────────────
  console.log('\n=== 4. AUTH - LOGIN ===');
  // Seed users: 14100001 / 01011990,  14100002 / 02021992
  const login1 = await request('POST', '/auth/login', { studentId: '14100001', password: '01011990' });
  assert('login returns 200', login1.status === 200, `got ${login1.status}: ${JSON.stringify(login1.body)}`);
  assert('login has token', typeof login1.body.token === 'string');
  assert('login user has studentId', login1.body.user?.studentId === '14100001');
  token1 = login1.body.token;

  const login2 = await request('POST', '/auth/login', { studentId: '14100002', password: '02021992' });
  assert('user2 login ok', login2.status === 200, `got ${login2.status}`);
  token2 = login2.body.token;

  // Admin login (staff ID format)
  const loginAdmin = await request('POST', '/auth/login', { studentId: 'st0001', password: '03031985' });
  assert('admin login ok', loginAdmin.status === 200, `got ${loginAdmin.status}`);

  const badLogin = await request('POST', '/auth/login', { studentId: '14100001', password: 'wrongpass' });
  assert('wrong password returns 401', badLogin.status === 401, `got ${badLogin.status}`);

  const noUser = await request('POST', '/auth/login', { studentId: '10000000', password: 'x' });
  assert('non-existent user returns 401', noUser.status === 401, `got ${noUser.status}`);

  // ─── 5. AUTH - /ME ─────────────────────────────────────────────────────
  console.log('\n=== 5. AUTH - /ME ===');
  const me = await request('GET', '/auth/me', null, token1);
  assert('/me returns 200', me.status === 200, `got ${me.status}`);
  assert('/me no password_hash', me.body.password_hash === undefined);
  assert('/me has student_id', me.body.student_id === '14100001', `got ${me.body.student_id}`);

  const meNoAuth = await request('GET', '/auth/me');
  assert('/me without token returns 401', meNoAuth.status === 401, `got ${meNoAuth.status}`);

  // ─── 6. ROOMS AVAILABILITY ─────────────────────────────────────────────
  console.log('\n=== 6. ROOMS AVAILABILITY ===');
  const blockAId = bldgs.body.find(b => b.name === 'Block A').id;
  const libId = bldgs.body.find(b => b.name === 'Library').id;

  const avail = await request('GET', `/rooms/availability?buildingId=${blockAId}&level=Level%201&date=${today}&startTime=10:00&duration=1`);
  assert('availability returns array', Array.isArray(avail.body), typeof avail.body);
  assert('Block A Level 1 has 3 rooms', avail.body.length === 3, `got ${avail.body.length}`);
  assert('rooms have isAvailable', avail.body[0].isAvailable !== undefined);
  assert('all rooms initially available', avail.body.every(r => r.isAvailable === true));

  const availMissing = await request('GET', `/rooms/availability?buildingId=${blockAId}&level=Level%201&date=${today}`);
  assert('missing params returns 400', availMissing.status === 400, `got ${availMissing.status}`);

  const libAvail = await request('GET', `/rooms/availability?buildingId=${libId}&level=Level%201&date=${today}&startTime=10:00&duration=1`);
  assert('Library Level 1 has 35 seats', libAvail.body.length === 35, `got ${libAvail.body.length}`);
  assert('library seats have room_type=Library Seat', libAvail.body[0].room_type === 'Library Seat');

  // ─── 7. BOOKINGS - CREATE ──────────────────────────────────────────────
  console.log('\n=== 7. BOOKINGS - CREATE ===');
  const firstRoom = avail.body[0];
  const bk = await request('POST', '/bookings', {
    roomId: firstRoom.id, date: today, startTime: '10:00', durationHours: 2
  }, token1);
  assert('create booking returns 201', bk.status === 201, `got ${bk.status}: ${JSON.stringify(bk.body)}`);
  assert('has booking_ref', /^BK-\d{5}$/.test(bk.body.booking_ref), `got ${bk.body.booking_ref}`);
  assert('end_time is 12:00', bk.body.end_time === '12:00', `got ${bk.body.end_time}`);
  assert('status is confirmed', bk.body.status === 'confirmed');
  assert('has room_name', typeof bk.body.room_name === 'string');
  assert('has building_name', typeof bk.body.building_name === 'string');
  bookingId1 = bk.body.id;

  const bkNoAuth = await request('POST', '/bookings', { roomId: firstRoom.id, date: today, startTime: '14:00', durationHours: 1 });
  assert('booking without auth returns 401', bkNoAuth.status === 401, `got ${bkNoAuth.status}`);

  const bkBadDur = await request('POST', '/bookings', { roomId: firstRoom.id, date: today, startTime: '14:00', durationHours: 5 }, token1);
  assert('invalid duration returns 400', bkBadDur.status === 400, `got ${bkBadDur.status}`);

  // ─── 8. DOUBLE-BOOKING ─────────────────────────────────────────────────
  console.log('\n=== 8. DOUBLE-BOOKING ===');
  // Exact same slot
  const dbl1 = await request('POST', '/bookings', { roomId: firstRoom.id, date: today, startTime: '10:00', durationHours: 1 }, token2);
  assert('exact overlap returns 409', dbl1.status === 409, `got ${dbl1.status}`);

  // Partial overlap (starts inside existing 10:00-12:00)
  const dbl2 = await request('POST', '/bookings', { roomId: firstRoom.id, date: today, startTime: '11:00', durationHours: 2 }, token2);
  assert('partial overlap returns 409', dbl2.status === 409, `got ${dbl2.status}`);

  // Adjacent slot (no overlap: 12:00-13:00 after 10:00-12:00)
  const adj = await request('POST', '/bookings', { roomId: firstRoom.id, date: today, startTime: '12:00', durationHours: 1 }, token2);
  assert('adjacent slot allowed (201)', adj.status === 201, `got ${adj.status}`);
  bookingId2 = adj.body.id;

  // ─── 9. AVAILABILITY REFLECTS BOOKING ──────────────────────────────────
  console.log('\n=== 9. AVAILABILITY REFLECTS BOOKING ===');
  const availAfter = await request('GET', `/rooms/availability?buildingId=${blockAId}&level=Level%201&date=${today}&startTime=10:00&duration=1`);
  const bookedRoom = availAfter.body.find(r => r.id === firstRoom.id);
  assert('booked room shows isAvailable=false', bookedRoom.isAvailable === false, `got ${bookedRoom.isAvailable}`);
  const otherRoom = availAfter.body.find(r => r.id !== firstRoom.id);
  assert('other room still available', otherRoom.isAvailable === true);

  // ─── 10. MY BOOKINGS ───────────────────────────────────────────────────
  console.log('\n=== 10. MY BOOKINGS ===');
  const myBk = await request('GET', '/bookings/me', null, token1);
  assert('/bookings/me returns array', Array.isArray(myBk.body));
  assert('user1 has 1 booking', myBk.body.length === 1, `got ${myBk.body.length}`);
  assert('booking has booking_date', myBk.body[0].booking_date === today);
  assert('booking has level', typeof myBk.body[0].level === 'string');
  assert('booking has building_name', typeof myBk.body[0].building_name === 'string');

  const myBkNoAuth = await request('GET', '/bookings/me');
  assert('/bookings/me without auth returns 401', myBkNoAuth.status === 401);

  // ─── 11. CANCEL BOOKING ────────────────────────────────────────────────
  console.log('\n=== 11. CANCEL BOOKING ===');
  // Try cancelling someone else's booking
  const cancelOther = await request('PATCH', `/bookings/${bookingId2}/cancel`, null, token1);
  assert("cannot cancel another user's booking (403)", cancelOther.status === 403, `got ${cancelOther.status}`);

  // Cancel own booking
  const cancel1 = await request('PATCH', `/bookings/${bookingId1}/cancel`, null, token1);
  assert('cancel own booking returns 200', cancel1.status === 200, `got ${cancel1.status}`);
  assert('cancelled status is cancelled', cancel1.body.status === 'cancelled', `got ${cancel1.body.status}`);

  // After cancel, room should be available again
  const availAfterCancel = await request('GET', `/rooms/availability?buildingId=${blockAId}&level=Level%201&date=${today}&startTime=10:00&duration=1`);
  const roomAfterCancel = availAfterCancel.body.find(r => r.id === firstRoom.id);
  assert('room available again after cancel', roomAfterCancel.isAvailable === true, `got ${roomAfterCancel.isAvailable}`);

  // ─── 12. LIBRARY WEEKLY QUOTA ──────────────────────────────────────────
  console.log('\n=== 12. LIBRARY WEEKLY QUOTA ===');
  const libSeats = libAvail.body.filter(r => !r.room_id.match(/^L1-Seat-[1-5]$/)); // skip unbookable
  // Book 3 library seats
  const times = ['08:00', '09:00', '10:00'];
  for (let i = 0; i < 3; i++) {
    const r = await request('POST', '/bookings', {
      roomId: libSeats[i].id, date: today, startTime: times[i], durationHours: 1
    }, token1);
    assert(`library booking ${i+1}/3 succeeds`, r.status === 201, `got ${r.status}: ${JSON.stringify(r.body)}`);
  }
  // 4th should be rejected
  const quota = await request('POST', '/bookings', {
    roomId: libSeats[3].id, date: today, startTime: '11:00', durationHours: 1
  }, token1);
  assert('4th library booking returns 429', quota.status === 429, `got ${quota.status}: ${JSON.stringify(quota.body)}`);

  // ─── 13. ROOMS ENDPOINT ────────────────────────────────────────────────
  console.log('\n=== 13. ROOMS ENDPOINT ===');
  const rooms = await request('GET', `/rooms?buildingId=${blockAId}&level=Level%201`);
  assert('/rooms returns array', Array.isArray(rooms.body));
  assert('/rooms level filter works', rooms.body.every(r => r.level === 'Level 1'), `got mixed levels`);

  const roomsType = await request('GET', `/rooms?buildingId=${blockAId}&type=Computer%20Lab`);
  assert('/rooms type filter works', roomsType.body.every(r => r.room_type === 'Computer Lab'), `got ${roomsType.body.map(r=>r.room_type)}`);

  const roomsNoBldg = await request('GET', `/rooms`);
  assert('/rooms without buildingId returns 400', roomsNoBldg.status === 400, `got ${roomsNoBldg.status}`);

  // ─── SUMMARY ───────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('ALL TESTS PASSED ✓');
  else console.log(`${failed} TEST(S) FAILED ✗`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
