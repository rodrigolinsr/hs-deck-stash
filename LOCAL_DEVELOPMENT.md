# Local development

This project can run without Emergent through Docker Compose. The stack starts
MongoDB, FastAPI on port 8001, and the Vite frontend on port 3000.

## First run

1. Copy `.env.example` to `.env` and replace `SESSION_SECRET` with a long random value.
2. Run `docker compose up --build`.
3. In a separate terminal, initialize the sample data with:

   ```sh
   docker compose exec backend python seed.py
   ```

Open http://localhost:3000. The migration runner executes before FastAPI starts;
its applied versions are stored in MongoDB's `schema_migrations` collection.

## Day-to-day commands

```sh
docker compose up
docker compose down
docker compose exec backend python -m migrations.runner
docker compose exec backend python seed.py
docker compose exec backend pytest
```

Source folders are mounted into the containers, so FastAPI and Vite hot-reload
when code changes. MongoDB data is retained in the `mongo_data` Docker volume.
To intentionally delete that local data, run `docker compose down -v`.

## Importing Atlas data

Do not point the local stack at the production Atlas URI. Use an Atlas read-only
user and an explicit backup/restore process after reviewing which personal data
should be retained in development.
