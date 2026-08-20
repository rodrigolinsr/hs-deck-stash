"""Indexes for public deck discovery and public player profiles."""
from lib.db import db


async def upgrade() -> None:
    await db.decks.create_index([("is_public", 1), ("published_at", -1)])
    await db.decks.create_index([("user_id", 1), ("is_public", 1), ("published_at", -1)])
    await db.users.create_index("username_key")
