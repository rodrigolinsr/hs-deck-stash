"""Small, cached client for the approved HSReplay deck-statistics API."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

HSREPLAY_QUERY_URL = "https://hsreplay.net/analytics/query/list_decks_by_win_rate_v2/"
HSREPLAY_CACHE_TTL = timedelta(minutes=15)
HSREPLAY_GAME_TYPES = {"Standard": "RANKED_STANDARD", "Wild": "RANKED_WILD"}

_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_locks: dict[str, asyncio.Lock] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _main_key(cards: list[dict[str, int]]) -> tuple[tuple[int, int], ...]:
    return tuple(sorted((int(card["dbf_id"]), int(card["count"])) for card in cards))


def _sideboard_key(sideboard: list[dict[str, int]]) -> tuple[tuple[int, int, int], ...]:
    return tuple(sorted((int(card["owner_dbf_id"]), int(card["dbf_id"]), int(card["count"])) for card in sideboard))


def _remote_main_key(raw: str) -> tuple[tuple[int, int], ...]:
    cards = json.loads(raw or "[]")
    return tuple(sorted((int(card_id), int(count)) for card_id, count in cards))


def _remote_sideboard_key(raw: str) -> tuple[tuple[int, int, int], ...]:
    sideboards = json.loads(raw or "[]")
    return tuple(sorted(
        (int(owner_id), int(card_id), int(count))
        for owner_id, *cards in sideboards
        for card_id, count in cards
    ))


def index_records(payload: dict[str, Any]) -> dict[tuple[tuple[tuple[int, int], ...], tuple[tuple[int, int, int], ...]], dict[str, Any]]:
    """Index remote deck variants, keeping the largest sample for duplicates."""
    indexed: dict[tuple[tuple[tuple[int, int], ...], tuple[tuple[int, int, int], ...]], dict[str, Any]] = {}
    data = payload.get("series", {}).get("data", {})
    if not isinstance(data, dict):
        return indexed
    for records in data.values():
        if not isinstance(records, list):
            continue
        for record in records:
            if not isinstance(record, dict):
                continue
            try:
                key = (_remote_main_key(str(record.get("deck_list", "[]"))), _remote_sideboard_key(str(record.get("deck_sideboard", "[]"))))
            except (TypeError, ValueError, json.JSONDecodeError):
                continue
            current = indexed.get(key)
            if current is None or int(record.get("total_games") or 0) > int(current.get("total_games") or 0):
                indexed[key] = record
    return indexed


async def fetch_deck_records(game_type: str) -> dict[str, Any]:
    """Get one game type's public deck list, with a short per-process cache."""
    now = _now()
    cached = _cache.get(game_type)
    if cached and now - cached[0] < HSREPLAY_CACHE_TTL:
        return cached[1]

    lock = _locks.setdefault(game_type, asyncio.Lock())
    async with lock:
        cached = _cache.get(game_type)
        if cached and _now() - cached[0] < HSREPLAY_CACHE_TTL:
            return cached[1]
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(25.0, connect=10.0),
            headers={"User-Agent": "HSDeckStash/1.0 (approved HSReplay integration)"},
        ) as http:
            response = await http.get(HSREPLAY_QUERY_URL, params={
                "GameType": game_type,
                "LeagueRankRange": "BRONZE_THROUGH_GOLD",
                "Region": "ALL",
                "TimeRange": "LAST_30_DAYS",
            })
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict):
            raise RuntimeError("Unexpected HSReplay statistics payload")
        _cache[game_type] = (_now(), payload)
        return payload


def match_record(index: dict[tuple[tuple[tuple[int, int], ...], tuple[tuple[int, int, int], ...]], dict[str, Any]], cards: list[dict[str, int]], sideboard: list[dict[str, int]]) -> dict[str, Any] | None:
    return index.get((_main_key(cards), _sideboard_key(sideboard)))
