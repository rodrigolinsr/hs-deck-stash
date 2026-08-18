"""Create user-owned folders and indexes for filing decks."""
from __future__ import annotations

from lib.db import db


async def upgrade() -> None:
    if "folders" not in await db.list_collection_names():
        await db.create_collection("folders")
    await db.folders.create_index("id", unique=True, name="uniq_folders_id")
    await db.folders.create_index([("user_id", 1), ("name_key", 1)], unique=True, name="uniq_folders_user_name")
    await db.decks.create_index([("user_id", 1), ("folder_id", 1), ("created_at", -1)], name="decks_by_user_folder_created_at")
