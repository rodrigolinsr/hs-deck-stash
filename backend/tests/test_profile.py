"""Profile details and credential changes remain available to signed-in users."""
from __future__ import annotations

import uuid

import httpx

from .conftest import api_url


def test_profile_update_changes_name_email_and_password():
    original_email = f"profile-{uuid.uuid4().hex[:12]}@gmail.com"
    updated_email = f"updated-{uuid.uuid4().hex[:12]}@gmail.com"
    username = f"Test Deck Keeper {uuid.uuid4().hex[:8]}"
    original_password = "original-password"
    new_password = "new-password-123"

    with httpx.Client(timeout=30.0) as client:
        signup = client.post(
            api_url("/auth/signup"),
            json={"email": original_email, "password": original_password},
        )
        assert signup.status_code == 200, signup.text

        updated = client.patch(
            api_url("/auth/profile"),
            json={
                "display_name": username,
                "email": updated_email,
                "current_password": original_password,
                "new_password": new_password,
            },
        )
        assert updated.status_code == 200, updated.text
        assert updated.json() == {
            "id": signup.json()["id"],
            "email": updated_email,
            "display_name": username,
            "email_verified": False,
        }
        me = client.get(api_url("/auth/me"))
        assert me.status_code == 200, me.text
        assert me.json()["display_name"] == username

    with httpx.Client(timeout=30.0) as client:
        assert client.post(
            api_url("/auth/login"), json={"email": updated_email, "password": original_password}
        ).status_code == 401
        assert client.post(
            api_url("/auth/login"), json={"email": updated_email, "password": new_password}
        ).status_code == 200
