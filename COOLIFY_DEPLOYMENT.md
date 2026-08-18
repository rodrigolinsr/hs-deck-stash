# Deploying HSDeckStash with Coolify

This deployment uses one public HTTPS site. Nginx serves the React app and
proxies `/api` to the private FastAPI service; MongoDB is also private. Do not
use the local-development `compose.yaml` in Coolify.

## Before deploying

1. Commit the project (including `compose.coolify.yaml`) to a private Git repository.
2. Point an A/AAAA DNS record such as `decks.example.com` to the Coolify server.
3. Decide where MongoDB will live:
   - The included `mongo` service is the simplest option. It has a persistent
     Docker volume, but you must configure regular off-server backups.
   - For managed MongoDB/Atlas, remove the `mongo` service and replace
     `MONGO_URL` with a new least-privilege connection string. Allow-list the
     Coolify server's egress IP.
4. Rotate any MongoDB password that has been copied into a chat, ticket, or
   repository history.

## Coolify setup

1. Create a **Docker Compose Application** from the Git repository.
2. Choose `compose.coolify.yaml` as its Compose definition.
3. In **Environment Variables**, set:

   ```dotenv
   DB_NAME=hsdeckstash
   CORS_ORIGINS=https://decks.example.com
   ```

   Coolify generates and persists `SERVICE_USER_MONGO`,
   `SERVICE_PASSWORD_64_MONGO`, and `SERVICE_HEX_64_HSDECKSTASH` from the
   Compose file. Do not replace them with committed values.

4. Assign `https://decks.example.com:80` to the **frontend** service only.
   Do not assign a domain or host port to `backend` or `mongo`.
5. Deploy. Startup applies outstanding migrations and downloads the card cache
   only when it is absent or outdated. The first deployment can therefore take
   a little longer.

## Verification after deployment

1. Open the domain and create a new account.
2. Sign out and sign back in to verify the HTTPS session cookie.
3. Import a deck and open its detail page.
4. Create a folder, assign a deck to it, and check that it remains after a
   redeploy.
5. Confirm that the `mongo_data` volume is included in your backup process.

## Ongoing operations

- Deploys are safe to repeat: migrations are recorded in `schema_migrations`.
- Card definitions are versioned, but new card releases still need a deliberate
  refresh. Run `python -c 'import asyncio; from lib.cards import refresh_cards;
  asyncio.run(refresh_cards())'` inside the backend container after a new set,
  or add it as a scheduled Coolify task.
- Never run `python seed.py` in production: it creates the demo account.
