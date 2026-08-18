"""Pydantic v2 request/response models. Mirrored by frontend/src/lib/types.ts."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, EmailStr, Field, model_validator


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: str
    email: str
    display_name: str = ""


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=128)

    @model_validator(mode="after")
    def validate_password_change(self) -> "ProfileUpdateRequest":
        if self.new_password is not None and not self.current_password:
            raise ValueError("Current password is required to set a new password")
        if self.display_name is None and self.email is None and self.new_password is None:
            raise ValueError("Choose at least one profile detail to update")
        return self


class DeckCard(BaseModel):
    dbf_id: int
    card_id: str
    name: str
    cost: int
    count: int
    rarity: str
    card_class: str
    type: str
    text: str = ""
    attack: int = 0
    health: int = 0
    tile_url: str
    render_url: str


class DeckDecoded(BaseModel):
    format: str
    hero_class: str
    hero_class_name: str
    hero_name: str
    card_count: int
    dust_cost: int
    cards: list[DeckCard] = []


class DeckSummary(BaseModel):
    id: str
    name: str
    code: str
    notes: str = ""
    tags: list[str] = []
    folder_id: str | None = None
    hero_class: str
    hero_class_name: str
    hero_name: str
    format: str
    card_count: int
    dust_cost: int
    created_at: datetime
    updated_at: datetime


class DeckDetail(DeckSummary):
    cards: list[DeckCard] = []


class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=8)
    notes: str = ""
    tags: list[str] = []
    folder_id: str | None = None


class DeckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    folder_id: str | None = None


class Folder(BaseModel):
    id: str
    name: str
    created_at: datetime


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class FolderDeleteResult(BaseModel):
    deleted: bool
    unfoldered_decks: int


class DeckPreviewRequest(BaseModel):
    code: str = Field(min_length=1)


class DeckPreview(DeckDecoded):
    duplicate_of_id: str | None = None
    duplicate_of_name: str | None = None


class DeleteResult(BaseModel):
    deleted: bool


def new_id() -> str:
    return str(uuid.uuid4())
