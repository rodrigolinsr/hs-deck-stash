from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from lib.cards import cards_by_dbf, ensure_cards, render_url, tile_url
from lib.deckstrings import CLASS_NAMES, DUST_BY_RARITY, DeckstringError, decode_deckstring

router = APIRouter()


async def build_decoded(code: str) -> dict[str, Any]:
    """Decode a deck code and enrich it with HearthstoneJSON card metadata."""
    try:
        decoded = decode_deckstring(code)
    except DeckstringError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await ensure_cards()
    wanted = [c["dbf_id"] for c in decoded["cards"]] + list(decoded["hero_dbf_ids"])
    lookup = await cards_by_dbf(wanted)

    hero_class = "NEUTRAL"
    hero_name = "Unknown Hero"
    for hero_dbf in decoded["hero_dbf_ids"]:
        hero = lookup.get(hero_dbf)
        if hero:
            hero_class = hero.get("card_class") or "NEUTRAL"
            hero_name = hero.get("name") or hero_name
            break

    cards: list[dict[str, Any]] = []
    dust = 0
    total = 0
    for entry in decoded["cards"]:
        meta = lookup.get(entry["dbf_id"])
        count = int(entry["count"])
        total += count
        if not meta:
            cards.append({
                "dbf_id": entry["dbf_id"],
                "card_id": "unknown",
                "name": f"Unknown card ({entry['dbf_id']})",
                "cost": 0,
                "count": count,
                "rarity": "FREE",
                "card_class": "NEUTRAL",
                "type": "MINION",
                "text": "",
                "attack": 0,
                "health": 0,
                "tile_url": "",
                "render_url": "",
            })
            continue
        dust += DUST_BY_RARITY.get(meta.get("rarity", "FREE"), 0) * count
        cards.append({
            **meta,
            "count": count,
            "tile_url": tile_url(meta["card_id"]),
            "render_url": render_url(meta["card_id"]),
        })

    cards.sort(key=lambda c: (c["cost"], c["name"]))
    if hero_class == "NEUTRAL":
        for card in cards:
            if card["card_class"] not in ("NEUTRAL", ""):
                hero_class = card["card_class"]
                break

    return {
        "format": decoded["format"],
        "hero_class": hero_class,
        "hero_class_name": CLASS_NAMES.get(hero_class, hero_class.title()),
        "hero_name": hero_name,
        "card_count": total,
        "dust_cost": dust,
        "cards": cards,
    }
