"""Hearthstone deckstring decoder — pure-python, per the HearthSim spec.

Layout (all integers are unsigned varints after the leading reserved byte):
reserved(0) | version(1) | format | heroCount + heroDbfIds
| n(1-copy) + dbfIds | n(2-copy) + dbfIds | n(x-copy) + (dbfId, count) pairs
| optional sideboard marker (0x01) + sideboard sections of (dbfId, count, ownerDbfId)
"""
from __future__ import annotations

import base64
import binascii
from io import BytesIO
from typing import Any

FORMATS = {1: "Wild", 2: "Standard", 3: "Classic", 4: "Twist"}

CLASS_NAMES = {
    "DEATHKNIGHT": "Death Knight",
    "DEMONHUNTER": "Demon Hunter",
    "DRUID": "Druid",
    "HUNTER": "Hunter",
    "MAGE": "Mage",
    "PALADIN": "Paladin",
    "PRIEST": "Priest",
    "ROGUE": "Rogue",
    "SHAMAN": "Shaman",
    "WARLOCK": "Warlock",
    "WARRIOR": "Warrior",
    "NEUTRAL": "Neutral",
}

DUST_BY_RARITY = {"FREE": 0, "COMMON": 40, "RARE": 100, "EPIC": 400, "LEGENDARY": 1600}


class DeckstringError(ValueError):
    """Raised when a deck code cannot be parsed."""


def _read_varint(stream: BytesIO) -> int:
    value = 0
    shift = 0
    while True:
        raw = stream.read(1)
        if not raw:
            raise DeckstringError("Deck code ended unexpectedly")
        byte = raw[0]
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value
        shift += 7
        if shift > 63:
            raise DeckstringError("Malformed deck code")


def decode_deckstring(deckstring: str) -> dict[str, Any]:
    code = (deckstring or "").strip()
    if not code:
        raise DeckstringError("Deck code is empty")
    try:
        payload = base64.b64decode(code, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise DeckstringError("That does not look like a Hearthstone deck code") from exc

    stream = BytesIO(payload)
    if _read_varint(stream) != 0:
        raise DeckstringError("Invalid deck code header")
    if _read_varint(stream) != 1:
        raise DeckstringError("Unsupported deck code version")

    format_id = _read_varint(stream)
    hero_count = _read_varint(stream)
    if hero_count > 8:
        raise DeckstringError("Malformed deck code")
    heroes = [_read_varint(stream) for _ in range(hero_count)]

    cards: list[dict[str, int]] = []
    for count in (1, 2):
        for _ in range(_read_varint(stream)):
            cards.append({"dbf_id": _read_varint(stream), "count": count})
    for _ in range(_read_varint(stream)):
        dbf_id = _read_varint(stream)
        cards.append({"dbf_id": dbf_id, "count": _read_varint(stream)})

    sideboard: list[dict[str, int]] = []
    marker = stream.read(1)
    if marker == b"\x01":
        try:
            for count in (1, 2):
                for _ in range(_read_varint(stream)):
                    sideboard.append({
                        "dbf_id": _read_varint(stream),
                        "count": count,
                        "owner_dbf_id": _read_varint(stream),
                    })
            for _ in range(_read_varint(stream)):
                sideboard.append({
                    "dbf_id": _read_varint(stream),
                    "count": _read_varint(stream),
                    "owner_dbf_id": _read_varint(stream),
                })
        except DeckstringError:
            sideboard = []

    if not cards:
        raise DeckstringError("Deck code contains no cards")

    return {
        "format_id": format_id,
        "format": FORMATS.get(format_id, "Unknown"),
        "hero_dbf_ids": heroes,
        "cards": cards,
        "sideboard": sideboard,
    }
