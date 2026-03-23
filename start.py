# -*- coding: utf-8 -*-
"""
JCU Campus Booking System -- Launcher
======================================

HOW TO RUN:
    python start.py

WHAT THIS SCRIPT DOES:
    1. Checks that Node.js is installed
    2. Installs npm dependencies if node_modules is missing
    3. Creates the SQLite database schema if the .db file does not exist
    4. Seeds the database with 173 rooms and 3 test users if it is empty
    5. Starts the Express API server on http://localhost:3001
    6. Waits until the server is ready (polls /api/health)
    7. Opens the frontend (Search study room/index.html) in the default browser

MANUAL EQUIVALENTS (run from the backend/ folder):
    npm install                             # install dependencies
    node database/init-db.js               # create schema
    node database/seed.js                  # seed rooms and users
    node server.js                         # start API server on port 3001
    curl http://localhost:3001/api/health  # confirm server is up

TEST ACCOUNTS:
    Student  14100001  password: 01011990
    Student  14100002  password: 02021992
    Admin    st0001    password: 03031985

TO STOP THE SERVER:
    Press Ctrl+C in this terminal window.
"""

import subprocess
import sys
import os
import time
import webbrowser
import urllib.request
import urllib.error

# -- Path constants -----------------------------------------------------------

ROOT_DIR      = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR   = os.path.join(ROOT_DIR, "backend")
DB_PATH       = os.path.join(BACKEND_DIR, "database", "campus_booking.db")
INIT_SCRIPT   = os.path.join(BACKEND_DIR, "database", "init-db.js")
SEED_SCRIPT   = os.path.join(BACKEND_DIR, "database", "seed.js")
SERVER_SCRIPT = os.path.join(BACKEND_DIR, "server.js")
FRONTEND_PATH = os.path.join(ROOT_DIR, "Search study room", "index.html")
NODE_MODULES  = os.path.join(BACKEND_DIR, "node_modules")

SERVER_URL    = "http://localhost:3001"
HEALTH_URL    = SERVER_URL + "/api/health"
SERVER_PORT   = 3001
POLL_INTERVAL = 0.5   # seconds between readiness checks
POLL_TIMEOUT  = 30    # seconds before giving up

# -- Helpers ------------------------------------------------------------------

def banner(text):
    print("\n" + "=" * 54)
    print("  " + text)
    print("=" * 54)

def step(text):
    print("  >> " + text)

def ok(text):
    print("  [OK] " + text)

def warn(text):
    print("  [!!] " + text)

def fail(text):
    print("\n  [FAIL] " + text)
    sys.exit(1)

def run(cmd, cwd=None, capture=False):
    """Run a shell command; return (returncode, stdout)."""
    result = subprocess.run(
        cmd,
        cwd=cwd,
        shell=True,
        capture_output=capture,
        text=True,
    )
    return result.returncode, result.stdout.strip() if capture else ""

# -- Step 1: Check Node.js ----------------------------------------------------

def check_node():
    step("Checking for Node.js...")
    code, out = run("node --version", capture=True)
    if code != 0:
        fail(
            "Node.js is not installed or not on PATH.\n"
            "  Download it from https://nodejs.org/ (v18 or higher recommended)."
        )
    ok("Node.js found: " + out)

# -- Step 2: Install npm dependencies -----------------------------------------

def install_dependencies():
    if os.path.isdir(NODE_MODULES):
        ok("node_modules already present, skipping npm install")
        return
    step("Installing npm dependencies (first run only)...")
    code, _ = run("npm install", cwd=BACKEND_DIR)
    if code != 0:
        fail("npm install failed. Check your internet connection and try again.")
    ok("npm install complete")

# -- Step 3: Initialise database schema ---------------------------------------

def init_database():
    if os.path.isfile(DB_PATH):
        ok("Database found: " + os.path.relpath(DB_PATH, ROOT_DIR))
        return
    step("Database not found -- creating schema...")
    code, _ = run('node "' + INIT_SCRIPT + '"', cwd=BACKEND_DIR)
    if code != 0:
        fail("init-db.js failed. Check backend/database/schema.sql.")
    ok("Schema created")

# -- Step 4: Seed database if empty -------------------------------------------

def seed_database():
    """Seed only when the rooms table is empty (fresh database)."""
    import sqlite3
    try:
        conn = sqlite3.connect(DB_PATH)
        count = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
        conn.close()
    except Exception:
        count = 0

    if count >= 173:
        ok("Database already seeded (" + str(count) + " rooms)")
        return

    step("Seeding database with rooms and test users...")
    code, out = run('node "' + SEED_SCRIPT + '"', cwd=BACKEND_DIR, capture=True)
    if code != 0:
        fail("seed.js failed.")
    ok(out if out else "Seed complete")

# -- Step 5: Check port availability ------------------------------------------

def check_port():
    """Return True if the server is already running on port 3001."""
    try:
        urllib.request.urlopen(HEALTH_URL, timeout=1)
        warn(
            "Port " + str(SERVER_PORT) + " already in use -- "
            "a server may already be running.\n"
            "  Skipping server start and opening the browser."
        )
        return True
    except Exception:
        return False

# -- Step 6: Start the server -------------------------------------------------

def start_server():
    step("Starting API server on " + SERVER_URL + " ...")
    proc = subprocess.Popen(
        ["node", SERVER_SCRIPT],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return proc

# -- Step 7: Wait for server to be ready --------------------------------------

def wait_for_server(proc):
    step("Waiting for server to be ready (timeout " + str(POLL_TIMEOUT) + "s)...")
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        if proc.poll() is not None:
            output = proc.stdout.read()
            fail("Server process exited early.\n  Output:\n" + output)
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=2) as resp:
                if resp.status == 200:
                    ok("Server is ready at " + SERVER_URL)
                    return
        except Exception:
            pass
        time.sleep(POLL_INTERVAL)
    fail(
        "Server did not respond within " + str(POLL_TIMEOUT) + " seconds.\n"
        "  Check " + os.path.relpath(SERVER_SCRIPT, ROOT_DIR) + " for errors."
    )

# -- Step 8: Open the browser -------------------------------------------------

def open_browser():
    frontend_url = (
        "file:///"
        + FRONTEND_PATH.replace("\\", "/").replace(" ", "%20")
    )
    step("Opening frontend in browser...")
    webbrowser.open(frontend_url)
    ok("Browser opened: " + frontend_url)

# -- Step 9: Keep server alive ------------------------------------------------

def keep_alive(proc):
    print()
    print("  Server is running. Press Ctrl+C to stop.")
    print("  API  : " + HEALTH_URL)
    print("  UI   : file:///"
          + FRONTEND_PATH.replace("\\", "/").replace(" ", "%20"))
    print()
    try:
        for line in proc.stdout:
            print("  [server] " + line, end="")
    except KeyboardInterrupt:
        pass
    finally:
        proc.terminate()
        proc.wait()
        print("\n  Server stopped.")

# -- Main ---------------------------------------------------------------------

def main():
    banner("JCU Campus Booking System -- Starting Up")

    check_node()
    install_dependencies()
    init_database()
    seed_database()

    already_running = check_port()
    if already_running:
        open_browser()
        return

    proc = start_server()
    wait_for_server(proc)
    open_browser()
    keep_alive(proc)

if __name__ == "__main__":
    main()
