"""One-time startup preparation for a production deployment.

Migrations are recorded in MongoDB and the card cache is versioned, so this is
safe to run on every container start. The card download only happens for a new
or outdated cache.
"""
from __future__ import annotations

import asyncio

from lib.cards import ensure_cards
from lib.db import client
from migrations.runner import apply_migrations


async def main() -> None:
    try:
        await apply_migrations()
        await ensure_cards()
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
