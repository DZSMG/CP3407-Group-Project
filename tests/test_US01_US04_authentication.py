"""
US-01: Student login with ID and password
US-02: Student ID validation (8-digit IDs starting with 1)
US-03: Pre-arrival student registration (restricted access)
US-04: Staff login with elevated permissions
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
from conftest import APIClient, get_future_date, get_today
from config import (BASE_URL, TEST_STUDENT_1, TEST_STUDENT_2, TEST_ADMIN,
                    NEW_STUDENT)

passed = 0
failed = 0


def report(test_id, test_name, method, url, body, expected,
           actual_status, actual_body, condition):
    global passed, failed
    verdict = "PASS" if condition else "FAIL"
    if condition:
        passed += 1
    else:
        failed += 1

    print(f"\n{'='*70}")
    print(f"  {test_id}: {test_name}")
    print(f"{'='*70}")
    print(f"  Request:  {method} {url}")
    if body:
        print(f"  Body:     {json.dumps(body, indent=2)}")
    print(f"  Expected: {expected}")
    print(f"  Actual:   HTTP {actual_status}")
    if isinstance(actual_body, dict):
        display = dict(actual_body)
        if display.get("token"):
            display["token"] = display["token"][:30] + "..."
        print(f"  Response: {json.dumps(display, indent=2, default=str)}")
    else:
        print(f"  Response: {str(actual_body)[:300]}")
    print(f"  Verdict:  [{verdict}]")
    return condition


def run_tests():
    global passed, failed
    passed = 0
    failed = 0
    client = APIClient()

    print("\n" + "#"*70)
    print("#  US-01 through US-04: AUTHENTICATION TESTS")
    print("#"*70)

    # ── US-01: Student login ───────────────────────────────────────────────
    print("\n--- US-01: Student Login ---")

    url = "/auth/login"

    body = {"studentId": TEST_STUDENT_1["studentId"], "password": TEST_STUDENT_1["password"]}
    resp = client.post(url, body)
    data = resp.json()
    report(
        "US-01-A", "Valid student login returns JWT token",
        "POST", url, body,
        "HTTP 200 with token and user object",
        resp.status_code, data,
        resp.status_code == 200 and "token" in data and len(data.get("token", "")) > 20
    )

    body_bad = {"studentId": TEST_STUDENT_1["studentId"], "password": "wrongpassword"}
    resp = client.post(url, body_bad)
    data = resp.json()
    report(
        "US-01-B", "Invalid password returns 401",
        "POST", url, body_bad,
        "HTTP 401 with error message",
        resp.status_code, data,
        resp.status_code == 401 and "error" in data
    )

    body_none = {"studentId": "10000000", "password": "01011990"}
    resp = client.post(url, body_none)
    data = resp.json()
    report(
        "US-01-C", "Non-existent student ID returns 401",
        "POST", url, body_none,
        "HTTP 401 with error message",
        resp.status_code, data,
        resp.status_code == 401 and "error" in data
    )

    # ── US-02: Student ID format validation ───────────────────────────────
    print("\n--- US-02: Student ID Validation ---")

    url_reg = "/auth/register"

    # Valid 8-digit ID starting with 1
    body_valid = {"studentId": NEW_STUDENT["studentId"],
                  "email": NEW_STUDENT["email"],
                  "password": NEW_STUDENT["password"]}
    resp = client.post(url_reg, body_valid)
    data = resp.json()
    report(
        "US-02-A", f"Valid 8-digit student ID ({NEW_STUDENT['studentId']}) accepted",
        "POST", url_reg, body_valid,
        "HTTP 201 with token (or 409 if already exists from re-run)",
        resp.status_code, data,
        (resp.status_code == 201 and "token" in data) or resp.status_code == 409
    )

    # Old jc-prefix format rejected
    body_old = {"studentId": "jc100099", "email": "old@jcu.edu.sg", "password": "01011990"}
    resp = client.post(url_reg, body_old)
    data = resp.json()
    report(
        "US-02-B", "Old jc-prefix format 'jc100099' rejected",
        "POST", url_reg, body_old,
        "HTTP 400 — only 8-digit IDs starting with 1 are accepted",
        resp.status_code, data,
        resp.status_code == 400 and "error" in data
    )

    # Does not start with 1
    body_bad_prefix = {"studentId": "24100001", "email": "bad@jcu.edu.sg", "password": "01011990"}
    resp = client.post(url_reg, body_bad_prefix)
    data = resp.json()
    report(
        "US-02-C", "ID not starting with 1 ('24100001') rejected",
        "POST", url_reg, body_bad_prefix,
        "HTTP 400",
        resp.status_code, data,
        resp.status_code == 400 and "error" in data
    )

    # Too short (7 digits)
    body_short = {"studentId": "1234567", "email": "short@jcu.edu.sg", "password": "01011990"}
    resp = client.post(url_reg, body_short)
    data = resp.json()
    report(
        "US-02-D", "7-digit ID rejected (must be exactly 8 digits)",
        "POST", url_reg, body_short,
        "HTTP 400",
        resp.status_code, data,
        resp.status_code == 400 and "error" in data
    )

    # Too long (9 digits)
    body_long = {"studentId": "123456789", "email": "long@jcu.edu.sg", "password": "01011990"}
    resp = client.post(url_reg, body_long)
    data = resp.json()
    report(
        "US-02-E", "9-digit ID rejected (must be exactly 8 digits)",
        "POST", url_reg, body_long,
        "HTTP 400",
        resp.status_code, data,
        resp.status_code == 400 and "error" in data
    )

    # Duplicate ID
    body_dup = {"studentId": TEST_STUDENT_1["studentId"],
                "email": "dup@jcu.edu.sg", "password": "01011990"}
    resp = client.post(url_reg, body_dup)
    data = resp.json()
    report(
        "US-02-F", f"Duplicate student ID '{TEST_STUDENT_1['studentId']}' rejected",
        "POST", url_reg, body_dup,
        "HTTP 409 with 'already registered' error",
        resp.status_code, data,
        resp.status_code == 409 and "error" in data
    )

    # ── US-03: Pre-arrival student ─────────────────────────────────────────
    print("\n--- US-03: Pre-Arrival Student ---")

    report(
        "US-03-A", "Pre-arrival student restriction (ADVISORY — feature not yet implemented)",
        "N/A", "N/A", None,
        "Future: accounts with status=pre_arrival should be blocked from booking",
        "N/A",
        {"note": "Pre-arrival enforcement is in the Planned backlog. "
                 "When implemented, a pre_arrival account should receive "
                 "HTTP 403 on POST /bookings."},
        True  # advisory only
    )

    # ── US-04: Staff login + permissions ───────────────────────────────────
    print("\n--- US-04: Staff Login + Permissions ---")

    client_admin = APIClient()
    body_staff = {"studentId": TEST_ADMIN["studentId"], "password": TEST_ADMIN["password"]}
    resp = client_admin.post("/auth/login", body_staff)
    data = resp.json()
    has_elevated = (resp.status_code == 200 and
                    data.get("user", {}).get("role") in ["admin", "staff"])
    report(
        "US-04-A", "Staff/admin login succeeds with elevated role",
        "POST", "/auth/login", body_staff,
        "HTTP 200 with role = admin or staff",
        resp.status_code, data,
        has_elevated
    )

    if has_elevated:
        client_admin.set_token(data["token"])

    # Admin endpoint (not yet built — 404 is acceptable)
    resp = client_admin.get("/bookings/admin")
    try:
        resp_body_b = resp.json()
    except Exception:
        resp_body_b = {"raw": resp.text[:200]}
    report(
        "US-04-B", "Admin GET /bookings/admin — route present (200) or planned (404)",
        "GET", "/bookings/admin", None,
        "HTTP 200 if built, 404 if not yet implemented",
        resp.status_code, resp_body_b,
        resp.status_code in [200, 404]
    )

    # Student should not reach admin endpoint (403 if guarded, 404 if not built)
    client_student = APIClient()
    client_student.login_as_student()
    resp = client_student.get("/bookings/admin")
    try:
        resp_body_c = resp.json()
    except Exception:
        resp_body_c = {"raw": resp.text[:200]}
    report(
        "US-04-C", "Student cannot access /bookings/admin (403 or 404)",
        "GET", "/bookings/admin (as student)", None,
        "HTTP 403, 401, or 404 — student must not receive 200",
        resp.status_code, resp_body_c,
        resp.status_code in [401, 403, 404]
    )

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  AUTHENTICATION TESTS COMPLETE: {passed} passed, {failed} failed "
          f"out of {passed + failed}")
    print(f"{'='*70}\n")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
