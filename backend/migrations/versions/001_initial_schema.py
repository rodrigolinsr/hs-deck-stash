"""Create collection validators and the indexes required by the application."""
from __future__ import annotations

from typing import Any

from lib.db import db


USERS_VALIDATOR: dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["id", "email", "password"],
        "properties": {
            "id": {"bsonType": "string"},
            "email": {"bsonType": "string"},
            "password": {"bsonType": "string"},
        },
    }
}

DECKS_VALIDATOR: dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "id", "user_id", "name", "code", "hero_class", "hero_class_name",
            "hero_name", "format", "card_count", "dust_cost", "created_at", "updated_at",
        ],
        "properties": {
            "id": {"bsonType": "string"},
            "user_id": {"bsonType": "string"},
            "name": {"bsonType": "string"},
            "code": {"bsonType": "string"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    }
}

CARDS_VALIDATOR: dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["dbf_id", "card_id", "name", "cost", "card_class", "rarity", "type"],
        "properties": {
            "dbf_id": {"bsonType": ["int", "long"]},
            "card_id": {"bsonType": "string"},
            "name": {"bsonType": "string"},
        },
    }
}


async def _ensure_collection(name: str, validator: dict[str, Any]) -> None:
    if name not in await db.list_collection_names():
        await db.create_collection(name, validator=validator, validationLevel="moderate")
        return
    await db.command({
        "collMod": name,
        "validator": validator,
        "validationLevel": "moderate",
        "validationAction": "error",
    })


async def _replace_cards_dbf_index() -> None:
    """Replace the legacy non-unique index created by ``refresh_cards``.

    MongoDB rejects two indexes with the same key pattern but different
    uniqueness options. Check for bad historical data first; deleting an index
    before that check would only turn a clear migration error into a later,
    less useful one.
    """
    duplicates = await db.cards.aggregate([
        {"$group": {"_id": "$dbf_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$limit": 1},
    ]).to_list(1)
    if duplicates:
        raise RuntimeError(
            "Cannot create the unique cards.dbf_id index: duplicate dbf_id "
            f"{duplicates[0]['_id']} exists. Resolve duplicate cards before rerunning."
        )

    for index in await db.cards.list_indexes().to_list(None):
        if list(index["key"].items()) == [("dbf_id", 1)] and not index.get("unique", False):
            await db.cards.drop_index(index["name"])


async def upgrade() -> None:
    await _ensure_collection("users", USERS_VALIDATOR)
    await _ensure_collection("decks", DECKS_VALIDATOR)
    await _ensure_collection("cards", CARDS_VALIDATOR)

    await db.users.create_index("id", unique=True, name="uniq_users_id")
    await db.users.create_index("email", unique=True, name="uniq_users_email")
    await db.decks.create_index("id", unique=True, name="uniq_decks_id")
    await db.decks.create_index(
        [("user_id", 1), ("created_at", -1)], name="decks_by_user_created_at"
    )
    await db.decks.create_index(
        [("user_id", 1), ("code", 1)], unique=True, name="uniq_decks_user_code"
    )
    await _replace_cards_dbf_index()
    await db.cards.create_index("dbf_id", unique=True, name="uniq_cards_dbf_id")
