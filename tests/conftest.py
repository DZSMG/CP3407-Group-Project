import requests
import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from config import (BASE_URL, TEST_STUDENT_1, TEST_STUDENT_2, TEST_ADMIN)


class APIClient:
    """Reusable HTTP client for the booking system API."""

    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()

    def set_token(self, token):
        self.token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def clear_token(self):
        self.token = None
        self.session.headers.pop("Authorization", None)

    def get(self, path, params=None):
        return self.session.get(f"{self.base_url}{path}", params=params, timeout=10)

    def post(self, path, json=None):
        return self.session.post(f"{self.base_url}{path}", json=json, timeout=10)

    def patch(self, path, json=None):
        return self.session.patch(f"{self.base_url}{path}", json=json, timeout=10)

    def login(self, student_id, password):
        resp = self.post("/auth/login", {"studentId": student_id, "password": password})
        if resp.status_code == 200:
            self.set_token(resp.json()["token"])
        return resp

    def login_as_student(self):
        return self.login(TEST_STUDENT_1["studentId"], TEST_STUDENT_1["password"])

    def login_as_student2(self):
        return self.login(TEST_STUDENT_2["studentId"], TEST_STUDENT_2["password"])

    def login_as_admin(self):
        return self.login(TEST_ADMIN["studentId"], TEST_ADMIN["password"])


def get_future_date(days_ahead=1):
    """Return YYYY-MM-DD for a date N days from today."""
    return (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def get_today():
    return datetime.now().strftime("%Y-%m-%d")


def write_json_report(suite_name, filename, results, passed, failed):
    """Write a structured JSON test report to tests/reports/<filename>."""
    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    os.makedirs(reports_dir, exist_ok=True)
    report = {
        "suite": suite_name,
        "file": filename,
        "timestamp": datetime.now().isoformat(),
        "passed": passed,
        "failed": failed,
        "total": passed + failed,
        "tests": results,
    }
    out_path = os.path.join(reports_dir, filename)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)
    return out_path
