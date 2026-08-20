"""Normalize account identifiers and enforce case-insensitive uniqueness."""
from __future__ import annotations

from lib.db import db


def _key(value: str) -> str:
    return " ".join(value.strip().split()).casefold()


async def upgrade() -> None:
    """Backfill keys and give legacy duplicate usernames a stable suffix.

    The oldest existing account keeps its displayed username. Later duplicates receive
    a short ID suffix, avoiding a failed deployment while making every account unique.
    """
    seen_usernames: set[str] = set()
    users = db.users.find({}, {"_id": 0, "id": 1, "email": 1, "display_name": 1}).sort("_id", 1)
    async for user in users:
        email = user["email"].strip().lower()
        username = " ".join((user.get("display_name") or email.split("@", 1)[0]).strip().split())
        username_key = _key(username)
        if username_key in seen_usernames:
            username = f"{username}-{user['id'][:6]}"
            username_key = _key(username)
        seen_usernames.add(username_key)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"email": email, "email_key": _key(email), "display_name": username, "username_key": username_key}},
        )

    await db.users.create_index("email_key", unique=True, name="uniq_users_email_key")
    await db.users.create_index("username_key", unique=True, name="uniq_users_username_key")
