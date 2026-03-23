# -*- coding: utf-8 -*-
"""
Master test runner for all Python API tests.
Runs all test modules in order and prints a final summary table.

Usage:
    cd tests
    python run_all_tests.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

# Import all test modules
import test_US01_US04_authentication as auth_tests
import test_US05_US08_room_browsing  as room_tests
import test_US09_US12_bookings       as booking_tests
import test_US13_US15_live_status    as live_tests


def run_suite(module, label):
    """Run a test module's run_tests() and return (passed, failed, duration)."""
    start = time.time()
    try:
        success = module.run_tests()
    except Exception as exc:
        print(f"\n[ERROR] {label} raised an exception: {exc}")
        return 0, 1, time.time() - start
    elapsed = time.time() - start
    return module.passed, module.failed, elapsed


def main():
    print("\n" + "="*70)
    print("  JCU CAMPUS BOOKING SYSTEM — FULL API TEST SUITE")
    print("="*70)

    suites = [
        (auth_tests,    "US-01..04  Authentication"),
        (room_tests,    "US-05..08  Room Browsing"),
        (booking_tests, "US-09..12  Bookings"),
        (live_tests,    "US-13..15  Library Quota & Live Status"),
    ]

    results = []
    total_passed = 0
    total_failed = 0

    for module, label in suites:
        p, f, dur = run_suite(module, label)
        results.append((label, p, f, dur))
        total_passed += p
        total_failed += f

    # Final summary table
    print("\n" + "="*70)
    print("  FINAL SUMMARY")
    print("="*70)
    print(f"  {'Suite':<35} {'Passed':>6}  {'Failed':>6}  {'Time':>6}")
    print(f"  {'-'*35}  {'-'*6}  {'-'*6}  {'-'*6}")
    for label, p, f, dur in results:
        status = "OK" if f == 0 else "FAIL"
        print(f"  {label:<35} {p:>6}  {f:>6}  {dur:>5.1f}s  [{status}]")
    print(f"  {'-'*35}  {'-'*6}  {'-'*6}")
    print(f"  {'TOTAL':<35} {total_passed:>6}  {total_failed:>6}")
    print("="*70)

    overall = "ALL TESTS PASSED" if total_failed == 0 else f"{total_failed} TEST(S) FAILED"
    print(f"\n  Result: {overall}\n")

    sys.exit(0 if total_failed == 0 else 1)


if __name__ == "__main__":
    main()
