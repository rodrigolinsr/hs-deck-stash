from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import current_user
from lib.db import db
from models.schemas import (
    DeckCreate,
    DeckDetail,
    HsReplayDeckStat,
    HsReplayStatsResponse,
    DeckPreview,
    DeckPreviewRequest,
    DeckSummary,
    DeckUpdate,
    DeleteResult,
    PublicDeckDetail,
    PublicDeckSummary,
    PublicProfile,
    PublicPlayerSummary,
    PublicTag,
    new_id,
)
from lib.deckstrings import DeckstringError, decode_deckstring
from lib.hsreplay import HSREPLAY_GAME_TYPES, fetch_deck_records, index_records, match_record
from routers.decoding import build_decoded

router = APIRouter(prefix="/decks")
public_router = APIRouter(prefix="/public/decks")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return _now()


def _summary(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "code": doc["code"],
        "notes": doc.get("notes", ""),
        "tags": doc.get("tags", []),
        "folder_id": doc.get("folder_id"),
        "hero_class": doc.get("hero_class", "NEUTRAL"),
        "hero_class_name": doc.get("hero_class_name", "Neutral"),
        "hero_name": doc.get("hero_name", ""),
        "format": doc.get("format", "Unknown"),
        "card_count": doc.get("card_count", 0),
        "dust_cost": doc.get("dust_cost", 0),
        "is_public": bool(doc.get("is_public", False)),
        "published_at": _aware(doc["published_at"]) if doc.get("published_at") else None,
        "created_at": _aware(doc.get("created_at")),
        "updated_at": _aware(doc.get("updated_at")),
    }


@router.post("/preview", response_model=DeckPreview)
async def preview_deck(payload: DeckPreviewRequest, user: dict = Depends(current_user)):
    decoded = await build_decoded(payload.code)
    existing = await db.decks.find_one(
        {"user_id": user["id"], "code": payload.code.strip()}, {"_id": 0}
    )
    return DeckPreview(
        **decoded,
        duplicate_of_id=existing["id"] if existing else None,
        duplicate_of_name=existing["name"] if existing else None,
    )


@router.get("", response_model=list[DeckSummary])
async def list_decks(user: dict = Depends(current_user)):
    docs = await db.decks.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: _aware(d.get("created_at")), reverse=True)
    return [DeckSummary(**_summary(doc)) for doc in docs]


@router.get("/hsreplay-stats", response_model=HsReplayStatsResponse)
async def hsreplay_stats(user: dict = Depends(current_user)):
    """Match the user's saved Standard/Wild lists to approved HSReplay statistics."""
    if os.getenv("HSREPLAY_STATS_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return HsReplayStatsResponse(available=False)
    docs = await db.decks.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "code": 1, "format": 1}).to_list(500)
    wanted_types = sorted({HSREPLAY_GAME_TYPES[doc["format"]] for doc in docs if doc.get("format") in HSREPLAY_GAME_TYPES})
    if not wanted_types:
        return HsReplayStatsResponse(available=True)

    try:
        payloads = await asyncio.gather(*(fetch_deck_records(game_type) for game_type in wanted_types))
    except (httpx.HTTPError, RuntimeError, ValueError):
        return HsReplayStatsResponse(available=False)

    indexes = {game_type: index_records(payload) for game_type, payload in zip(wanted_types, payloads)}
    stats: list[HsReplayDeckStat] = []
    as_of_values = {str(payload.get("as_of")) for payload in payloads if payload.get("as_of")}
    for doc in docs:
        game_type = HSREPLAY_GAME_TYPES.get(doc.get("format"))
        if not game_type:
            continue
        try:
            decoded = decode_deckstring(doc["code"])
        except DeckstringError:
            continue
        record = match_record(indexes[game_type], decoded["cards"], decoded["sideboard"])
        if not record or not record.get("deck_id"):
            continue
        stats.append(HsReplayDeckStat(
            deck_id=doc["id"],
            hsreplay_deck_id=str(record["deck_id"]),
            win_rate=float(record.get("win_rate") or 0),
            total_games=int(record.get("total_games") or 0),
            game_type=game_type,
        ))
    return HsReplayStatsResponse(available=True, stats=stats, as_of=next(iter(as_of_values), None))


