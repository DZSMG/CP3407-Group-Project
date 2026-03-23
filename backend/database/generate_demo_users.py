# -*- coding: utf-8 -*-
"""
Prompt 1 - Generate randomized demo user database (2500 entries).
FOR DEMO PURPOSES ONLY. No real personal information.

Run:  cd backend/database && python generate_demo_users.py
Requires: pip install bcrypt
"""

import sqlite3
import bcrypt
import random
import string
import csv
import json
import os

DB_PATH    = os.path.join(os.path.dirname(__file__), "campus_booking.db")
CSV_PATH   = os.path.join(os.path.dirname(__file__), "demo_users_credentials.csv")
JSON_PATH  = os.path.join(os.path.dirname(__file__), "demo_passwords.json")

# ── Name pools ──────────────────────────────────────────────────────────────
FIRST_NAMES = [
    "Wei", "Jia", "Min", "Xin", "Yu", "Zhi", "Hao", "Yan", "Lin", "Chen",
    "Siti", "Ahmad", "Nur", "Muhammad", "Aisha", "Raj", "Priya", "Arjun", "Mei", "Ling",
    "James", "Sarah", "Michael", "Emma", "Daniel", "Olivia", "Ethan", "Sophie", "Lucas", "Chloe",
    "Kai", "Riko", "Yuki", "Haruto", "Sakura", "Jun", "Soo", "Hyun", "Jin", "Tao",
    "Ava", "Noah", "Liam", "Isla", "Leo", "Mia", "Ryan", "Zara", "Adam", "Nina",
    "Wen", "Fang", "Qiang", "Hui", "Bao", "Cheng", "Dong", "Feng", "Gang", "Hong",
    "Kumar", "Devi", "Ravi", "Ananya", "Vikram", "Lakshmi", "Suresh", "Kavitha", "Deepa", "Arun",
    "Ben", "Alice", "Tom", "Grace", "Jack", "Emily", "Sam", "Hannah", "Alex", "Lily",
]

LAST_NAMES = [
    "Tan", "Lim", "Lee", "Ng", "Wong", "Chen", "Goh", "Chua", "Teo", "Ong",
    "Wang", "Zhang", "Liu", "Yang", "Huang", "Wu", "Zhou", "Xu", "Sun", "Ma",
    "Kumar", "Singh", "Sharma", "Patel", "Gupta", "Ali", "Rahman", "Hassan", "Ibrahim", "Malik",
    "Smith", "Johnson", "Brown", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
    "Kim", "Park", "Choi", "Jung", "Kang", "Yoon", "Jang", "Han", "Seo", "Kwon",
    "Nakamura", "Tanaka", "Watanabe", "Yamamoto", "Suzuki", "Takahashi", "Sato", "Ito", "Kobayashi", "Saito",
]

PROGRAMS = [
    "Bachelor of Information Technology",
    "Bachelor of Business",
    "Bachelor of Psychology",
    "Bachelor of Environmental Science",
    "Bachelor of Aquaculture Science",
    "Master of Information Technology",
    "Master of Business Administration",
    "Master of Data Science",
    "Diploma in Information Technology",
    "Bachelor of Education",
    "Bachelor of Hospitality Management",
    "Bachelor of Commerce",
]

MASTER_DIPLOMA = {"Master of Information Technology", "Master of Business Administration",
                  "Master of Data Science", "Diploma in Information Technology"}


def rand_password(length=8):
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def add_column_if_missing(conn, table, col, col_type):
    cur = conn.execute(f"PRAGMA table_info({table})")
    cols = {row[1] for row in cur.fetchall()}
    if col not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=OFF")   # allow DELETE without cascade issues

    # Ensure extra columns exist
    add_column_if_missing(conn, "users", "full_name",     "TEXT")
    add_column_if_missing(conn, "users", "program",       "TEXT")
    add_column_if_missing(conn, "users", "year_of_study", "INTEGER")

    # Clear existing data (bookings first due to FK)
    conn.execute("DELETE FROM bookings")
    conn.execute("DELETE FROM users")
    conn.commit()

    print("Generating demo users...")

    users_to_insert = []
    plaintext_passwords = {}   # { student_id: plaintext }

    # ── 2400 students ──────────────────────────────────────────────────────
    for i in range(1, 2401):
        sid     = f"jc1{i:05d}"          # jc100001 .. jc102400
        name    = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        email   = f"{sid}@my.jcu.edu.sg"
        pw      = rand_password()
        pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(10)).decode()
        program = random.choice(PROGRAMS)
        year    = random.randint(1, 2) if program in MASTER_DIPLOMA else random.randint(1, 4)
        status  = "pre_arrival" if i <= 100 else "active"
        plaintext_passwords[sid] = pw
        users_to_insert.append((sid, name, email, pw_hash, "student", status, program, year))

    # ── 80 staff ───────────────────────────────────────────────────────────
    for i in range(1, 81):
        sid     = f"st{i:04d}"
        name    = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        email   = f"{sid}@jcu.edu.sg"
        pw      = rand_password()
        pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(10)).decode()
        plaintext_passwords[sid] = pw
        users_to_insert.append((sid, name, email, pw_hash, "staff", "active", None, None))

    # ── 20 admins ──────────────────────────────────────────────────────────
    for i in range(1, 21):
        sid     = f"ad{i:04d}"
        name    = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        email   = f"{sid}@jcu.edu.sg"
        pw      = rand_password()
        pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(10)).decode()
        plaintext_passwords[sid] = pw
        users_to_insert.append((sid, name, email, pw_hash, "admin", "active", None, None))

    # Batch insert
    def insert_batch(rows):
        stmt = ("INSERT INTO users "
                "(student_id, full_name, email, password_hash, role, status, program, year_of_study) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        for idx, row in enumerate(rows, 1):
            conn.execute(stmt, row)
            if idx % 500 == 0:
                print(f"  [{idx}/{len(rows)}] generated...")
        conn.commit()

    insert_batch(users_to_insert)

    counts = {"student": 2400, "staff": 80, "admin": 20}
    print(f"Generated 2500 demo users: "
          f"{counts['student']} students, {counts['staff']} staff, {counts['admin']} admins")

    # ── Export CSV (password_hash at col 3 so seed-demo-users.js works) ────
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["student_id", "full_name", "email", "password_hash",
                         "role", "status", "program", "year_of_study"])
        for row in users_to_insert:
            writer.writerow(row)
    print(f"Exported: demo_users_credentials.csv ({len(users_to_insert)} rows)")

    # ── Export JSON (plaintext passwords for demo login reference) ─────────
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(plaintext_passwords, f, indent=2)
    print(f"Exported: demo_passwords.json ({len(plaintext_passwords)} entries)")

    conn.close()


if __name__ == "__main__":
    main()
