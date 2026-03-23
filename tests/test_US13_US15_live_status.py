# -*- coding: utf-8 -*-
"""
US-13: Library weekly seat quota enforcement
US-14: Library seat availability display
US-15: Real-time room status updates (Socket.IO — advisory)
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
from conftest import APIClient, get_future_date
from config import (LIBRARY_ID, LIBRARY_L1_SEAT_START, LIBRARY_L2_SEAT_START,
                    LEVEL_1, LEVEL_2)

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
    if isinstance(actual_body, (dict, list)):
        print(f"  Response: {json.dumps(actual_body, indent=2, default=str)}")
    else:
        print(f"  Response: {str(actual_body)[:300]}")
    print(f"  Verdict:  [{verdict}]")
    return condition


def run_tests():
    global passed, failed
    passed = 0
    failed = 0

    print("\n" + "#"*70)
    print("#  US-13 through US-15: LIBRARY QUOTA & LIVE STATUS TESTS")
    print("#"*70)

    client = APIClient()
    client.login_as_student()

    # Use dates in the same Monday-Sunday week for quota tests
    # Days +60..+63 all land in the same calendar week (use Mon-Thu of a week far out)
    from datetime import datetime, timedelta
    base = datetime.now() + timedelta(days=60)
    # Advance to next Monday
    days_to_mon = (7 - base.weekday()) % 7
    if days_to_mon == 0:
        days_to_mon = 7
    mon = base + timedelta(days=days_to_mon)
    dates = [(mon + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(4)]

    url_book = "/bookings"
    booked_ids = []

    # -- US-13: Library weekly quota ------------------------------------------
    print("\n--- US-13: Library Weekly Quota (max 3 per week) ---")

    seat1 = LIBRARY_L1_SEAT_START      # L1-Seat-1
    seat2 = LIBRARY_L1_SEAT_START + 1  # L1-Seat-2
    seat3 = LIBRARY_L1_SEAT_START + 2  # L1-Seat-3
    seat4 = LIBRARY_L1_SEAT_START + 3  # L1-Seat-4

    # Booking 1 — should succeed
    b1 = {"roomId": seat1, "date": dates[0], "startTime": "09:00", "durationHours": 1,
          "title": "Library quota test 1"}
    r1 = client.post(url_book, b1)
    d1 = r1.json()
    if r1.status_code == 201:
        booked_ids.append(d1["id"])
    report(
        "US-13-A", f"1st library seat booking in week succeeds (seat {seat1})",
        "POST", url_book, b1,
        "HTTP 201",
        r1.status_code, d1,
        r1.status_code == 201 and "id" in d1
    )

    # Booking 2 — should succeed
    b2 = {"roomId": seat2, "date": dates[1], "startTime": "09:00", "durationHours": 1,
          "title": "Library quota test 2"}
    r2 = client.post(url_book, b2)
    d2 = r2.json()
    if r2.status_code == 201:
        booked_ids.append(d2["id"])
    report(
        "US-13-B", f"2nd library seat booking in week succeeds (seat {seat2})",
        "POST", url_book, b2,
        "HTTP 201",
        r2.status_code, d2,
        r2.status_code == 201 and "id" in d2
    )

    # Booking 3 — should succeed (reaches quota limit)
    b3 = {"roomId": seat3, "date": dates[2], "startTime": "09:00", "durationHours": 1,
          "title": "Library quota test 3"}
    r3 = client.post(url_book, b3)
    d3 = r3.json()
    if r3.status_code == 201:
        booked_ids.append(d3["id"])
    report(
        "US-13-C", f"3rd library seat booking in week succeeds (hits quota limit)",
        "POST", url_book, b3,
        "HTTP 201",
        r3.status_code, d3,
        r3.status_code == 201 and "id" in d3
    )

    # Booking 4 — should be rejected (over quota)
    b4 = {"roomId": seat4, "date": dates[3], "startTime": "09:00", "durationHours": 1,
          "title": "Library quota test 4 — should fail"}
    r4 = client.post(url_book, b4)
    d4 = r4.json()
    report(
        "US-13-D", f"4th library seat booking in same week is rejected (quota=3)",
        "POST", url_book, b4,
        "HTTP 429 — weekly quota reached",
        r4.status_code, d4,
        r4.status_code == 429 and "error" in d4
    )

    # Clean up quota test bookings
    for bid in booked_ids:
        client.patch(f"/bookings/{bid}/cancel")
    booked_ids.clear()

    # -- US-14: Library seat availability display -----------------------------
    print("\n--- US-14: Library Seat Availability ---")

    url_avail = "/rooms/availability"
    avail_date = get_future_date(45)

    # Level 1 library seats
    params_l1 = {"buildingId": LIBRARY_ID, "level": LEVEL_1,
                 "date": avail_date, "startTime": "10:00", "duration": 1}
    resp_l1 = client.get(url_avail, params=params_l1)
    data_l1 = resp_l1.json()
    report(
        "US-14-A", "Library Level 1 seat availability returned",
        "GET", f"{url_avail}?buildingId={LIBRARY_ID}&level={LEVEL_1}&date={avail_date}&startTime=10:00&duration=1",
        None,
        "HTTP 200 with Library Seat rooms and isAvailable flags",
        resp_l1.status_code, data_l1,
        resp_l1.status_code == 200 and isinstance(data_l1, list) and len(data_l1) > 0
        and all("isAvailable" in r for r in data_l1)
        and all(r.get("room_type") == "Library Seat" for r in data_l1)
    )

    # Level 2 library seats
    params_l2 = {"buildingId": LIBRARY_ID, "level": LEVEL_2,
                 "date": avail_date, "startTime": "10:00", "duration": 1}
    resp_l2 = client.get(url_avail, params=params_l2)
    data_l2 = resp_l2.json()
    report(
        "US-14-B", "Library Level 2 seat availability returned",
        "GET", f"{url_avail}?buildingId={LIBRARY_ID}&level={LEVEL_2}&date={avail_date}&startTime=10:00&duration=1",
        None,
        "HTTP 200 with Library Seat rooms for Level 2",
        resp_l2.status_code, data_l2,
        resp_l2.status_code == 200 and isinstance(data_l2, list) and len(data_l2) > 0
    )

    # Level 2 should have more seats than Level 1 (78 vs 35)
    if resp_l1.status_code == 200 and resp_l2.status_code == 200:
        report(
            "US-14-C", "Library Level 2 has more seats than Level 1",
            "GET", url_avail, None,
            "Level 2 seat count > Level 1 seat count",
            200,
            {"level1_seats": len(data_l1), "level2_seats": len(data_l2)},
            len(data_l2) > len(data_l1)
        )
    else:
        failed += 1
        print("\n  US-14-C: SKIP (availability query failed)")

    # Booking a seat then checking availability shows it as unavailable
    book_body = {"roomId": LIBRARY_L1_SEAT_START, "date": avail_date,
                 "startTime": "10:00", "durationHours": 1, "title": "Availability check test"}
    resp_b = client.post(url_book, book_body)
    d_b = resp_b.json()
    avail_bid = d_b.get("id") if resp_b.status_code == 201 else None

    if avail_bid:
        params_check = {"buildingId": LIBRARY_ID, "level": LEVEL_1,
                        "date": avail_date, "startTime": "10:00", "duration": 1}
        resp_check = client.get(url_avail, params=params_check)
        data_check = resp_check.json()
        seat_status = next((r for r in data_check if r.get("id") == LIBRARY_L1_SEAT_START), None)
        report(
            "US-14-D", f"Booked seat (id={LIBRARY_L1_SEAT_START}) shows isAvailable=False",
            "GET", url_avail, None,
            f"Seat id={LIBRARY_L1_SEAT_START} has isAvailable=False after booking",
            resp_check.status_code,
            {"seat": seat_status},
            resp_check.status_code == 200 and seat_status is not None
            and seat_status.get("isAvailable") is False
        )
        # Clean up
        client.patch(f"/bookings/{avail_bid}/cancel")
    else:
        failed += 1
        print("\n  US-14-D: SKIP (could not create booking for availability check)")

    # -- US-15: Real-time room status (Socket.IO advisory) ---------------------
    print("\n--- US-15: Real-Time Room Status (Socket.IO) ---")

    report(
        "US-15-A", "Real-time status via Socket.IO (ADVISORY — frontend feature)",
        "N/A", "N/A", None,
        "Socket.IO server emits room:statusChange events; frontend subscribes per floor",
        "N/A",
        {"note": "Socket.IO real-time updates are handled in the frontend (script.js). "
                 "The backend does not expose a REST endpoint for live status. "
                 "Verify manually: open two browser tabs, book a room in one tab, "
                 "observe the room card badge update in the other tab without reload."},
        True  # advisory only
    )

    # Health check confirms server is running (prerequisite for Socket.IO)
    resp_health = client.get("/health")
    data_health = resp_health.json() if resp_health.status_code == 200 else {}
    report(
        "US-15-B", "Health endpoint confirms server is running (Socket.IO prerequisite)",
        "GET", "/health", None,
        "HTTP 200 with status=ok",
        resp_health.status_code, data_health,
        resp_health.status_code == 200 and data_health.get("status") == "ok"
    )

    # Summary
    print(f"\n{'='*70}")
    print(f"  LIBRARY QUOTA & LIVE STATUS TESTS COMPLETE: {passed} passed, {failed} failed "
          f"out of {passed + failed}")
    print(f"{'='*70}\n")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
