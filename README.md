# CP3407-Group-Project
Group Project Repo for CP3407 Advanced Software Engineering
# Campus Online Appointment Booking System

## Project Overview

This project is a **web-based Campus Online Appointment Booking System** designed to centralize and improve student access to various campus services.

The platform's primary goal is to provide a single, easy-to-use online solution for students to conveniently book and reserve campus resources, reducing manual processes and improving efficiency for both students and service providers. This enhances the overall student experience and supports better resource management.

## Key Goals

The system aims to allow students to:
*   Book **self-study rooms**.
*   Reserve **library seats**.


## Project Members

| Role | Name |
| :--- | :--- |
| **Team Member** | [Minzhi Liu](https://github.com/DZSMG)  |
| **Team Member** | [Jinyu Xie](https://github.com/xiejinyu-jcu) |
| **Team Member** | [Jun Bin Yap](https://github.com/Junbinyap) |
| **Team Member** | [Shen Chen](https://github.com/chenshen0623) |

---

## Running the Program

### Quick Start (Recommended)

A Python launcher script handles everything automatically — dependencies, database setup, server start, and browser open.

**Requirements:** [Python 3](https://www.python.org/) and [Node.js v18+](https://nodejs.org/) must be installed.

```bash
python start.py
```

The script will:
1. Verify Node.js is installed
2. Run `npm install` if `node_modules` is missing
3. Create the SQLite database schema if the `.db` file does not exist
4. Seed 173 rooms and 3 test users if the database is empty
5. Start the API server on `http://localhost:3001`
6. Wait until the server is ready, then open the frontend in your default browser

Press **Ctrl+C** in the terminal to stop the server.

### Manual Setup (Alternative)

Run the following from the `backend/` folder:

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create schema (first time only)
node database/init-db.js

# 3. Seed rooms and users (first time, or to reset all data)
node database/seed.js
# Expected: Seeded: 5 buildings, 173 rooms, 3 users, 173 room_status records

# 4. Start the API server
node server.js
# Server runs on http://localhost:3001

# 5. Confirm the server is up
curl http://localhost:3001/api/health
# {"status":"ok","rooms":173,...}

# 6. Open the frontend
# Open "Search study room/index.html" directly in a browser
```

#### npm Scripts (shorthand)

```bash
npm start        # start the API server
npm run seed     # re-seed the database (resets all data)
npm run init     # re-create the schema only
```

### Project Structure

```
CP3407-Group-Project/
├── start.py                        # Python launcher (run this)
├── backend/
│   ├── server.js                   # Express API server (port 3001)
│   ├── run-tests.js                # Automated test suite (67 tests)
│   ├── package.json
│   └── database/
│       ├── schema.sql              # Table definitions
│       ├── init-db.js              # Creates schema from schema.sql
│       ├── seed.js                 # Populates rooms and test users
│       └── campus_booking.db      # SQLite database file (auto-created)
└── Search study room/
    ├── index.html                  # Frontend entry point
    ├── script.js                   # UI logic and API calls
    ├── api.js                      # HTTP client (talks to backend)
    └── styles.css                  # Stylesheet
```

### Test Accounts

| Student ID | Password   | Role    | Notes                    |
| :--------- | :--------- | :------ | :----------------------- |
| `14100001` | `01011990` | student | Default test student 1   |
| `14100002` | `02021992` | student | Default test student 2   |
| `st0001`   | `03031985` | admin   | Default admin/staff user |

> **Password format:** the default password is the user's birth date in `ddmmyyyy` format.
>
> **Student ID format:** 8 digits starting with `1` (e.g. `14123456`). Staff IDs use `st` followed by 4 digits.

### Running the Test Suite

```bash
cd backend
node run-tests.js
# Expected: 67 passed, 0 failed
```

---

## Work Progress

### Completed

| # | Area | Feature | Details |
| :- | :--- | :------ | :------ |
| 1 | Database | SQLite schema | 5 tables: `buildings`, `rooms`, `users`, `bookings`, `room_status` with indexes |
| 2 | Database | Seed data | 173 rooms across 5 buildings (Block A/B/C/E + Library), 3 test users |
| 3 | Backend | REST API server | Express.js on port 3001 — health, buildings, rooms, bookings endpoints |
| 4 | Backend | Authentication | Register, login, `/me` with JWT tokens and bcrypt password hashing |
| 5 | Backend | Student ID validation | 8-digit IDs starting with `1`; staff IDs `st` + 4 digits; old formats rejected |
| 6 | Backend | Default passwords | Account password defaults to birth date in `ddmmyyyy` format |
| 7 | Backend | Room availability | Per-slot conflict detection; returns `isAvailable` for every room on a floor |
| 8 | Backend | Booking rules | Max 3 hours per booking; library weekly quota capped at 3 bookings per user |
| 9 | Backend | Double-booking prevention | Overlap query returns HTTP 409 on any confirmed time conflict |
| 10 | Backend | Cancel booking | Users cancel own bookings only (HTTP 403 otherwise); slot reopens immediately |
| 11 | Frontend | Multi-step booking UI | Building → floor → date/time/duration → room selection → login → confirm |
| 12 | Frontend | Library seat map | Visual grid for Level 1 (35 seats) and Level 2 (78 seats) with live availability |
| 13 | Frontend | Auth UI | Login modal, session stored in `sessionStorage`, header shows logged-in user ID |
| 14 | Frontend | API client (`api.js`) | Centralised HTTP client with token management and error handling |
| 15 | Tooling | Python launcher (`start.py`) | One-command startup: checks deps, inits DB, starts server, opens browser |
| 16 | Tooling | Automated test suite | 67 end-to-end API tests: auth, rooms, bookings, quotas, cancellation, edge cases |

### In Progress / Planned

| # | Feature | Priority | Notes |
| :- | :------ | :------- | :---- |
| 1 | Admin dashboard | High | View and cancel any booking; requires role-gated route |
| 2 | Password change | Medium | Allow users to update from default ddmmyyyy to a custom password |
| 3 | Booking time restrictions | Medium | Enforce campus opening hours; reject bookings outside allowed slots |
| 4 | Email confirmation | Low | Send booking reference to student email on confirm and cancel |
| 5 | Pre-arrival account enforcement | Low | Block bookings for accounts with `status = pre_arrival` |
