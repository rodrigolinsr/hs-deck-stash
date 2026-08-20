"""Password reset token handling remains correct with MongoDB's naive UTC dates."""
from __future__ import annotations

import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from pymongo import MongoClient

from .conftest import api_url


def test_password_reset_accepts_mongo_naive_utc_expiry():
    email = f"reset-{uuid.uuid4().hex[:12]}@example.com"
    raw_token = secrets.token_urlsafe(32)
    with httpx.Client(timeout=30.0) as client:
        signup = client.post(api_url("/auth/signup"), json={"email": email, "password": "old-password", "display_name": f"Reset {uuid.uuid4().hex[:8]}"})
        assert signup.status_code == 200, signup.text

        database = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        database.users.update_one({"id": signup.json()["id"]}, {"$set": {
            "password_reset_token_hash": hashlib.sha256(raw_token.encode()).hexdigest(),
            "password_reset_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).replace(tzinfo=None),
        }})

        reset = client.post(api_url("/auth/password-reset/confirm"), json={"token": raw_token, "new_password": "new-password"})
        assert reset.status_code == 200, reset.text
        assert client.post(api_url("/auth/login"), json={"email": email, "password": "new-password"}).status_code == 200
