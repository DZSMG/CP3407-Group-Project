# -*- coding: utf-8 -*-
"""
US-09: Book a study room
US-10: Prevent double booking (conflict detection)
US-11: View my bookings
US-12: Cancel a booking
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
from conftest import APIClient, get_future_date, write_json_report
from config import (ROOM_A1_04_ID, ROOM_A1_05_ID, ROOM_C1_10_ID,
                    LIBRARY_L1_SEAT_START)

passed = 0
failed = 0
results = []


def report(test_id, test_name, method, url, body, expected,
           actual_status, actual_body, condition):
    global passed, failed, results
    verdict = "PASS" if condition else "FAIL"
    if condition:
        passed += 1
    else:
        failed += 1
    results.append({
        "id": test_id,
        "name": test_name,
        "method": method,
        "url": url,
        "body": body,
        "expected": expected,
        "actual_status": actual_status,
        "actual_body": actual_body,
        "passed": bool(condition),
    })

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
    global passed, failed, results
    passed = 0
    failed = 0
    results = []

    print("\n" + "#"*70)
    print("#  US-09 through US-12: BOOKING TESTS")
    print("#"*70)

    client1 = APIClient()
    client2 = APIClient()
    client1.login_as_student()
    client2.login_as_student2()

    # Use far future date to avoid conflicts with other test runs
    date = get_future_date(30)
    url_book = "/bookings"

    # -- US-09: Create booking ------------------------------------------------
    print("\n--- US-09: Create a Booking ---")

    body1 = {
        "roomId": ROOM_A1_04_ID,
        "date": date,
        "startTime": "09:00",
        "durationHours": 1,
        "title": "Test booking US-09"
    }
    resp = client1.post(url_book, body1)
    data = resp.json()
    booking_id = data.get("id") if resp.status_code == 201 else None
    report(
        "US-09-A", "Authenticated student creates a booking",
        "POST", url_book, body1,
        "HTTP 201 with booking object including booking_ref, id",
        resp.status_code, data,
        resp.status_code == 201 and "id" in data and "booking_ref" in data
        and str(data.get("booking_ref", "")).startswith("BK-")
    )

    # Booking without auth returns 401
    client_noauth = APIClient()
    resp_noauth = client_noauth.post(url_book, {"roomId": ROOM_A1_04_ID, "date": date,
                                                 "startTime": "11:00", "durationHours": 1})
    data_noauth = resp_noauth.json()
    report(
        "US-09-B", "Unauthenticated booking returns 401",
        "POST", url_book, {"roomId": ROOM_A1_04_ID, "date": date, "startTime": "11:00", "durationHours": 1},
        "HTTP 401",
        resp_noauth.status_code, data_noauth,
        resp_noauth.status_code == 401
    )

    # Missing required fields returns 400
    resp_missing = client1.post(url_book, {"roomId": ROOM_A1_04_ID, "date": date})
    data_missing = resp_missing.json()
    report(
        "US-09-C", "Missing required fields returns 400",
        "POST", url_book, {"roomId": ROOM_A1_04_ID, "date": date},
        "HTTP 400 with error",
        resp_missing.status_code, data_missing,
        resp_missing.status_code == 400 and "error" in data_missing
    )

    # Invalid durationHours returns 400
    resp_dur = client1.post(url_book, {"roomId": ROOM_A1_04_ID, "date": date,
                                        "startTime": "09:00", "durationHours": 5})
    data_dur = resp_dur.json()
    report(
        "US-09-D", "durationHours=5 rejected (must be 1, 2, or 3)",
        "POST", url_book, {"roomId": ROOM_A1_04_ID, "date": date,
                           "startTime": "09:00", "durationHours": 5},
        "HTTP 400",
        resp_dur.status_code, data_dur,
        resp_dur.status_code == 400 and "error" in data_dur
    )

    # -- US-10: Prevent double booking ----------------------------------------
    print("\n--- US-10: Prevent Double Booking ---")

    # Book same slot with client2 (same room, same time as US-09-A) -> 409
    body_conflict = {
        "roomId": ROOM_A1_04_ID,
        "date": date,
        "startTime": "09:00",
        "durationHours": 1
    }
    resp_conflict = client2.post(url_book, body_conflict)
    data_conflict = resp_conflict.json()
    report(
        "US-10-A", "Booking same room/time as existing booking returns 409",
        "POST", url_book, body_conflict,
        "HTTP 409 with conflict error",
        resp_conflict.status_code, data_conflict,
        resp_conflict.status_code == 409 and "error" in data_conflict
    )

    # Overlapping slot (starts during existing 09:00-10:00) -> 409
    body_overlap = {
        "roomId": ROOM_A1_04_ID,
        "date": date,
        "startTime": "09:30",
        "durationHours": 1
    }
    resp_overlap = client2.post(url_book, body_overlap)
    data_overlap = resp_overlap.json()
    report(
        "US-10-B", "Partially overlapping slot (09:30-10:30 vs 09:00-10:00) returns 409",
        "POST", url_book, body_overlap,
        "HTTP 409",
        resp_overlap.status_code, data_overlap,
        resp_overlap.status_code == 409 and "error" in data_overlap
    )

    # Non-overlapping slot is allowed -> 201
    body_ok = {
        "roomId": ROOM_A1_04_ID,
        "date": date,
        "startTime": "10:00",
        "durationHours": 1,
        "title": "Non-overlap test"
    }
    resp_ok = client2.post(url_book, body_ok)
    data_ok = resp_ok.json()
    booking2_id = data_ok.get("id") if resp_ok.status_code == 201 else None
    report(
        "US-10-C", "Non-overlapping slot (10:00-11:00 after 09:00-10:00) is allowed",
        "POST", url_book, body_ok,
        "HTTP 201 — no conflict",
        resp_ok.status_code, data_ok,
        resp_ok.status_code == 201 and "id" in data_ok
    )

    # -- US-11: View my bookings -----------------------------------------------
    print("\n--- US-11: View My Bookings ---")

    url_me = "/bookings/me"

    resp_me = client1.get(url_me)
    data_me = resp_me.json()
    report(
        "US-11-A", "GET /bookings/me returns student's bookings",
        "GET", url_me, None,
        "HTTP 200 with array of bookings",
        resp_me.status_code, data_me,
        resp_me.status_code == 200 and isinstance(data_me, list)
    )

    # Booking just created should appear in the list
    if resp_me.status_code == 200 and booking_id:
        ids = [b.get("id") for b in data_me]
        report(
            "US-11-B", f"Booking id={booking_id} appears in /bookings/me",
            "GET", url_me, None,
            f"Booking id={booking_id} is present",
            resp_me.status_code,
            {"found_ids": ids[:5], "target": booking_id},
            booking_id in ids
        )
    else:
        failed += 1
        print("\n  US-11-B: SKIP (booking_id not available)")

    # Unauthenticated GET /bookings/me returns 401
    resp_me_noauth = client_noauth.get(url_me)
    report(
        "US-11-C", "Unauthenticated GET /bookings/me returns 401",
        "GET", url_me, None,
        "HTTP 401",
        resp_me_noauth.status_code,
        resp_me_noauth.json() if resp_me_noauth.status_code < 500 else {},
        resp_me_noauth.status_code == 401
    )

    # Bookings include room info (room_name, building_name)
    if resp_me.status_code == 200 and data_me:
        first = data_me[0]
        report(
            "US-11-D", "Booking objects include room_name and building_name",
            "GET", url_me, None,
            "Each booking has room_name and building_name from JOIN",
            resp_me.status_code, {k: first.get(k) for k in ["id", "booking_ref", "room_name", "building_name"]},
            "room_name" in first and "building_name" in first
        )
    else:
        failed += 1
        print("\n  US-11-D: SKIP (no bookings returned)")

    # -- US-12: Cancel a booking -----------------------------------------------
    print("\n--- US-12: Cancel a Booking ---")

    if booking_id:
        url_cancel = f"/bookings/{booking_id}/cancel"
        resp_cancel = client1.patch(url_cancel)
        data_cancel = resp_cancel.json()
        report(
            "US-12-A", f"Owner cancels own booking (id={booking_id})",
            "PATCH", url_cancel, None,
            "HTTP 200 with status='cancelled'",
            resp_cancel.status_code, data_cancel,
            resp_cancel.status_code == 200 and data_cancel.get("status") == "cancelled"
        )
    else:
        failed += 1
        print("\n  US-12-A: SKIP (booking_id not available)")

    # Another student cannot cancel someone else's booking
    if booking2_id:
        url_cancel2 = f"/bookings/{booking2_id}/cancel"
        resp_cancel_wrong = client1.patch(url_cancel2)
        data_cancel_wrong = resp_cancel_wrong.json()
        report(
            "US-12-B", f"Student 1 cannot cancel Student 2's booking (id={booking2_id})",
            "PATCH", url_cancel2, None,
            "HTTP 403",
            resp_cancel_wrong.status_code, data_cancel_wrong,
            resp_cancel_wrong.status_code == 403 and "error" in data_cancel_wrong
        )
    else:
        failed += 1
        print("\n  US-12-B: SKIP (booking2_id not available)")

    # Cancel non-existent booking returns 404
    resp_404 = client1.patch("/bookings/999999/cancel")
    data_404 = resp_404.json() if resp_404.status_code < 500 else {}
    report(
        "US-12-C", "Cancel non-existent booking returns 404",
        "PATCH", "/bookings/999999/cancel", None,
        "HTTP 404",
        resp_404.status_code, data_404,
        resp_404.status_code == 404
    )

    # After cancellation the slot should be bookable again
    if booking_id and resp_cancel.status_code == 200:
        body_rebook = {
            "roomId": ROOM_A1_04_ID,
            "date": date,
            "startTime": "09:00",
            "durationHours": 1,
            "title": "Re-booking after cancel"
        }
        resp_rebook = client1.post(url_book, body_rebook)
        data_rebook = resp_rebook.json()
        rebook_id = data_rebook.get("id") if resp_rebook.status_code == 201 else None
        report(
            "US-12-D", "Cancelled slot can be rebooked immediately",
            "POST", url_book, body_rebook,
            "HTTP 201 — slot is free after cancellation",
            resp_rebook.status_code, data_rebook,
            resp_rebook.status_code == 201
        )
        # Clean up the rebook
        if rebook_id:
            client1.patch(f"/bookings/{rebook_id}/cancel")
    else:
        failed += 1
        print("\n  US-12-D: SKIP (booking was not cancelled successfully)")

    # Clean up remaining booking from US-10-C
    if booking2_id:
        client2.patch(f"/bookings/{booking2_id}/cancel")

    # Summary
    print(f"\n{'='*70}")
    print(f"  BOOKING TESTS COMPLETE: {passed} passed, {failed} failed "
          f"out of {passed + failed}")
    print(f"{'='*70}\n")
    path = write_json_report(
        "US-09 to US-12: Bookings",
        "report_US09_US12_bookings.json",
        results, passed, failed,
    )
    print(f"  JSON report: {path}")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
