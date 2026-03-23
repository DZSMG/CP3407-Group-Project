const Database = require('better-sqlite3');
const bcryptjs = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'campus_booking.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

// Clear existing data
db.exec(`
  DELETE FROM room_status;
  DELETE FROM bookings;
  DELETE FROM rooms;
  DELETE FROM buildings;
  DELETE FROM users;
`);

// Reset autoincrement counters
db.exec(`
  DELETE FROM sqlite_sequence WHERE name IN ('room_status','bookings','rooms','buildings','users');
`);

// 1. Insert buildings
const insertBuilding = db.prepare('INSERT INTO buildings (name, description) VALUES (?, ?)');
const buildings = [
  ['Block A', 'Business & Finance Hub'],
  ['Block B', 'IT & Engineering'],
  ['Block C', 'Main Lecture Block'],
  ['Block E', 'General Studies'],
  ['Library', 'Quiet Study & Research'],
];
for (const b of buildings) insertBuilding.run(...b);

// Get building IDs
const getBldg = db.prepare('SELECT id FROM buildings WHERE name = ?');
const bA = getBldg.get('Block A').id;
const bB = getBldg.get('Block B').id;
const bC = getBldg.get('Block C').id;
const bE = getBldg.get('Block E').id;
const bL = getBldg.get('Library').id;

// 2. Collect all rooms
const allRooms = [];

// Block A, Level 1
allRooms.push([bA, 'Level 1', 'A1-04', 'Classroom', 40]);
allRooms.push([bA, 'Level 1', 'A1-05', 'Classroom', 40]);
allRooms.push([bA, 'Level 1', 'A1-03', 'Finance Lab', 25]);

// Block A, Level 2
allRooms.push([bA, 'Level 2', 'A2-02', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-03', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-04', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-05', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-06', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-07', 'Classroom', 40]);
allRooms.push([bA, 'Level 2', 'A2-09', 'Computer Lab', 30]);

// Block B, Level 2
allRooms.push([bB, 'Level 2', 'B2-04', 'Computer Lab', 30]);
allRooms.push([bB, 'Level 2', 'B2-05', 'Computer Lab', 30]);
allRooms.push([bB, 'Level 2', 'B2-06', 'Computer Lab', 30]);
allRooms.push([bB, 'Level 2', 'B2-07', 'Classroom', 40]);

// Block B, Level 3
allRooms.push([bB, 'Level 3', 'B3-02', 'Classroom', 40]);
allRooms.push([bB, 'Level 3', 'B3-03', 'Classroom', 40]);
allRooms.push([bB, 'Level 3', 'B3-04', 'Classroom', 40]);
allRooms.push([bB, 'Level 3', 'B3-05', 'Classroom', 40]);
allRooms.push([bB, 'Level 3', 'B3-06', 'Classroom', 40]);
allRooms.push([bB, 'Level 3', 'B3-07', 'Classroom', 40]);

// Block C, Level 1
allRooms.push([bC, 'Level 1', 'C1-01', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-02', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-03', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-04', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-05', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-06', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-07', 'Classroom', 40]);
allRooms.push([bC, 'Level 1', 'C1-10', 'Consultation Room', 4]);
allRooms.push([bC, 'Level 1', 'C1-11', 'Consultation Room', 4]);
allRooms.push([bC, 'Level 1', 'C1-12', 'Consultation Room', 4]);
allRooms.push([bC, 'Level 1', 'C1-13', 'Consultation Room', 4]);

// Block C, Level 2
allRooms.push([bC, 'Level 2', 'C2-02', 'Classroom', 40]);
allRooms.push([bC, 'Level 2', 'C2-03', 'Classroom', 40]);
allRooms.push([bC, 'Level 2', 'C2-04', 'Classroom', 40]);
allRooms.push([bC, 'Level 2', 'C2-05', 'Classroom', 40]);
allRooms.push([bC, 'Level 2', 'C2-06', 'Classroom', 40]);
allRooms.push([bC, 'Level 2', 'C2-13', 'Lecture Theatre', 150]);
allRooms.push([bC, 'Level 2', 'C2-14', 'Lecture Theatre', 150]);
allRooms.push([bC, 'Level 2', 'C2-15', 'Lecture Theatre', 150]);

// Block C, Level 3
allRooms.push([bC, 'Level 3', 'C3-02', 'Classroom', 40]);
allRooms.push([bC, 'Level 3', 'C3-03', 'Classroom', 40]);
allRooms.push([bC, 'Level 3', 'C3-04', 'Classroom', 40]);
allRooms.push([bC, 'Level 3', 'C3-05', 'Classroom', 40]);

// Block C, Level 4
allRooms.push([bC, 'Level 4', 'C4-01', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-02', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-03', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-04', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-05', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-06', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-07', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-08', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-09', 'Classroom', 40]);
allRooms.push([bC, 'Level 4', 'C4-13', 'Lecture Theatre', 150]);
allRooms.push([bC, 'Level 4', 'C4-14', 'Lecture Theatre', 150]);
allRooms.push([bC, 'Level 4', 'C4-15', 'Lecture Theatre', 150]);

// Block E, Level 2
allRooms.push([bE, 'Level 2', 'E2-01', 'Classroom', 40]);
allRooms.push([bE, 'Level 2', 'E2-02', 'Classroom', 40]);
allRooms.push([bE, 'Level 2', 'E2-03', 'Classroom', 40]);
allRooms.push([bE, 'Level 2', 'E2-04A', 'Classroom', 40]);
allRooms.push([bE, 'Level 2', 'E2-04B', 'Classroom', 40]);

// Library, Level 1: seats 1-35
for (let i = 1; i <= 35; i++) {
  allRooms.push([bL, 'Level 1', `L1-Seat-${i}`, 'Library Seat', 1]);
}

// Library, Level 2: seats 1-78
for (let i = 1; i <= 78; i++) {
  allRooms.push([bL, 'Level 2', `L2-Seat-${i}`, 'Library Seat', 1]);
}

// Insert all rooms in a transaction
const insertRoom = db.prepare('INSERT INTO rooms (building_id, level, room_id, room_type, capacity) VALUES (?, ?, ?, ?, ?)');
const insertMany = db.transaction((rooms) => {
  for (const r of rooms) insertRoom.run(...r);
});
insertMany(allRooms);

// 3. Insert test users
// Student IDs: 8 digits starting with "1"
// Default passwords: birth date in ddmmyyyy format
const insertUser = db.prepare('INSERT INTO users (student_id, email, password_hash, role) VALUES (?, ?, ?, ?)');
const users = [
  ['14100001', 'student1@jcu.edu.sg', bcryptjs.hashSync('01011990', 10), 'student'],
  ['14100002', 'student2@jcu.edu.sg', bcryptjs.hashSync('02021992', 10), 'student'],
  ['st0001',   'admin@jcu.edu.sg',    bcryptjs.hashSync('03031985', 10), 'admin'],
];
for (const u of users) insertUser.run(...u);

// 4. Create room_status for every room
db.exec(`INSERT INTO room_status (room_id, is_occupied) SELECT id, 0 FROM rooms`);

// Summary
const bCount = db.prepare('SELECT COUNT(*) as c FROM buildings').get().c;
const rCount = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
const uCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const sCount = db.prepare('SELECT COUNT(*) as c FROM room_status').get().c;

db.close();
console.log(`Seeded: ${bCount} buildings, ${rCount} rooms, ${uCount} users, ${sCount} room_status records`);
