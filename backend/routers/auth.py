from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response

from lib.auth import (
    clear_session_cookie,
    current_user,
    hash_password,
    set_session_cookie,
    verify_password,
)
from lib.db import db
from lib.email import send_password_reset_email, send_verification_email
from models.schemas import LoginRequest, PasswordResetConfirmRequest, PasswordResetRequest, ProfileUpdateRequest, SignupRequest, TokenRequest, User, new_id

router = APIRouter(prefix="/auth")


def identity_key(value: str) -> str:
    """Use a space-normalized, case-insensitive key for account identifiers."""
    return " ".join(value.strip().split()).casefold()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(value: datetime | None) -> datetime:
    """MongoDB commonly returns UTC datetimes without a tzinfo value."""
    if not isinstance(value, datetime):
        return _now()
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode()).hexdigest()


def _verified(user: dict) -> bool:
    return bool(user.get("email_verified_at"))


async def _prepare_verification(user_id: str) -> str:
    raw, token_hash = _token()
    await db.users.update_one({"id": user_id}, {"$set": {
        "email_verification_token_hash": token_hash,
        "email_verification_expires_at": _now() + timedelta(hours=24),
        "email_verification_sent_at": _now(),
    }})
    return raw


def user_response(user: dict) -> User:
    """Return a complete profile for both new and pre-profile accounts."""
    name = (user.get("display_name") or user["email"].split("@", 1)[0]).strip()
    return User(id=user["id"], email=user["email"], display_name=name, email_verified=_verified(user))


@router.post("/signup", response_model=User)
async def signup(payload: SignupRequest, request: Request, response: Response, background_tasks: BackgroundTasks):
    email = payload.email.lower().strip()
    display_name = " ".join((payload.display_name or email.split("@", 1)[0]).strip().split())
    if await db.users.find_one({"email_key": identity_key(email)}):
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    if await db.users.find_one({"username_key": identity_key(display_name)}):
        raise HTTPException(status_code=409, detail="That username is already taken")
    user = {
        "id": new_id(),
        "email": email,
        "email_key": identity_key(email),
        "display_name": display_name,
        "username_key": identity_key(display_name),
        "password": hash_password(payload.password),
        "session_version": 0,
    }
    await db.users.insert_one(dict(user))
    token = await _prepare_verification(user["id"])
    background_tasks.add_task(send_verification_email, email, token)
    set_session_cookie(response, user, request, payload.remember_me)
    return user_response(user)


@router.post("/login", response_model=User)
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_session_cookie(response, user, request, payload.remember_me)
    return user_response(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    clear_session_cookie(response, request)
    return {"ok": True}


@router.get("/me", response_model=User)
async def me(user: dict = Depends(current_user)):
    return user_response(user)


@router.post("/verify-email", response_model=User)
async def verify_email(payload: TokenRequest):
    user = await db.users.find_one({"email_verification_token_hash": hashlib.sha256(payload.token.encode()).hexdigest()}, {"_id": 0})
    if not user or _utc(user.get("email_verification_expires_at")) < _now():
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired")
    await db.users.update_one({"id": user["id"]}, {"$set": {"email_verified_at": _now()}, "$unset": {"email_verification_token_hash": "", "email_verification_expires_at": ""}})
    return user_response({**user, "email_verified_at": _now()})


@router.post("/resend-verification")
async def resend_verification(background_tasks: BackgroundTasks, user: dict = Depends(current_user)):
    if _verified(user):
        return {"sent": False, "detail": "Your email is already verified"}
    last_sent = user.get("email_verification_sent_at")
    if isinstance(last_sent, datetime) and _utc(last_sent) + timedelta(seconds=60) > _now():
        raise HTTPException(status_code=429, detail="Please wait a minute before requesting another email")
    token = await _prepare_verification(user["id"])
    background_tasks.add_task(send_verification_email, user["email"], token)
    return {"sent": True}


@router.post("/password-reset")
async def password_reset(payload: PasswordResetRequest, background_tasks: BackgroundTasks):
    # Always return the same response so this endpoint cannot reveal registered emails.
    email = str(payload.email).strip().lower()
    user = await db.users.find_one({"email_key": identity_key(email)}, {"_id": 0})
    last_sent = user.get("password_reset_sent_at") if user else None
    if user and (not isinstance(last_sent, datetime) or _utc(last_sent) + timedelta(seconds=60) <= _now()):
        raw, token_hash = _token()
        await db.users.update_one({"id": user["id"]}, {"$set": {
            "password_reset_token_hash": token_hash,
            "password_reset_expires_at": _now() + timedelta(hours=1),
            "password_reset_sent_at": _now(),
        }})
        background_tasks.add_task(send_password_reset_email, user["email"], raw)
    return {"ok": True}


@router.post("/password-reset/confirm")
async def confirm_password_reset(payload: PasswordResetConfirmRequest):
    user = await db.users.find_one({"password_reset_token_hash": hashlib.sha256(payload.token.encode()).hexdigest()}, {"_id": 0})
    if not user or _utc(user.get("password_reset_expires_at")) < _now():
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has expired")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(payload.new_password)}, "$inc": {"session_version": 1}, "$unset": {"password_reset_token_hash": "", "password_reset_expires_at": ""}})
    return {"ok": True}


@router.patch("/profile", response_model=User)
async def update_profile(payload: ProfileUpdateRequest, background_tasks: BackgroundTasks, user: dict = Depends(current_user)):
    updates: dict[str, str] = {}

    if payload.display_name is not None:
        display_name = " ".join(payload.display_name.strip().split())
        if not display_name:
            raise HTTPException(status_code=422, detail="Username cannot be blank")
        existing = await db.users.find_one({"username_key": identity_key(display_name), "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=409, detail="That username is already taken")
        updates["display_name"] = display_name
        updates["username_key"] = identity_key(display_name)

    verification_token: str | None = None
    if payload.email is not None:
        email = str(payload.email).lower().strip()
        if identity_key(email) != user.get("email_key", identity_key(user["email"])):
            existing = await db.users.find_one({"email_key": identity_key(email), "id": {"$ne": user["id"]}})
            if existing:
                raise HTTPException(status_code=409, detail="An account with that email already exists")
            updates["email"] = email
            updates["email_key"] = identity_key(email)
            updates["email_verified_at"] = None
            verification_token, verification_hash = _token()
            updates["email_verification_token_hash"] = verification_hash
            updates["email_verification_expires_at"] = _now() + timedelta(hours=24)
            updates["email_verification_sent_at"] = _now()

    if payload.new_password is not None:
        if not verify_password(payload.current_password or "", user.get("password", "")):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        updates["password"] = hash_password(payload.new_password)

    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user = {**user, **updates}

    if verification_token:
        background_tasks.add_task(send_verification_email, user["email"], verification_token)

    return user_response(user)
