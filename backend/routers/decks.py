from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user
from lib.db import db
from models.schemas import (
    DeckCreate,
    DeckDetail,
    DeckPreview,
    DeckPreviewRequest,
    DeckSummary,
    DeckUpdate,
    DeleteResult,
    new_id,
)
from routers.decoding import build_decoded

router = APIRouter(prefix="/decks")


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
