"""Idempotent seed: card metadata cache + a demo account with one deck.

Run: cd /app/backend && python seed.py
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from lib.auth import hash_password
from lib.cards import cards_count, refresh_cards
from lib.db import db
from models.schemas import new_id
from routers.decoding import build_decoded

DEMO_EMAIL = "demo@deckstash.app"
DEMO_PASSWORD = "tavern123"

SEED_DECKS = [
    (
        "My First Import",
        "AAECAfHhBAyV5ATDgweRqwfSrgeosQfQvwfqyQf2yQeb1Ae/3wey4wf85wcJodQEh/YEgf0GloIHl4IHvJQHupUHmsUH0MUHAAA=",
        "Pasted straight from the game. Copy the code and paste it back into Hearthstone.",
        ["Imported", "Favourite"],
    ),
]


async def main() -> None:
    count = await cards_count()
    if count == 0:
        print("Downloading HearthstoneJSON card data (one-time)...")
        count = await refresh_cards()
    print(f"cards cached: {count}")

    user = await db.users.find_one({"email": DEMO_EMAIL})
    if not user:
        user = {"id": new_id(), "email": DEMO_EMAIL, "password": hash_password(DEMO_PASSWORD)}
        await db.users.insert_one(dict(user))
        print(f"created demo user {DEMO_EMAIL} / {DEMO_PASSWORD}")

    for name, code, notes, tags in SEED_DECKS:
        if await db.decks.find_one({"user_id": user["id"], "code": code}):
            print(f"deck already seeded: {name}")
            continue
        decoded = await build_decoded(code)
        now = datetime.now(timezone.utc)
        await db.decks.insert_one({
            "id": new_id(),
            "user_id": user["id"],
            "name": name,
            "code": code,
            "notes": notes,
            "tags": tags,
            "hero_class": decoded["hero_class"],
            "hero_class_name": decoded["hero_class_name"],
            "hero_name": decoded["hero_name"],
            "format": decoded["format"],
            "card_count": decoded["card_count"],
            "dust_cost": decoded["dust_cost"],
            "created_at": now,
            "updated_at": now,
        })
        print(f"seeded deck: {name} ({decoded['hero_class_name']}, {decoded['format']})")


if __name__ == "__main__":
    asyncio.run(main())
