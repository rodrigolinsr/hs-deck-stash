"""Email + password auth with an httpOnly JWT session cookie."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Cookie, HTTPException, Response

from lib.db import db

COOKIE_NAME = "ds_session"
SESSION_DAYS = 30
_SECRET = os.environ.get("SESSION_SECRET")
if not _SECRET:
    raise RuntimeError("SESSION_SECRET must be set; refusing to use an insecure default")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120_000)
    return hmac.compare_digest(digest.hex(), expected)


def is_https(request: Request) -> bool:
    """The preview embeds the app in a cross-site iframe over https; plain local runs are http."""
    forwarded = request.headers.get("x-forwarded-proto", "")
    if forwarded:
        return forwarded.split(",")[0].strip() == "https"
    return request.url.scheme == "https"


def _cookie_header(value: str, max_age: int | None, request: Request) -> str:
    # Over https the cookie must be SameSite=None so it rides fetches made from the
    # cross-site preview iframe; Partitioned keeps it working with 3rd-party cookie blocking.
    parts = [f"{COOKIE_NAME}={value}", "Path=/", "HttpOnly"]
    if max_age is not None:
        parts.append(f"Max-Age={max_age}")
    if is_https(request):
        parts += ["SameSite=None", "Secure", "Partitioned"]
    else:
        parts.append("SameSite=Lax")
    return "; ".join(parts)


def set_session_cookie(response: Response, user: dict[str, Any], request: Request, remember_me: bool = True) -> None:
    token = jwt.encode(
        {
            "sub": user["id"],
            "sv": user.get("session_version", 0),
            "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
        },
        _SECRET,
        algorithm="HS256",
    )
    response.headers.append(
        "set-cookie", _cookie_header(token, SESSION_DAYS * 86400 if remember_me else None, request)
    )


def clear_session_cookie(response: Response, request: Request) -> None:
    # Same attributes as when it was set, otherwise the browser keeps the old cookie.
    response.headers.append("set-cookie", _cookie_header("", 0, request))


async def current_user(ds_session: str | None = Cookie(default=None)) -> dict[str, Any]:
    if not ds_session:
        raise HTTPException(status_code=401, detail="Not signed in")
    try:
        payload = jwt.decode(ds_session, _SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Session expired") from exc
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Not signed in")
    if payload.get("sv", 0) != user.get("session_version", 0):
        raise HTTPException(status_code=401, detail="Session expired")
    return user
