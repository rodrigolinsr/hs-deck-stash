"""Usernames and emails are unique regardless of casing or extra spaces."""
from __future__ import annotations

import uuid

import httpx

from .conftest import api_url


def test_username_and_email_are_case_insensitively_unique():
    token = uuid.uuid4().hex[:12]
    email = f"identity-{token}@example.com"
    with httpx.Client(timeout=30.0) as client:
        created = client.post(
            api_url("/auth/signup"),
            json={"email": email, "password": "password-123", "display_name": f"Deck Keeper {token}"},
        )
        assert created.status_code == 200, created.text

        duplicate_username = client.post(
            api_url("/auth/signup"),
            json={"email": f"other-{token}@example.com", "password": "password-123", "display_name": f"  deck   keeper {token.upper()}  "},
        )
        assert duplicate_username.status_code == 409, duplicate_username.text
        assert duplicate_username.json()["detail"] == "That username is already taken"

        duplicate_email = client.post(
            api_url("/auth/signup"),
            json={"email": email.upper(), "password": "password-123", "display_name": f"Another {token}"},
        )
        assert duplicate_email.status_code == 409, duplicate_email.text
        assert duplicate_email.json()["detail"] == "An account with that email already exists"
