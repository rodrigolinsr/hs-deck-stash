"""Criterion: Login with the demo account works and the session survives navigation."""

import httpx

from .conftest import api_url

DEMO_EMAIL = "demo@deckstash.app"
DEMO_PASSWORD = "tavern123"


def test_login_sets_session_and_me_decks_work():
    with httpx.Client(timeout=30.0) as c:
        r = c.post(api_url("/auth/login"), json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == DEMO_EMAIL
        assert "ds_session" in c.cookies

        me = c.get(api_url("/auth/me"))
        assert me.status_code == 200, me.text
        assert me.json()["email"] == DEMO_EMAIL

        decks = c.get(api_url("/decks"))
        assert decks.status_code == 200, decks.text
        deck_list = decks.json()
        assert isinstance(deck_list, list)
        assert any(d.get("name") == "My First Import" for d in deck_list)


def test_login_wrong_password_rejected():
    with httpx.Client(timeout=30.0) as c:
        r = c.post(api_url("/auth/login"), json={"email": DEMO_EMAIL, "password": "wrong-pass"})
        assert r.status_code in (400, 401), r.text
