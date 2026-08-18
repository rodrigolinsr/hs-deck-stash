from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import (
    clear_session_cookie,
    current_user,
    hash_password,
    set_session_cookie,
    verify_password,
)
from lib.db import db
from models.schemas import LoginRequest, ProfileUpdateRequest, SignupRequest, User, new_id

router = APIRouter(prefix="/auth")


def user_response(user: dict) -> User:
    """Return a complete profile for both new and pre-profile accounts."""
    name = (user.get("display_name") or user["email"].split("@", 1)[0]).strip()
    return User(id=user["id"], email=user["email"], display_name=name)


@router.post("/signup", response_model=User)
async def signup(payload: SignupRequest, request: Request, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    user = {
        "id": new_id(),
        "email": email,
        "display_name": email.split("@", 1)[0],
        "password": hash_password(payload.password),
    }
    await db.users.insert_one(dict(user))
    set_session_cookie(response, user["id"], request)
    return user_response(user)


@router.post("/login", response_model=User)
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_session_cookie(response, user["id"], request)
    return user_response(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    clear_session_cookie(response, request)
    return {"ok": True}


@router.get("/me", response_model=User)
async def me(user: dict = Depends(current_user)):
    return user_response(user)


@router.patch("/profile", response_model=User)
async def update_profile(payload: ProfileUpdateRequest, user: dict = Depends(current_user)):
    updates: dict[str, str] = {}

    if payload.display_name is not None:
        display_name = payload.display_name.strip()
        if not display_name:
            raise HTTPException(status_code=422, detail="Name cannot be blank")
        updates["display_name"] = display_name

    if payload.email is not None:
        email = str(payload.email).lower().strip()
        if email != user["email"]:
            existing = await db.users.find_one({"email": email, "id": {"$ne": user["id"]}})
            if existing:
                raise HTTPException(status_code=409, detail="An account with that email already exists")
            updates["email"] = email

    if payload.new_password is not None:
        if not verify_password(payload.current_password or "", user.get("password", "")):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        updates["password"] = hash_password(payload.new_password)

    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user = {**user, **updates}

    return user_response(user)
