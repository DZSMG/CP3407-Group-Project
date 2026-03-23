# -*- coding: utf-8 -*-
"""
Prompt 5 - Verify the demo database is correct and ready for demo day.

Run:  python backend/database/verify_demo_db.py
"""

import sqlite3
import json
import os
import sys

DB_PATH   = os.path.join(os.path.dirname(__file__), "campus_booking.db")
JSON_PATH = os.path.join(os.path.dirname(__file__), "demo_passwords.json")
CSV_PATH  = os.path.join(os.path.dirname(__file__), "demo_users_credentials.csv")

print("=" * 60)
print("  JCU Demo Database Verification")
print("=" * 60)

errors = 0

# ── File existence ────────────────────────────────────────────────────────
for fpath, label in [(DB_PATH, "SQLite DB"), (JSON_PATH, "Passwords JSON"), (CSV_PATH, "Credentials CSV")]:
    if os.path.exists(fpath):
        size_kb = os.path.getsize(fpath) / 1024
        print(f"  [OK]   {label}: {os.path.basename(fpath)} ({size_kb:.0f} KB)")
    else:
        print(f"  [FAIL] {label}: {fpath} NOT FOUND")
        errors += 1

if errors > 0:
    print(f"\n  {errors} file(s) missing. Run generate_demo_users.py first.")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur  = conn.cursor()

# ── User counts ────────────────────────────────────────────────────────────
print("\n--- User Counts ---")
cur.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role")
roles = {row["role"]: row["count"] for row in cur.fetchall()}
total = sum(roles.values())

checks = [
    ("Total users", total,                  2500, total >= 2500),
    ("Students",    roles.get("student", 0), 2400, roles.get("student", 0) >= 2400),
    ("Staff",       roles.get("staff", 0),    80,  roles.get("staff", 0) >= 80),
    ("Admins",      roles.get("admin", 0),    20,  roles.get("admin", 0) >= 20),
]
for label, actual, expected, ok in checks:
    status = "OK" if ok else "FAIL"
    print(f"  [{status}]   {label}: {actual} (expected >= {expected})")
    if not ok:
        errors += 1

# ── Status distribution ────────────────────────────────────────────────────
print("\n--- Status Distribution ---")
cur.execute("SELECT status, COUNT(*) as count FROM users GROUP BY status ORDER BY status")
for row in cur.fetchall():
    print(f"  {row['status']}: {row['count']}")

# ── ID format validation ───────────────────────────────────────────────────
print("\n--- ID Format Validation ---")
cur.execute("SELECT student_id, role FROM users")
bad = 0
for row in cur.fetchall():
    sid, role = row["student_id"], row["role"]
    if role == "student" and not (sid.startswith("jc") and len(sid) == 8):
        bad += 1
    elif role == "staff" and not (sid.startswith("st") and len(sid) == 6):
        bad += 1
    elif role == "admin" and not (sid.startswith("ad") and len(sid) == 6):
        bad += 1
if bad == 0:
    print(f"  [OK]   All {total} student IDs match expected format")
else:
    print(f"  [FAIL] {bad} IDs have wrong format")
    errors += 1

# ── Uniqueness ─────────────────────────────────────────────────────────────
print("\n--- Uniqueness Check ---")
for col, label in [("student_id", "student IDs"), ("email", "emails")]:
    cur.execute(f"SELECT {col}, COUNT(*) as c FROM users GROUP BY {col} HAVING c > 1")
    dupes = cur.fetchall()
    if not dupes:
        print(f"  [OK]   All {label} are unique")
    else:
        print(f"  [FAIL] {len(dupes)} duplicate {label} found")
        errors += 1

# ── Password hashes ─────────────────────────────────────────────────────────
print("\n--- Password Hash Check ---")
cur.execute("SELECT COUNT(*) as c FROM users WHERE password_hash IS NULL OR password_hash = ''")
empty = cur.fetchone()["c"]
if empty == 0:
    print("  [OK]   All users have password hashes")
else:
    print(f"  [FAIL] {empty} users missing password hash")
    errors += 1

# ── JSON file ──────────────────────────────────────────────────────────────
print("\n--- JSON Password File Check ---")
with open(JSON_PATH, encoding="utf-8") as f:
    passwords = json.load(f)
print(f"  Passwords in JSON: {len(passwords)}")
missing = sum(
    1 for sid in list(passwords.keys())[:10]
    if not cur.execute("SELECT id FROM users WHERE student_id = ?", (sid,)).fetchone()
)
if missing == 0:
    print("  [OK]   Sample passwords match DB users")
else:
    print(f"  [FAIL] {missing} JSON entries have no matching user in DB")
    errors += 1

# ── Programs ───────────────────────────────────────────────────────────────
print("\n--- Program Distribution ---")
cur.execute(
    "SELECT program, COUNT(*) as c FROM users "
    "WHERE role='student' AND program IS NOT NULL "
    "GROUP BY program ORDER BY c DESC"
)
for row in cur.fetchall():
    print(f"  {row['program']}: {row['c']}")

# ── Sample credentials ─────────────────────────────────────────────────────
print("\n--- Sample Demo Credentials ---")
samples = [
    ("jc100001", "student"),
    ("jc100050", "student"),
    ("st0001",   "staff"),
    ("ad0001",   "admin"),
]
for sid, expected_role in samples:
    cur.execute(
        "SELECT student_id, full_name, email, role FROM users WHERE student_id = ?", (sid,)
    )
    user = cur.fetchone()
    if user:
        pw = passwords.get(sid, "???")
        print(f"  {user['student_id']} | {user['full_name']} | {user['email']} | pw: {pw} | {user['role']}")
    else:
        print(f"  [MISSING] {sid}")
        errors += 1

conn.close()

print(f"\n{'=' * 60}")
if errors == 0:
    print("  ALL CHECKS PASSED - Database ready for demo!")
else:
    print(f"  {errors} CHECK(S) FAILED - Fix issues above")
print(f"{'=' * 60}\n")

sys.exit(0 if errors == 0 else 1)