@router.post("/{deck_id}/publish", response_model=DeckDetail)
async def publish_deck(deck_id: str, user: dict = Depends(current_user)):
    doc = await db.decks.find_one({"id": deck_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Deck not found")
    published_at = _aware(doc.get("published_at")) if doc.get("is_public") else _now()
    updates = {"is_public": True, "published_at": published_at, "updated_at": _now()}
    await db.decks.update_one({"id": deck_id, "user_id": user["id"]}, {"$set": updates})
    decoded = await build_decoded(doc["code"])
    return DeckDetail(**_summary({**doc, **updates}), cards=decoded["cards"])


@router.post("/{deck_id}/unpublish", response_model=DeckDetail)
async def unpublish_deck(deck_id: str, user: dict = Depends(current_user)):
    doc = await db.decks.find_one({"id": deck_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Deck not found")
    updates = {"is_public": False, "published_at": None, "updated_at": _now()}
    await db.decks.update_one({"id": deck_id, "user_id": user["id"]}, {"$set": updates})
    decoded = await build_decoded(doc["code"])
    return DeckDetail(**_summary({**doc, **updates}), cards=decoded["cards"])


async def _public_source(deck_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    doc = await db.decks.find_one({"id": deck_id, "is_public": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="This deck is not publicly available")
    author = await db.users.find_one({"id": doc["user_id"]}, {"_id": 0, "display_name": 1, "username_key": 1})
    if not author:
        raise HTTPException(status_code=404, detail="This deck is not publicly available")
    return doc, author


def _author_name(author: dict[str, Any]) -> str:
    return (author.get("display_name") or "HSDeckStash player").strip()


def _author_username(author: dict[str, Any]) -> str:
    return str(author.get("username_key") or "").strip()


async def _public_summaries(docs: list[dict[str, Any]]) -> list[PublicDeckSummary]:
    user_ids = list({doc["user_id"] for doc in docs})
    authors = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "display_name": 1, "username_key": 1}).to_list(len(user_ids)) if user_ids else []
    by_id = {author["id"]: author for author in authors}
    return [
        PublicDeckSummary(
            **_summary(doc),
            author_name=_author_name(by_id.get(doc["user_id"], {})),
            author_username=_author_username(by_id.get(doc["user_id"], {})),
            community_copies=int(doc.get("community_copies", 1)),
        )
        for doc in docs
        if doc["user_id"] in by_id
    ]


@public_router.get("", response_model=list[PublicDeckSummary])
async def list_public_decks(
    search: str = Query(default="", max_length=100),
    hero_class: str = Query(default="", max_length=30),
    tag: str = Query(default="", max_length=80),
    limit: int = Query(default=24, ge=1, le=60),
):
    filters: dict[str, Any] = {"is_public": True}
    if hero_class:
        filters["hero_class"] = hero_class.upper()
    if tag:
        filters["tags"] = tag
    if search.strip():
        escaped = search.strip()
        filters["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$regex": escaped, "$options": "i"}},
            {"hero_class_name": {"$regex": escaped, "$options": "i"}},
        ]
    # Discovery shows one representative per exact deck code. Every player's
    # publication remains visible on their own public profile.
    docs = await db.decks.find(filters, {"_id": 0}).sort("published_at", -1).to_list(limit * 10)
    unique_docs: list[dict[str, Any]] = []
    by_code: dict[str, int] = {}
    for doc in docs:
        code = doc.get("code", "")
        if code in by_code:
            unique_docs[by_code[code]]["community_copies"] += 1
        else:
            doc["community_copies"] = 1
            by_code[code] = len(unique_docs)
            unique_docs.append(doc)
    return await _public_summaries(unique_docs[:limit])


@public_router.get("/discover/tags", response_model=list[PublicTag])
async def list_public_tags():
    docs = await db.decks.find({"is_public": True}, {"_id": 0, "tags": 1}).to_list(1000)
    counts: dict[str, tuple[str, int]] = {}
    for doc in docs:
        for tag in doc.get("tags", []):
            cleaned = str(tag).strip()
            if not cleaned:
                continue
            key = cleaned.casefold()
            display, count = counts.get(key, (cleaned, 0))
            counts[key] = (display, count + 1)
    return [PublicTag(name=name, deck_count=count) for name, count in sorted(counts.values(), key=lambda item: (-item[1], item[0].casefold()))[:12]]


@public_router.get("/players", response_model=list[PublicPlayerSummary])
async def list_public_players():
    docs = await db.decks.find({"is_public": True}, {"_id": 0, "user_id": 1, "published_at": 1}).to_list(2000)
    counts: dict[str, tuple[int, datetime | None]] = {}
    for doc in docs:
        count, latest = counts.get(doc["user_id"], (0, None))
        published_at = _aware(doc.get("published_at")) if doc.get("published_at") else None
        latest_value = max((latest, published_at), key=lambda value: value or datetime.min.replace(tzinfo=timezone.utc))
        counts[doc["user_id"]] = (count + 1, latest_value)
    authors = await db.users.find({"id": {"$in": list(counts)}}, {"_id": 0, "id": 1, "display_name": 1, "username_key": 1}).to_list(len(counts)) if counts else []
    players = [
        PublicPlayerSummary(username=_author_username(author), display_name=_author_name(author), deck_count=counts[author["id"]][0], latest_published_at=counts[author["id"]][1])
        for author in authors if _author_username(author)
    ]
    return sorted(players, key=lambda player: (player.latest_published_at or datetime.min.replace(tzinfo=timezone.utc)), reverse=True)


@public_router.get("/players/{username}", response_model=PublicProfile)
async def get_public_profile(username: str):
    key = username.strip().lower()
    author = await db.users.find_one({"username_key": key}, {"_id": 0, "id": 1, "display_name": 1, "username_key": 1})
    if not author:
        raise HTTPException(status_code=404, detail="This player profile is not available")
    docs = await db.decks.find({"user_id": author["id"], "is_public": True}, {"_id": 0}).sort("published_at", -1).to_list(200)
    return PublicProfile(username=_author_username(author), display_name=_author_name(author), decks=await _public_summaries(docs))


@public_router.get("/{deck_id}", response_model=PublicDeckDetail)
async def get_public_deck(deck_id: str):
    doc, author = await _public_source(deck_id)
    decoded = await build_decoded(doc["code"])
    return PublicDeckDetail(
        **_summary(doc),
        cards=decoded["cards"],
        author_name=_author_name(author),
        author_username=_author_username(author),
    )


@public_router.post("/{deck_id}/import", response_model=DeckDetail)
async def import_public_deck(deck_id: str, user: dict = Depends(current_user)):
    source, _author = await _public_source(deck_id)
    if await db.decks.find_one({"user_id": user["id"], "code": source["code"]}):
        raise HTTPException(status_code=409, detail="This deck is already in your library")
    decoded = await build_decoded(source["code"])
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "name": source["name"],
        "code": source["code"],
        "notes": source.get("notes", ""),
        "tags": source.get("tags", []),
        "folder_id": None,
        "hero_class": decoded["hero_class"],
        "hero_class_name": decoded["hero_class_name"],
        "hero_name": decoded["hero_name"],
        "format": decoded["format"],
        "card_count": decoded["card_count"],
        "dust_cost": decoded["dust_cost"],
        "is_public": False,
        "published_at": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.decks.insert_one(dict(doc))
    return DeckDetail(**_summary(doc), cards=decoded["cards"])


@router.post("", response_model=DeckDetail)
async def create_deck(payload: DeckCreate, user: dict = Depends(current_user)):
    code = payload.code.strip()
    decoded = await build_decoded(code)
    if payload.folder_id and not await db.folders.find_one({"id": payload.folder_id, "user_id": user["id"]}):
        raise HTTPException(status_code=422, detail="That folder no longer exists")
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "name": payload.name.strip(),
        "code": code,
        "notes": payload.notes.strip(),
        "tags": [t.strip() for t in payload.tags if t.strip()],
        "folder_id": payload.folder_id,
        "hero_class": decoded["hero_class"],
        "hero_class_name": decoded["hero_class_name"],
        "hero_name": decoded["hero_name"],
        "format": decoded["format"],
        "card_count": decoded["card_count"],
        "dust_cost": decoded["dust_cost"],
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.decks.insert_one(dict(doc))
    return DeckDetail(**_summary(doc), cards=decoded["cards"])


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_deck(deck_id: str, user: dict = Depends(current_user)):
    doc = await db.decks.find_one({"id": deck_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Deck not found")
    decoded = await build_decoded(doc["code"])
    return DeckDetail(**_summary(doc), cards=decoded["cards"])


@router.patch("/{deck_id}", response_model=DeckDetail)
async def update_deck(deck_id: str, payload: DeckUpdate, user: dict = Depends(current_user)):
    doc = await db.decks.find_one({"id": deck_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Deck not found")

    updates: dict[str, Any] = {"updated_at": _now()}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.notes is not None:
        updates["notes"] = payload.notes.strip()
    if payload.tags is not None:
        updates["tags"] = [t.strip() for t in payload.tags if t.strip()]
    if "folder_id" in payload.model_fields_set:
        if payload.folder_id and not await db.folders.find_one({"id": payload.folder_id, "user_id": user["id"]}):
            raise HTTPException(status_code=422, detail="That folder no longer exists")
        updates["folder_id"] = payload.folder_id

    code = doc["code"]
    if payload.code is not None and payload.code.strip() and payload.code.strip() != code:
        code = payload.code.strip()
        decoded = await build_decoded(code)
        updates.update({
            "code": code,
            "hero_class": decoded["hero_class"],
            "hero_class_name": decoded["hero_class_name"],
            "hero_name": decoded["hero_name"],
            "format": decoded["format"],
            "card_count": decoded["card_count"],
            "dust_cost": decoded["dust_cost"],
        })

    await db.decks.update_one({"id": deck_id, "user_id": user["id"]}, {"$set": updates})
    merged = {**doc, **updates}
    decoded = await build_decoded(merged["code"])
    return DeckDetail(**_summary(merged), cards=decoded["cards"])


@router.delete("/{deck_id}", response_model=DeleteResult)
async def delete_deck(deck_id: str, user: dict = Depends(current_user)):
    res = await db.decks.delete_one({"id": deck_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deck not found")
    return DeleteResult(deleted=True)
