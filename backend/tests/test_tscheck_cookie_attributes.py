"""Criterion: Session cookie attributes are correct behind HTTP(S) proxies."""

import httpx

from .conftest import api_url

DEMO_EMAIL = "demo@deckstash.app"
DEMO_PASSWORD = "tavern123"


def _set_cookie_header(resp: httpx.Response) -> str:
    headers = resp.headers.get_list("set-cookie") if hasattr(resp.headers, "get_list") else []
    for h in headers:
        if h.startswith("ds_session="):
            return h
    # fallback: httpx merges headers, try raw
    return resp.headers.get("set-cookie", "")


def test_localhost_cookie_is_samesite_lax():
    with httpx.Client(timeout=30.0) as c:
        r = c.post(api_url("/auth/login"), json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        cookie_header = _set_cookie_header(r)
        assert "ds_session=" in cookie_header
        assert "SameSite=Lax" in cookie_header


def test_https_proxy_cookie_is_samesite_none_secure_partitioned():
    with httpx.Client(timeout=30.0) as c:
        r = c.post(
            api_url("/auth/login"),
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            headers={"x-forwarded-proto": "https"},
        )
        assert r.status_code == 200, r.text
        cookie_header = _set_cookie_header(r)
        assert "ds_session=" in cookie_header
        assert "SameSite=None" in cookie_header
        assert "Secure" in cookie_header
        assert "Partitioned" in cookie_header
        assert "HttpOnly" in cookie_header
