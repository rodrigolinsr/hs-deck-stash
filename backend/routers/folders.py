from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user
from lib.db import db
from models.schemas import Folder, FolderCreate, FolderDeleteResult, FolderUpdate, new_id

router = APIRouter(prefix="/folders")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _folder_response(folder: dict) -> Folder:
    created_at = folder.get("created_at")
    if not isinstance(created_at, datetime):
        created_at = _now()
    elif created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return Folder(id=folder["id"], name=folder["name"], created_at=created_at)


def _name_key(name: str) -> str:
    return " ".join(name.strip().split()).casefold()


@router.get("", response_model=list[Folder])
async def list_folders(user: dict = Depends(current_user)):
    folders = await db.folders.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    folders.sort(key=lambda folder: _name_key(folder["name"]))
    return [_folder_response(folder) for folder in folders]


@router.post("", response_model=Folder)
async def create_folder(payload: FolderCreate, user: dict = Depends(current_user)):
    name = " ".join(payload.name.strip().split())
    key = _name_key(name)
    if await db.folders.find_one({"user_id": user["id"], "name_key": key}):
        raise HTTPException(status_code=409, detail="You already have a folder with that name")
    folder = {"id": new_id(), "user_id": user["id"], "name": name, "name_key": key, "created_at": _now()}
    await db.folders.insert_one(folder)
    return _folder_response(folder)


@router.patch("/{folder_id}", response_model=Folder)
async def update_folder(folder_id: str, payload: FolderUpdate, user: dict = Depends(current_user)):
    folder = await db.folders.find_one({"id": folder_id, "user_id": user["id"]}, {"_id": 0})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    name = " ".join(payload.name.strip().split())
    key = _name_key(name)
    duplicate = await db.folders.find_one({"user_id": user["id"], "name_key": key, "id": {"$ne": folder_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail="You already have a folder with that name")
    await db.folders.update_one({"id": folder_id, "user_id": user["id"]}, {"$set": {"name": name, "name_key": key}})
    return _folder_response({**folder, "name": name, "name_key": key})


@router.delete("/{folder_id}", response_model=FolderDeleteResult)
async def delete_folder(folder_id: str, user: dict = Depends(current_user)):
    deleted = await db.folders.delete_one({"id": folder_id, "user_id": user["id"]})
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    result = await db.decks.update_many({"user_id": user["id"], "folder_id": folder_id}, {"$set": {"folder_id": None}})
    return FolderDeleteResult(deleted=True, unfoldered_decks=result.modified_count)
