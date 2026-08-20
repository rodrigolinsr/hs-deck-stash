"""Apply the database migrations exactly once, in version order.

Run from ``backend/`` with ``python -m migrations.runner``. Each successful
migration is recorded in the ``schema_migrations`` collection, so this command
is safe to include in local startup and deployment pipelines.
"""
from __future__ import annotations

import importlib
from collections.abc import Awaitable, Callable

from lib.db import client, db

Migration = tuple[str, str]

MIGRATIONS: list[Migration] = [
    ("001_initial_schema", "migrations.versions.001_initial_schema"),
    ("002_normalize_cards_dbf_index", "migrations.versions.002_normalize_cards_dbf_index"),
    ("003_backfill_user_display_names", "migrations.versions.003_backfill_user_display_names"),
    ("004_add_folders", "migrations.versions.004_add_folders"),
    ("005_unique_user_identity", "migrations.versions.005_unique_user_identity"),
    ("006_public_deck_discovery", "migrations.versions.006_public_deck_discovery"),
]


async def apply_migrations() -> None:
    await db.schema_migrations.create_index("version", unique=True)
    applied = {
        document["version"]
        async for document in db.schema_migrations.find({}, {"_id": 0, "version": 1})
    }

    for version, module_name in MIGRATIONS:
        if version in applied:
            print(f"migration already applied: {version}")
            continue
        module = importlib.import_module(module_name)
        upgrade: Callable[[], Awaitable[None]] = module.upgrade
        print(f"applying migration: {version}")
        await upgrade()
        await db.schema_migrations.insert_one({"version": version})
        print(f"migration applied: {version}")


async def main() -> None:
    try:
        await apply_migrations()
    finally:
        client.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
