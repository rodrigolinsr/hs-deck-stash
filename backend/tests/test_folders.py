"""Folders are private, unique per user, and safe to remove."""
from __future__ import annotations

import uuid

import httpx

from .conftest import api_url

CODE = "AAECAfHhBAyV5ATDgweRqwfSrgeosQfQvwfqyQf2yQeb1Ae/3wey4wf85wcJodQEh/YEgf0GloIHl4IHvJQHupUHmsUH0MUHAAA="

def test_folder_lifecycle():
    email = f"folders-{uuid.uuid4().hex[:12]}@gmail.com"
    with httpx.Client(timeout=30.0) as client:
        signup = client.post(api_url("/auth/signup"), json={"email": email, "password": "folder-password"})
        assert signup.status_code == 200, signup.text

        created = client.post(api_url("/folders"), json={"name": "  Legend   Climb  "})
        assert created.status_code == 200, created.text
        folder = created.json()
        assert folder["name"] == "Legend Climb"

        duplicate = client.post(api_url("/folders"), json={"name": "legend climb"})
        assert duplicate.status_code == 409, duplicate.text

        listed = client.get(api_url("/folders"))
        assert listed.status_code == 200, listed.text
        assert [item["id"] for item in listed.json()] == [folder["id"]]

        renamed = client.patch(api_url(f"/folders/{folder['id']}"), json={"name": "Streams"})
        assert renamed.status_code == 200, renamed.text
        assert renamed.json()["name"] == "Streams"

        deck = client.post(api_url("/decks"), json={"name": "Folder test deck", "code": CODE, "folder_id": folder["id"]})
        assert deck.status_code == 200, deck.text
        assert deck.json()["folder_id"] == folder["id"]

        deleted = client.delete(api_url(f"/folders/{folder['id']}"))
        assert deleted.status_code == 200, deleted.text
        assert deleted.json() == {"deleted": True, "unfoldered_decks": 1}
        decks = client.get(api_url("/decks"))
        assert decks.status_code == 200, decks.text
        assert next(item for item in decks.json() if item["id"] == deck.json()["id"])["folder_id"] is None
