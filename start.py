# -*- coding: utf-8 -*-
"""
JCU Campus Booking System -- Launcher
======================================

HOW TO RUN:
    python start.py

WHAT THIS SCRIPT DOES (in order):
    0. Installs missing Python packages (requests, openpyxl)
    1. Checks that Node.js >= 18 is installed
    2. Installs npm dependencies if node_modules/ is missing
    3. Creates the SQLite database schema if campus_booking.db does not exist
    4. Seeds the database with 173 rooms if it is empty
    5. Checks whether port 3001 is already in use
    6. Starts the Express API server on http://localhost:3001
    7. Polls /api/health until the server is ready (30 s timeout)
    8. Opens Search study room/index.html in the default browser
    9. Streams server logs until Ctrl+C

MANUAL SETUP (run each command from the project root):
    # --- Node / Backend ---
    cd backend
    npm install                              # install Node dependencies
    node database/init-db.js                 # create SQLite schema
    node database/seed.js                    # seed 173 rooms + 3 test users
    node server.js                           # start API on port 3001
    curl http://localhost:3001/api/health    # confirm server is alive

    # --- Demo users (optional, overwrites seed users) ---
    cd backend/database
    pip install -r ../../requirements.txt    # install Python packages
    python generate_demo_users.py            # generate 2500 demo accounts
    python export_users_xlsx.py              # export Excel spreadsheet
    node seed-demo-users.js                  # reload demo users via Node
    python verify_demo_db.py                 # verify all checks pass

    # --- Python tests ---
    cd tests
    python run_all_tests.py                  # run all 51 API tests
    # reports written to tests/reports/

DEMO TEST ACCOUNTS (after running generate_demo_users.py):
    Role     ID          Password (plaintext, from demo_passwords.json)
    ----     ----------  -----------------------------------------------
    student  jc100001    see backend/database/demo_passwords.json
    student  jc100002    see backend/database/demo_passwords.json
    staff    st0001      see backend/database/demo_passwords.json
    admin    ad0001      see backend/database/demo_passwords.json

DEFAULT SEED TEST ACCOUNTS (before running demo generator):
    Role     ID          Password
    ----     ----------  --------
    student  14100001    01011990
    student  14100002    02021992
    admin    st0001      03031985

PYTHON DEPENDENCIES (see requirements.txt):
    requests  -- used by the automated test suite (tests/)
    openpyxl  -- used by export_users_xlsx.py for Excel export

NODE DEPENDENCIES (see backend/package.json):
    express         -- HTTP server framework
    better-sqlite3  -- synchronous SQLite driver
    bcryptjs        -- password hashing (register endpoint)
    jsonwebtoken    -- JWT auth tokens
    cors            -- cross-origin request headers

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

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

ROOT_DIR      = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR   = os.path.join(ROOT_DIR, "backend")
DB_PATH       = os.path.join(BACKEND_DIR, "database", "campus_booking.db")
INIT_SCRIPT   = os.path.join(BACKEND_DIR, "database", "init-db.js")
SEED_SCRIPT   = os.path.join(BACKEND_DIR, "database", "seed.js")
SERVER_SCRIPT = os.path.join(BACKEND_DIR, "server.js")
FRONTEND_PATH = os.path.join(ROOT_DIR, "Search study room", "index.html")
NODE_MODULES  = os.path.join(BACKEND_DIR, "node_modules")
REQUIREMENTS  = os.path.join(ROOT_DIR, "requirements.txt")

SERVER_URL    = "http://localhost:3001"
HEALTH_URL    = SERVER_URL + "/api/health"
SERVER_PORT   = 3001
POLL_INTERVAL = 0.5   # seconds between /health poll attempts
POLL_TIMEOUT  = 30    # seconds before giving up waiting for the server

# ---------------------------------------------------------------------------
# Console helpers
# ---------------------------------------------------------------------------

def banner(text):
    print("\n" + "=" * 60)
    print("  " + text)
    print("=" * 60)

def step(label):
    print("  >> " + label)

def ok(label):
    print("  [OK] " + label)

def warn(label):
    print("  [!!] " + label)

def fail(label):
    print("\n  [FAIL] " + label)
    sys.exit(1)

def run(cmd, cwd=None, capture=False):
    """Run a shell command and return (returncode, stdout_str)."""
    result = subprocess.run(
        cmd,
        cwd=cwd,
        shell=True,
        capture_output=capture,
        text=True,
    )
    return result.returncode, result.stdout.strip() if capture else ""

# ---------------------------------------------------------------------------
# Step 0: Install missing Python packages
# ---------------------------------------------------------------------------

# Packages required by the test suite and demo-user scripts.
# Names map to their importable module name where they differ.
PYTHON_DEPS = {
    "requests": "requests",    # automated test suite
    "openpyxl": "openpyxl",    # Excel export for demo database
}

def install_python_deps():
    """Import-check each package; pip-install any that are missing."""
    missing = []
    for pkg, module in PYTHON_DEPS.items():
        try:
            __import__(module)
        except ImportError:
            missing.append(pkg)

    if not missing:
        ok("Python packages already installed: " + ", ".join(PYTHON_DEPS))
        return

    step("Installing missing Python packages: " + ", ".join(missing))
    pkg_list = " ".join(missing)
    code, _ = run(f'"{sys.executable}" -m pip install {pkg_list} -q')
    if code != 0:
        # Non-fatal: tests and Excel export may fail later, but the server
        # and frontend will still work without these packages.
        warn(
            "pip install failed for: " + pkg_list + "\n"
            "  The server and frontend will still start.\n"
            "  To fix manually: pip install -r requirements.txt"
        )
        return
    ok("Installed: " + ", ".join(missing))

# ---------------------------------------------------------------------------
# Step 1: Check Node.js is installed
# ---------------------------------------------------------------------------

def check_node():
    """Verify Node.js is on PATH; print the version found."""
    step("Checking for Node.js...")
    code, version = run("node --version", capture=True)
    if code != 0:
        fail(
            "Node.js is not installed or not on PATH.\n"
            "  Download it from https://nodejs.org/ (v18 or higher recommended)."
        )
    ok("Node.js found: " + version)

# ---------------------------------------------------------------------------
# Step 2: Install npm dependencies
# ---------------------------------------------------------------------------

def install_npm_deps():
    """Run 'npm install' in backend/ if node_modules/ does not yet exist."""
    if os.path.isdir(NODE_MODULES):
        ok("node_modules already present, skipping npm install")
        return
    step("Installing npm dependencies (first run only)...")
    code, _ = run("npm install", cwd=BACKEND_DIR)
    if code != 0:
        fail("npm install failed. Check your internet connection and try again.")
    ok("npm install complete")

# ---------------------------------------------------------------------------
# Step 3: Initialise the SQLite database schema
# ---------------------------------------------------------------------------

def init_database():
    """Create the .db file and tables via init-db.js if they don't exist."""
    if os.path.isfile(DB_PATH):
        ok("Database found: " + os.path.relpath(DB_PATH, ROOT_DIR))
        return
    step("Database not found -- creating schema...")
    code, _ = run('node "' + INIT_SCRIPT + '"', cwd=BACKEND_DIR)
    if code != 0:
        fail("init-db.js failed. Check backend/database/schema.sql.")
    ok("Schema created")

