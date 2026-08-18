"""Give existing accounts a persistent name derived from their email address."""
from __future__ import annotations

from lib.db import db


async def upgrade() -> None:
    users = db.users.find(
        {"$or": [{"display_name": {"$exists": False}}, {"display_name": ""}]},
        {"_id": 0, "id": 1, "email": 1},
    )
    async for user in users:
        email = user.get("email")
        if not email:
            continue
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"display_name": email.split("@", 1)[0]}},
        )
