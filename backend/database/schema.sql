-- Table 1: buildings
CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- Table 2: rooms
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL UNIQUE,
    building_id INTEGER NOT NULL,
    level TEXT NOT NULL,
    room_type TEXT NOT NULL CHECK(room_type IN ('Classroom','Computer Lab','Finance Lab','Consultation Room','Lecture Theatre','Library Seat')),
    capacity INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (building_id) REFERENCES buildings(id)
);

-- Table 3: users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','staff','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pre_arrival','suspended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_hours INTEGER NOT NULL CHECK(duration_hours BETWEEN 1 AND 3),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','completed')),
    booking_title TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Table 5: room_status (live tracking)
CREATE TABLE IF NOT EXISTS room_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL UNIQUE,
    is_occupied INTEGER NOT NULL DEFAULT 0,
    current_booking_id INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (current_booking_id) REFERENCES bookings(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_building_level ON rooms(building_id, level);
