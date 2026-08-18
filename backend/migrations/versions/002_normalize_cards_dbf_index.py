"""Remove redundant legacy card indexes after the initial migration."""
from __future__ import annotations

from lib.db import db


async def upgrade() -> None:
    """Retain exactly the unique ``uniq_cards_dbf_id`` key index."""
    for index in await db.cards.list_indexes().to_list(None):
        if (
            list(index["key"].items()) == [("dbf_id", 1)]
            and index["name"] != "uniq_cards_dbf_id"
        ):
            await db.cards.drop_index(index["name"])
    await db.cards.create_index("dbf_id", unique=True, name="uniq_cards_dbf_id")
