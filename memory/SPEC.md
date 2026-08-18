# Deck Stash — living spec

Personal vault for Hearthstone deck codes. Paste a deckstring; the backend decodes it
(pure-python base64/varint per the HearthSim spec) and enriches it with HearthstoneJSON
card metadata (names, mana cost, rarity, class, tile + 512px render art).

## Stack / layout
- Backend: FastAPI on `api_router` (`/api`). `lib/deckstrings.py` (decoder),
  `lib/cards.py` (HearthstoneJSON cache in Mongo `cards`), `lib/auth.py` (pbkdf2 +
  JWT httpOnly cookie `ds_session`), `routers/auth.py`, `routers/decks.py`,
  `routers/decoding.py` (`build_decoded`), `models/schemas.py`, `seed.py`.
- Frontend: pages `Login`, `Decks` (`/`), `DeckDetailPage` (`/decks/:deckId`);
  components under `src/components/deck/`; TS mirrors in `src/lib/types.ts`.

## Data model (Mongo)
- `users`: id (uuid4), email, password (pbkdf2 `salt$hash`)
- `decks`: id, user_id, name, code, notes, tags[], hero_class, hero_class_name,
  hero_name, format, card_count, dust_cost, created_at, updated_at (aware UTC)
- `cards`: dbf_id, card_id, name, cost, card_class, rarity, type, text, attack, health
  (~10.2k docs, seeded from https://api.hearthstonejson.com/v1/latest/enUS/cards.json)

## API
- `POST /api/auth/signup|login` (sets cookie), `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/decks/preview` — decode without saving; returns duplicate_of_id/name
- `GET /api/decks`, `POST /api/decks`, `GET /api/decks/{id}`,
  `PATCH /api/decks/{id}`, `DELETE /api/decks/{id}` — all scoped to the session user

## Key flows
1. Sign up / sign in (cookie session) → redirected to `/`.
2. Import deck code → live decode preview (class, format, card count, dust, duplicate
   warning) → name/tags/notes → save.
3. Deck grid grouped by class pills + search over name/class/tags/notes.
4. Deck detail: 30-card list sorted by mana cost with tile art + popover render,
   mana curve, copy code, edit, delete.

## Auth
Single role (deck owner). Sessions are httpOnly JWT cookies; `/api/auth/me` answers
"who am I". Seed/demo credentials in `memory/test_credentials.md`.
