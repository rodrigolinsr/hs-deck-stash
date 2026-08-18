# HSDeckStash

> A private, self-hosted library for Hearthstone deck codes.

HSDeckStash lets you save a deck as soon as you find it, then keep it useful with notes, tags, folders, class filters, and full decoded card lists. Paste a complete deck-list export from Hearthstone or HSReplay—or only the `AAE...` deck code—and the app extracts the available deck details for you.

## What you get

- Account-based deck library with secure session authentication
- Deck import, decoding, card list, dust estimate, and card art
- Import support for raw deck codes and common copied deck-list formats
- Folders, tags, notes, class filtering, and search-friendly deck metadata
- Profile editing, display names, and password changes
- Responsive dark and light themes
- MongoDB migrations and a refreshable HearthstoneJSON card cache
- Docker Compose for local development and a separate Coolify production stack

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with the Compose plugin
- An internet connection on the first card-data download

### Run locally

```bash
git clone https://github.com/rodrigolinsr/hs-deck-stash.git
cd hs-deck-stash
cp .env.example .env
```

Set a unique value for `SESSION_SECRET` in `.env` (for example, `openssl rand -hex 32`), then start the stack:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API is available at `http://localhost:8001/api` and MongoDB is published at `localhost:27017` for local inspection.

On first use, import a deck or run the card-cache command below before expecting full card names and artwork. Migrations run automatically whenever the local backend starts.

Stop the stack with `Ctrl+C`, or run it in the background with `docker compose up -d --build`. To stop background containers, run `docker compose down`—your MongoDB data remains in the named `mongo_data` volume.

## Configuration

Copy `.env.example` to `.env`; do not commit the resulting file.

| Variable | Local default | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | none—required | Long random secret used to sign login sessions. |
| `MONGO_URL` | `mongodb://mongo:27017` | MongoDB connection URL. |
| `DB_NAME` | `deck_stash` | MongoDB database name. |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated browser origins allowed to call the API. |

## Card data

Card metadata comes from [HearthstoneJSON](https://hearthstonejson.com/), not from a checked-in JSON file. The app stores a compact card cache in MongoDB, including playable generated cards that can appear in modern deck codes.

To populate or refresh the cache locally:

```bash
docker compose exec backend python -c "import asyncio; from lib.cards import refresh_cards; asyncio.run(refresh_cards())"
```

Run that command after a new Hearthstone set releases. It upserts the new cache before removing stale entries, so a failed download does not empty it.

For a disposable local demo, you can also run:

```bash
docker compose exec backend python seed.py
```

This creates the demo account `demo@deckstash.app` with password `tavern123` and a sample deck. It is intentionally **not** part of normal startup and must never be run in production.

## Database and migrations

MongoDB collections are created and indexed through versioned migrations in [`backend/migrations/versions`](backend/migrations/versions). Applied versions are recorded in `schema_migrations`, making migrations safe to run repeatedly.

Run them manually if required:

```bash
docker compose exec backend python -m migrations.runner
```

When adding a schema change, create a new numbered migration module and register it in [`backend/migrations/runner.py`](backend/migrations/runner.py). Do not edit a migration that may already have been applied to a deployment.

## Development

The local Compose stack mounts `backend/` and `frontend/` into containers for automatic backend reload and Vite hot-module replacement.

Useful commands:

```bash
# Backend tests (requires the local stack to be running)
docker compose exec backend pytest -q

# Frontend type check
docker compose exec frontend yarn typecheck

# Frontend production build
docker compose exec frontend yarn build

# View service logs
docker compose logs -f backend frontend
```

Project layout:

```text
backend/                  FastAPI API, MongoDB data layer, migrations, and tests
frontend/                 React + TypeScript + Vite application
compose.yaml              Local development stack
compose.coolify.yaml      Production-only Coolify stack
COOLIFY_DEPLOYMENT.md     Coolify setup and operating instructions
```

## Deploy with Coolify

Use [`compose.coolify.yaml`](compose.coolify.yaml), not the local `compose.yaml`. It serves the React application through Nginx on container port `80`, keeps FastAPI and MongoDB private, applies migrations at startup, and initially downloads the card cache when needed. In Coolify, assign the domain to `frontend` as `https://decks.example.com`—without `:80`.

The deployment guide covers the required domain, CORS configuration, generated secrets, verification, backups, and card-cache refreshes:

**[Read the Coolify deployment guide →](COOLIFY_DEPLOYMENT.md)**

## Security notes

- Use a long, unique `SESSION_SECRET` in every environment.
- Keep MongoDB private in production; expose only the frontend service.
- Set `CORS_ORIGINS` to your exact HTTPS domain in production.
- Back up the production MongoDB volume off-server and test restoration.
- Rotate any database credential that has been exposed in chat, source control, or screenshots.

## License

This project is currently private and has no open-source license. Do not redistribute it unless a license is added.
