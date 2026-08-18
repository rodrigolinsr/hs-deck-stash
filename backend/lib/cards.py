"""HearthstoneJSON card metadata: cached in Mongo, refreshed on demand."""
from __future__ import annotations

from typing import Any

import httpx
from pymongo import ReplaceOne

from lib.db import db

CARDS_URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.json"
TILE_URL = "https://art.hearthstonejson.com/v1/tiles/{card_id}.png"
RENDER_URL = "https://art.hearthstonejson.com/v1/render/latest/enUS/512x/{card_id}.png"
# Increment when the filter or compacted document format changes. Existing
# installations refresh once, avoiding permanent gaps in a previously seeded cache.
CARD_CACHE_VERSION = 2
DECK_PLAYABLE_TYPES = {"MINION", "SPELL", "WEAPON", "LOCATION", "HERO"}


def _compact(card: dict[str, Any]) -> dict[str, Any] | None:
    dbf_id = card.get("dbfId")
    card_id = card.get("id")
    if dbf_id is None or not card_id:
        return None
    return {
        "dbf_id": int(dbf_id),
        "card_id": card_id,
        "name": card.get("name") or card_id,
        "cost": int(card.get("cost") or 0),
        "card_class": card.get("cardClass") or "NEUTRAL",
        "rarity": card.get("rarity") or "FREE",
        "type": card.get("type") or "MINION",
        "text": card.get("text") or "",
        "attack": int(card.get("attack") or 0),
        "health": int(card.get("health") or 0),
    }


def _should_cache(card: dict[str, Any]) -> bool:
    """Keep every normal collectible plus playable generated cards in deck codes.

    Modern deck strings can contain non-collectible cards created alongside a
    collectible card (for example Broxigar's generated Axe and Portal). We do
    not cache unrelated enchantments or game-rule records, but we do retain
    non-collectible cards that have a deck-playable type.
    """
    return bool(card.get("collectible")) or card.get("type") in DECK_PLAYABLE_TYPES


async def refresh_cards() -> int:
    """Download the card list and replace the local cache. Returns doc count."""
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(120.0, connect=15.0),
        headers={"User-Agent": "deck-stash/1.0"},
    ) as http:
        res = await http.get(CARDS_URL)
        res.raise_for_status()
        raw = res.json()
    if not isinstance(raw, list):
        raise RuntimeError("Unexpected HearthstoneJSON payload")

    docs = []
    for card in raw:
        if not _should_cache(card):
            continue
        compact = _compact(card)
        if compact:
            docs.append(compact)
    if not docs:
        raise RuntimeError("No cards parsed from HearthstoneJSON")

    # Upsert first and remove stale records only after every downloaded record
    # has been written. This avoids an empty card cache during a failed refresh.
    for i in range(0, len(docs), 1000):
        await db.cards.bulk_write([
            ReplaceOne({"dbf_id": card["dbf_id"]}, card, upsert=True)
            for card in docs[i:i + 1000]
        ], ordered=False)
    await db.cards.create_index("dbf_id", unique=True, name="uniq_cards_dbf_id")
    await db.cards.delete_many({"dbf_id": {"$nin": [card["dbf_id"] for card in docs]}})
    await db.card_cache_meta.update_one(
        {"_id": "cards"},
        {"$set": {"version": CARD_CACHE_VERSION}},
        upsert=True,
    )
    return len(docs)


async def cards_count() -> int:
    return await db.cards.count_documents({})


async def ensure_cards() -> None:
    meta = await db.card_cache_meta.find_one({"_id": "cards"}, {"version": 1})
    if await cards_count() == 0 or meta is None or meta.get("version") != CARD_CACHE_VERSION:
        await refresh_cards()


async def cards_by_dbf(dbf_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not dbf_ids:
        return {}
    docs = await db.cards.find({"dbf_id": {"$in": list(set(dbf_ids))}}, {"_id": 0}).to_list(2000)
    return {int(doc["dbf_id"]): doc for doc in docs}


def tile_url(card_id: str) -> str:
    return TILE_URL.format(card_id=card_id)


def render_url(card_id: str) -> str:
    return RENDER_URL.format(card_id=card_id)
