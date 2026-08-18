"""Criterion: Duplicate deck code detection via POST /api/decks/preview."""

import uuid

import httpx

from .conftest import api_url

DEMO_EMAIL = "demo@deckstash.app"
DEMO_PASSWORD = "tavern123"
SEEDED_CODE = (
    "AAECAfHhBAyV5ATDgweRqwfSrgeosQfQvwfqyQf2yQeb1Ae/3wey4wf85wcJodQEh/YEgf0GloIHl4IHvJQHupUHmsUH0MUHAAA="
)


def _login(c: httpx.Client):
    r = c.post(api_url("/auth/login"), json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text


def test_preview_decodes_new_code():
    with httpx.Client(timeout=30.0) as c:
        _login(c)
        r = c.post(api_url("/decks/preview"), json={"code": SEEDED_CODE})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["hero_class_name"] == "Death Knight"
        assert data["format"] == "Standard"
        assert data["card_count"] == 30
        assert data["dust_cost"] == 13440


def test_preview_flags_duplicate_of_existing_deck():
    with httpx.Client(timeout=30.0) as c:
        _login(c)
        r = c.post(api_url("/decks/preview"), json={"code": SEEDED_CODE})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("duplicate_of_id") is not None, data
        assert data.get("duplicate_of_name") == "My First Import", data
