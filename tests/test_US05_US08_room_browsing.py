# -*- coding: utf-8 -*-
"""
US-05: Browse and search available rooms
US-06: Check room availability by date/time
US-07: Filter rooms by floor/level
US-08: Filter rooms by type
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
from conftest import APIClient, get_future_date
from config import (BASE_URL, BLOCK_A_ID, BLOCK_A_NAME, BLOCK_B_ID, BLOCK_C_ID,
                    BLOCK_E_ID, LIBRARY_ID, LEVEL_1, LEVEL_2,
                    ROOM_A1_04_ID, ROOM_C1_10_ID)

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
    if isinstance(actual_body, (list, dict)):
        display = actual_body if isinstance(actual_body, dict) else {"items": len(actual_body), "first": actual_body[0] if actual_body else None}
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
    date = get_future_date(1)

    print("\n" + "#"*70)
    print("#  US-05 through US-08: ROOM BROWSING TESTS")
    print("#"*70)

    # -- US-05: Browse buildings -------------------------------------------
    print("\n--- US-05: Browse Buildings ---")

    url = "/buildings"
    resp = client.get(url)
    data = resp.json()
    report(
        "US-05-A", "GET /buildings returns list of all buildings",
        "GET", url, None,
        "HTTP 200 with array of 5 buildings",
        resp.status_code, data,
        resp.status_code == 200 and isinstance(data, list) and len(data) >= 5
    )

    # Check required fields are present
    if resp.status_code == 200 and data:
        first = data[0]
        report(
            "US-05-B", "Building objects include id, name, room_count",
            "GET", url, None,
            "Each building has id, name, room_count fields",
            resp.status_code, first,
            all(k in first for k in ["id", "name", "room_count"])
        )
    else:
        failed += 1
        print("\n  US-05-B: SKIP (US-05-A failed)")

    # Verify Block A is in the list
    if resp.status_code == 200 and data:
        block_a = next((b for b in data if b.get("id") == BLOCK_A_ID), None)
        report(
            "US-05-C", f"Block A (id={BLOCK_A_ID}) is in buildings list",
            "GET", url, None,
            f"Buildings list contains id={BLOCK_A_ID} with name containing 'Block A'",
            resp.status_code,
            {"found": block_a is not None, "building": block_a},
            block_a is not None and "Block A" in block_a.get("name", "")
        )
    else:
        failed += 1
        print("\n  US-05-C: SKIP (US-05-A failed)")

    # -- US-06: Check room availability ------------------------------------
    print("\n--- US-06: Room Availability ---")

    url_avail = "/rooms/availability"

    params = {"buildingId": BLOCK_A_ID, "level": LEVEL_1, "date": date,
              "startTime": "09:00", "duration": 1}
    resp = client.get(url_avail, params=params)
    data = resp.json()
    report(
        "US-06-A", "GET /rooms/availability returns rooms with isAvailable flag",
        "GET", f"{url_avail}?buildingId={BLOCK_A_ID}&level={LEVEL_1}&date={date}&startTime=09:00&duration=1",
        None,
        "HTTP 200 with array of rooms, each having isAvailable field",
        resp.status_code, data,
        resp.status_code == 200 and isinstance(data, list) and len(data) > 0
        and all("isAvailable" in r for r in data)
    )

    # Missing required params returns 400
    resp_bad = client.get(url_avail, params={"buildingId": BLOCK_A_ID})
    data_bad = resp_bad.json()
    report(
        "US-06-B", "Missing required params returns 400",
        "GET", f"{url_avail}?buildingId={BLOCK_A_ID} (missing level/date/startTime/duration)",
        None,
        "HTTP 400 with error message",
        resp_bad.status_code, data_bad,
        resp_bad.status_code == 400 and "error" in data_bad
    )

    # Library availability check
    params_lib = {"buildingId": LIBRARY_ID, "level": LEVEL_1, "date": date,
                  "startTime": "10:00", "duration": 2}
    resp_lib = client.get(url_avail, params=params_lib)
    data_lib = resp_lib.json()
    report(
        "US-06-C", "Library seats show availability correctly",
        "GET", f"{url_avail}?buildingId={LIBRARY_ID}&level={LEVEL_1}&date={date}&startTime=10:00&duration=2",
        None,
        "HTTP 200 with library seat rooms",
        resp_lib.status_code, data_lib,
        resp_lib.status_code == 200 and isinstance(data_lib, list) and len(data_lib) > 0
    )

    # -- US-07: Filter by floor/level --------------------------------------
    print("\n--- US-07: Floor Filtering ---")

    url_rooms = "/rooms"

    params_l1 = {"buildingId": BLOCK_A_ID, "level": LEVEL_1}
    resp_l1 = client.get(url_rooms, params=params_l1)
    data_l1 = resp_l1.json()
    report(
        "US-07-A", "Filter Block A Level 1 rooms only",
        "GET", f"{url_rooms}?buildingId={BLOCK_A_ID}&level={LEVEL_1}",
        None,
        "HTTP 200 with rooms only from Level 1",
        resp_l1.status_code, data_l1,
        resp_l1.status_code == 200 and isinstance(data_l1, list) and len(data_l1) > 0
        and all(r.get("level") == LEVEL_1 for r in data_l1)
    )

    params_l2 = {"buildingId": BLOCK_A_ID, "level": LEVEL_2}
    resp_l2 = client.get(url_rooms, params=params_l2)
    data_l2 = resp_l2.json()
    report(
        "US-07-B", "Filter Block A Level 2 rooms only",
        "GET", f"{url_rooms}?buildingId={BLOCK_A_ID}&level={LEVEL_2}",
        None,
        "HTTP 200 with rooms only from Level 2",
        resp_l2.status_code, data_l2,
        resp_l2.status_code == 200 and isinstance(data_l2, list)
        and all(r.get("level") == LEVEL_2 for r in data_l2)
    )

    # Level 1 and Level 2 rooms should be different
    if resp_l1.status_code == 200 and resp_l2.status_code == 200:
        ids_l1 = {r["id"] for r in data_l1}
        ids_l2 = {r["id"] for r in data_l2}
        report(
            "US-07-C", "Level 1 and Level 2 return disjoint room sets",
            "GET", f"{url_rooms} with different level params",
            None,
            "No room ID appears in both Level 1 and Level 2 results",
            200, {"l1_count": len(ids_l1), "l2_count": len(ids_l2), "overlap": len(ids_l1 & ids_l2)},
            len(ids_l1 & ids_l2) == 0
        )
    else:
        failed += 1
        print("\n  US-07-C: SKIP (previous floor filter tests failed)")

    # Missing buildingId returns 400
    resp_nobid = client.get(url_rooms, params={"level": LEVEL_1})
    report(
        "US-07-D", "Missing buildingId returns 400",
        "GET", f"{url_rooms}?level={LEVEL_1} (no buildingId)",
        None,
        "HTTP 400",
        resp_nobid.status_code,
        resp_nobid.json() if resp_nobid.status_code < 500 else {},
        resp_nobid.status_code == 400
    )

    # -- US-08: Filter by room type ----------------------------------------
    print("\n--- US-08: Room Type Filtering ---")

    # Block C has Consultation Rooms
    params_consult = {"buildingId": BLOCK_C_ID, "type": "Consultation Room"}
    resp_consult = client.get(url_rooms, params=params_consult)
    data_consult = resp_consult.json()
    report(
        "US-08-A", "Filter Block C Consultation Rooms",
        "GET", f"{url_rooms}?buildingId={BLOCK_C_ID}&type=Consultation+Room",
        None,
        "HTTP 200 with only Consultation Room type rooms",
        resp_consult.status_code, data_consult,
        resp_consult.status_code == 200 and isinstance(data_consult, list)
        and len(data_consult) > 0
        and all(r.get("room_type") == "Consultation Room" for r in data_consult)
    )

    # Library building returns Library Seat type
    params_lib_seats = {"buildingId": LIBRARY_ID, "type": "Library Seat"}
    resp_lib_seats = client.get(url_rooms, params=params_lib_seats)
    data_lib_seats = resp_lib_seats.json()
    report(
        "US-08-B", "Filter Library for Library Seat rooms",
        "GET", f"{url_rooms}?buildingId={LIBRARY_ID}&type=Library+Seat",
        None,
        "HTTP 200 with only Library Seat type rooms",
        resp_lib_seats.status_code, data_lib_seats,
        resp_lib_seats.status_code == 200 and isinstance(data_lib_seats, list)
        and len(data_lib_seats) > 0
        and all(r.get("room_type") == "Library Seat" for r in data_lib_seats)
    )

    # type=All returns all rooms in building (no type filter)
    params_all = {"buildingId": BLOCK_A_ID, "type": "All"}
    resp_all = client.get(url_rooms, params=params_all)
    params_notype = {"buildingId": BLOCK_A_ID}
    resp_notype = client.get(url_rooms, params=params_notype)
    report(
        "US-08-C", "type=All returns same count as no type filter",
        "GET", f"{url_rooms}?buildingId={BLOCK_A_ID}&type=All vs no type",
        None,
        "Both return the same number of rooms",
        resp_all.status_code,
        {"with_all": len(resp_all.json()) if resp_all.status_code == 200 else "err",
         "without_type": len(resp_notype.json()) if resp_notype.status_code == 200 else "err"},
        resp_all.status_code == 200 and resp_notype.status_code == 200
        and len(resp_all.json()) == len(resp_notype.json())
    )

    # Summary
    print(f"\n{'='*70}")
    print(f"  ROOM BROWSING TESTS COMPLETE: {passed} passed, {failed} failed "
          f"out of {passed + failed}")
    print(f"{'='*70}\n")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
