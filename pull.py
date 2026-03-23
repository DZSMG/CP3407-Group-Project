# -*- coding: utf-8 -*-
"""
JCU Campus Booking System -- Safe Pull Helper
==============================================

HOW TO RUN:
    python pull.py

WHAT THIS SCRIPT DOES:
    Teammates who ran start.py before the demo database was added to the
    repo will have a locally-generated campus_booking.db that Git cannot
    automatically replace on pull (it reports "untracked file would be
    overwritten by merge").

    This script resolves that by:
        1. Backing up any locally-generated database/demo files
        2. Running git pull to fetch the latest committed versions
        3. Printing a summary of what changed

    After running this script, run:
        python start.py

    The server will start with the committed 2500-user demo database.

MANUAL EQUIVALENT (if you prefer to do it yourself):
    # Remove locally-generated files that block the pull
    del backend\\database\\campus_booking.db
    del backend\\database\\demo_passwords.json
    del backend\\database\\demo_users_credentials.csv
    del backend\\database\\JCU_Demo_User_Database.xlsx

    git pull

    # If you still get a binary conflict after pull:
    git checkout --theirs backend/database/campus_booking.db
    git add backend/database/campus_booking.db
    git commit --no-edit
"""

import subprocess
import sys
import os
import shutil
import datetime

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR   = os.path.join(ROOT_DIR, "backend", "database")

# Files that may exist locally but are now tracked in the repo.
# We back them up then remove them so git pull can place the repo version.
MANAGED_FILES = [
    os.path.join(DB_DIR, "campus_booking.db"),
    os.path.join(DB_DIR, "demo_passwords.json"),
    os.path.join(DB_DIR, "demo_users_credentials.csv"),
    os.path.join(DB_DIR, "JCU_Demo_User_Database.xlsx"),
]

def banner(text):
    print("\n" + "=" * 60)
    print("  " + text)
    print("=" * 60)

def step(text):  print("  >> " + text)
def ok(text):    print("  [OK] " + text)
def warn(text):  print("  [!!] " + text)
def fail(text):  print("\n  [FAIL] " + text); sys.exit(1)

def run(cmd, capture=False):
    result = subprocess.run(cmd, shell=True, capture_output=capture,
                            text=True, cwd=ROOT_DIR)
    return result.returncode, result.stdout.strip()

# ---------------------------------------------------------------------------
# Step 1: Check whether any managed files block the pull
# ---------------------------------------------------------------------------

def check_untracked():
    """Return list of managed files that are locally present but untracked."""
    _, out = run("git status --porcelain", capture=True)
    untracked = []
    for path in MANAGED_FILES:
        rel = os.path.relpath(path, ROOT_DIR).replace("\\", "/")
        # Untracked files appear as "?? <path>" in porcelain output
        if ("?? " + rel) in out:
            untracked.append(path)
    return untracked

# ---------------------------------------------------------------------------
# Step 2: Back up and remove blocking files
# ---------------------------------------------------------------------------

def backup_and_remove(files):
    """Move each file to a .local-backup copy, then remove the original."""
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    for path in files:
        backup = path + ".local-backup-" + ts
        shutil.move(path, backup)
        rel = os.path.relpath(backup, ROOT_DIR)
        warn("Backed up local file -> " + rel)

# ---------------------------------------------------------------------------
# Step 3: Resolve any binary conflicts that survived the pull
# ---------------------------------------------------------------------------

def resolve_binary_conflicts():
    """Accept the repo (--theirs) version for any binary-conflicted db files."""
    _, out = run("git status --porcelain", capture=True)
    resolved = []
    for path in MANAGED_FILES:
        rel = os.path.relpath(path, ROOT_DIR).replace("\\", "/")
        # Both-modified conflict appears as "UU <path>" or "AA <path>"
        if any(out.startswith(marker + rel) or (" " + rel) in line
               for line in out.splitlines()
               for marker in ("UU ", "AA ", "DD ")):
            run("git checkout --theirs \"" + rel + "\"")
            run("git add \"" + rel + "\"")
            resolved.append(rel)
    if resolved:
        for r in resolved:
            ok("Resolved binary conflict (accepted repo version): " + r)
        run("git commit --no-edit")

# ---------------------------------------------------------------------------
# Step 4: git pull
# ---------------------------------------------------------------------------

def git_pull():
    step("Running git pull...")
    code, out = run("git pull", capture=True)
    if code != 0:
        # Try once more after resolving binary conflicts
        resolve_binary_conflicts()
        code, out = run("git pull", capture=True)
        if code != 0:
            fail(
                "git pull failed. Run manually and check the output:\n"
                "    git pull\n"
                "  If you see a binary conflict:\n"
                "    git checkout --theirs backend/database/campus_booking.db\n"
                "    git add backend/database/campus_booking.db\n"
                "    git commit --no-edit"
            )
    print()
    for line in out.splitlines():
        print("  " + line)

# ---------------------------------------------------------------------------
# Step 5: Verify the pulled database looks correct
# ---------------------------------------------------------------------------

def verify_db():
    db_path = os.path.join(DB_DIR, "campus_booking.db")
    if not os.path.isfile(db_path):
        warn("campus_booking.db not present after pull -- run python start.py to seed.")
        return
    import sqlite3
    try:
        conn   = sqlite3.connect(db_path)
        users  = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        rooms  = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
        conn.close()
        ok(f"Database ready: {users} users, {rooms} rooms")
    except Exception as e:
        warn("Could not verify database: " + str(e))

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    banner("JCU Campus Booking System -- Safe Pull")

    # Step 1: find locally-generated files that would block pull
    blocking = check_untracked()
    if blocking:
        step(f"Found {len(blocking)} locally-generated file(s) that would block git pull.")
        backup_and_remove(blocking)
    else:
        ok("No blocking untracked files found")

    # Step 2: pull
    git_pull()

    # Step 3: resolve any leftover binary conflicts
    resolve_binary_conflicts()

    # Step 4: verify
    verify_db()

    print()
    print("  Pull complete. Run  python start.py  to start the server.")
    print()

if __name__ == "__main__":
    main()
