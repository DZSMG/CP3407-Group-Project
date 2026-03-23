const express = require('express');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'jcu-dev-secret';

// Open SQLite DB
const db = new Database(path.join(__dirname, 'database', 'campus_booking.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5500', 'http://localhost:5500', 'null'] }));
app.use(express.json());

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper: add hours to HH:MM time string
function addHours(time, hours) {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + hours * 60;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

// Helper: get Monday-Sunday of a given date string (YYYY-MM-DD)
function getWeekBounds(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const diffToMon = (day === 0) ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => dt.toISOString().split('T')[0];
  return { monday: fmt(mon), sunday: fmt(sun) };
}

// ===== AUTH ROUTES =====

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password) return res.status(400).json({ error: 'studentId and password required' });

  const user = db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId);
  if (!user || !bcryptjs.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid student ID or password' });
  }

  const token = jwt.sign(
    { userId: user.id, studentId: user.student_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, studentId: user.student_id, email: user.email, role: user.role } });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { studentId, email, password } = req.body;
  if (!studentId || !password) return res.status(400).json({ error: 'studentId and password required' });

  // Student IDs: 8 digits starting with "1" (e.g. 14123456)
  // Staff/admin IDs: st followed by 4 digits (e.g. st0001)
  const studentPattern = /^1\d{7}$/;
  const staffPattern = /^st\d{4}$/i;
  if (!studentPattern.test(studentId) && !staffPattern.test(studentId)) {
    return res.status(400).json({ error: 'Invalid ID format. Students: 8 digits starting with 1 (e.g. 14123456). Staff: st followed by 4 digits.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE student_id = ?').get(studentId);
  if (existing) return res.status(409).json({ error: 'Student ID already registered' });

  const role = staffPattern.test(studentId) ? 'staff' : 'student';
  const passwordHash = bcryptjs.hashSync(password, 10);

  const result = db.prepare('INSERT INTO users (student_id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(studentId, email || null, passwordHash, role);

  const token = jwt.sign(
    { userId: result.lastInsertRowid, studentId, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.status(201).json({ token, user: { id: result.lastInsertRowid, studentId, email: email || null, role } });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, student_id, email, role, status, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ===== BUILDING & ROOM ROUTES =====

// GET /api/buildings
app.get('/api/buildings', (req, res) => {
  const buildings = db.prepare(`
    SELECT b.*, COUNT(r.id) as room_count
    FROM buildings b
    LEFT JOIN rooms r ON r.building_id = b.id
    GROUP BY b.id
    ORDER BY b.id
  `).all();
  res.json(buildings);
});

// GET /api/rooms?buildingId=X&level=Y&type=Z
app.get('/api/rooms', (req, res) => {
  const { buildingId, level, type } = req.query;
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });

  let sql = `SELECT r.*, b.name as building_name, b.description as building_desc
             FROM rooms r JOIN buildings b ON r.building_id = b.id
             WHERE r.building_id = ?`;
  const params = [buildingId];

  if (level) { sql += ' AND r.level = ?'; params.push(level); }
  if (type && type !== 'All') { sql += ' AND r.room_type = ?'; params.push(type); }
  sql += ' ORDER BY r.room_id';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/rooms/availability?buildingId=X&level=Y&date=...&startTime=...&duration=N
app.get('/api/rooms/availability', (req, res) => {
  const { buildingId, level, date, startTime, duration } = req.query;
  if (!buildingId || !level || !date || !startTime || !duration) {
    return res.status(400).json({ error: 'buildingId, level, date, startTime, duration are required' });
  }

  const durationHours = parseInt(duration);
  const endTime = addHours(startTime, durationHours);

  const rooms = db.prepare(`
    SELECT r.*, b.name as building_name
    FROM rooms r JOIN buildings b ON r.building_id = b.id
    WHERE r.building_id = ? AND r.level = ? AND r.is_active = 1
    ORDER BY r.room_id
  `).all(buildingId, level);

  const checkConflict = db.prepare(`
    SELECT COUNT(*) as conflicts FROM bookings
    WHERE room_id = ? AND booking_date = ? AND status = 'confirmed'
    AND start_time < ? AND end_time > ?
  `);

  const result = rooms.map(room => {
    const { conflicts } = checkConflict.get(room.id, date, endTime, startTime);
    return { ...room, isAvailable: conflicts === 0 };
  });

  res.json(result);
});

// ===== BOOKING ROUTES =====

// POST /api/bookings
app.post('/api/bookings', authMiddleware, (req, res) => {
  const { roomId, date, startTime, durationHours, title, remarks } = req.body;

  if (!roomId || !date || !startTime || !durationHours) {
    return res.status(400).json({ error: 'roomId, date, startTime, durationHours are required' });
  }
  if (![1, 2, 3].includes(parseInt(durationHours))) {
    return res.status(400).json({ error: 'durationHours must be 1, 2, or 3' });
  }

  const endTime = addHours(startTime, parseInt(durationHours));

  // Check conflict
  const { conflicts } = db.prepare(`
    SELECT COUNT(*) as conflicts FROM bookings
    WHERE room_id = ? AND booking_date = ? AND status = 'confirmed'
    AND start_time < ? AND end_time > ?
  `).get(roomId, date, endTime, startTime);

  if (conflicts > 0) return res.status(409).json({ error: 'Time slot already booked' });

  // Check library weekly quota
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (room && room.room_type === 'Library Seat') {
    const { monday, sunday } = getWeekBounds(date);
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = ? AND r.room_type = 'Library Seat' AND b.status = 'confirmed'
      AND b.booking_date BETWEEN ? AND ?
    `).get(req.user.userId, monday, sunday);
    if (count >= 3) return res.status(429).json({ error: 'Library weekly quota reached (max 3 per week)' });
  }

  // Generate a unique booking_ref (retry once on collision)
  function genRef() { return 'BK-' + String(Math.floor(10000 + Math.random() * 90000)); }
  let bookingRef = genRef();
  if (db.prepare('SELECT id FROM bookings WHERE booking_ref = ?').get(bookingRef)) {
    bookingRef = genRef();
  }

  const result = db.prepare(`
    INSERT INTO bookings (booking_ref, user_id, room_id, booking_date, start_time, end_time, duration_hours, booking_title, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bookingRef, req.user.userId, roomId, date, startTime, endTime, parseInt(durationHours), title || null, remarks || null);

  const booking = db.prepare(`
    SELECT b.*, r.room_id as room_name, r.room_type, r.level, bl.name as building_name
    FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(booking);
});

// GET /api/bookings/me
app.get('/api/bookings/me', authMiddleware, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, r.room_id as room_name, r.room_type, r.level, bl.name as building_name
    FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id
    WHERE b.user_id = ?
    ORDER BY b.booking_date DESC, b.start_time DESC
  `).all(req.user.userId);
  res.json(bookings);
});

// PATCH /api/bookings/:id/cancel
app.patch('/api/bookings/:id/cancel', authMiddleware, (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.user_id !== req.user.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorised to cancel this booking' });
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  res.json(updated);
});

// ===== HEALTH CHECK =====

app.get('/api/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), rooms: count });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