# ---------------------------------------------------------------------------
# Step 4: Seed the database if empty
# ---------------------------------------------------------------------------

def seed_database():
    """Seed rooms and default test users when the rooms table is empty."""
    import sqlite3
    try:
        conn  = sqlite3.connect(DB_PATH)
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
        fail("seed.js failed. Check backend/database/seed.js.")
    ok(out if out else "Seed complete")

# ---------------------------------------------------------------------------
# Step 5: Check whether port 3001 is already in use
# ---------------------------------------------------------------------------

def check_port():
    """Return True if the server is already listening on port 3001."""
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

# ---------------------------------------------------------------------------
# Step 6: Start the Express API server
# ---------------------------------------------------------------------------

def start_server():
    """Launch 'node server.js' as a background subprocess and return it."""
    step("Starting API server on " + SERVER_URL + " ...")
    proc = subprocess.Popen(
        ["node", SERVER_SCRIPT],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return proc

# ---------------------------------------------------------------------------
# Step 7: Wait for the server to be ready
# ---------------------------------------------------------------------------

def wait_for_server(proc):
    """Poll /api/health until 200 OK or the timeout is reached."""
    step(
        "Waiting for server to be ready "
        "(timeout " + str(POLL_TIMEOUT) + " s)..."
    )
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        if proc.poll() is not None:          # process exited unexpectedly
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

# ---------------------------------------------------------------------------
# Step 8: Open the frontend in the default browser
# ---------------------------------------------------------------------------

def open_browser():
    """Build a file:// URL from FRONTEND_PATH and open it."""
    frontend_url = (
        "file:///"
        + FRONTEND_PATH.replace("\\", "/").replace(" ", "%20")
    )
    step("Opening frontend in browser...")
    webbrowser.open(frontend_url)
    ok("Browser opened: " + frontend_url)

# ---------------------------------------------------------------------------
# Step 9: Stream server logs until Ctrl+C
# ---------------------------------------------------------------------------

def keep_alive(proc):
    """Print server stdout lines and gracefully stop on Ctrl+C."""
    print()
    print("  Server is running. Press Ctrl+C to stop.")
    print("  API    : " + HEALTH_URL)
    print("  Health : " + HEALTH_URL)
    print("  UI     : file:///"
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

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    banner("JCU Campus Booking System -- Starting Up")

    install_python_deps()   # Step 0: Python packages
    check_node()            # Step 1: Node.js
    install_npm_deps()      # Step 2: npm install
    init_database()         # Step 3: SQLite schema
    seed_database()         # Step 4: seed rooms/users

    already_running = check_port()   # Step 5: port check
    if already_running:
        open_browser()               # Step 8: open browser (skip 6 & 7)
        return

    proc = start_server()            # Step 6: launch server
    wait_for_server(proc)            # Step 7: health poll
    open_browser()                   # Step 8: open browser
    keep_alive(proc)                 # Step 9: stream logs


if __name__ == "__main__":
    main()
