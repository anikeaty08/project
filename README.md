# Multilingual RAG (FastAPI + React + Chroma + Postgres + Redis)

Ayurveda / herb RAG with **session chat stored in PostgreSQL**, **smart retrieval** (dedicated query from a session agent), **ChromaDB** for vectors, optional **Redis** cache for query embeddings, and a **Docker Compose** stack for Postgres, Redis, API, UI, and one-off ingestion.

## Quick start (Docker)

1. Put your documents under `data/` (see [backend/README.md](backend/README.md) for ingest formats).

2. Create a **project root** `.env` (Compose reads this for variable substitution):

   ```env
   OPENAI_API_KEY=sk-...
   ```

3. Start core services:

   ```bash
   docker compose up -d --build
   ```

   - **API:** http://localhost:8000/docs  
   - **UI:** http://localhost:8080 (Nginx proxies `/sessions`, `/chat`, `/ingest`, `/health` to the API)

4. **Build the vector index** (uses the same `backend` image and `vector_store_data` volume):

   ```bash
   docker compose run --rm backend python -m app.ingest_cli --clear
   ```

   To index herbs and files only (skip downloading every URL in `Linkss.txt`):

   ```bash
   docker compose run --rm backend python -m app.ingest_cli --clear --url-limit 0
   ```

5. **Fresh vectors only:** delete local folders `backend/chroma_db` or `backend/vector_store` if you still have an old index, or remove the Docker volume:

   ```bash
   docker compose down
   docker volume rm project_vector_store_data
   ```

   (Volume name may be prefixed with your project directory name, e.g. `project_vector_store_data`. Use `docker volume ls` to find it.)

## Redis

Compose runs **Redis 7** with AOF persistence, **256MB maxmemory**, and **`allkeys-lru`** eviction so embedding cache keys expire under pressure. The API receives `REDIS_URL=redis://redis:6379/0` automatically.

For **local** API + Docker Redis only: set `REDIS_URL=redis://127.0.0.1:6379/0` in `backend/.env` (see [backend/.env.example](backend/.env.example)).

## Ingest token (`INGEST_TOKEN`)

A shared secret so random clients cannot call **`POST /ingest/`** (re-indexing is heavy). When `INGEST_TOKEN` is set, every ingest request must include header **`X-Ingest-Token: <same value>`**.

- **Docker Compose** defaults it to `rag-dev-ingest-xk9m2p7q` if you do not set `INGEST_TOKEN` in the root `.env`. Override there for production.
- **Frontend**: copy [frontend/.env.example](frontend/.env.example) to `frontend/.env.local` with the **same** `VITE_INGEST_TOKEN` for local Vite. The Docker-built UI receives the token via build `args` from `INGEST_TOKEN`.
- To **disable** the check (open ingest, dev only), set `INGEST_TOKEN=` empty in root `.env` and rebuild; leave `INGEST_TOKEN` unset in `backend/.env` for local API without Docker.

## Services

| Service    | Port (host) | Purpose                          |
|-----------|-------------|----------------------------------|
| postgres  | 5432        | Chat sessions + messages         |
| redis     | 6379        | Query-embedding cache (API uses in Docker) |
| backend   | 8000        | FastAPI                          |
| frontend  | 8080        | Static UI + API reverse proxy    |

## Local development (no Docker UI)

- Start Postgres + Redis: `docker compose up -d postgres redis`
- Backend: see [backend/README.md](backend/README.md)
- Frontend: see [frontend/README.md](frontend/README.md)

## Repo layout

- `backend/` — FastAPI, agents, Chroma, ingest CLI  
- `frontend/` — Vite + React chat UI  
- `data/` — Your PDFs, TXT, MD, `herb.json`, `Linkss.txt`, etc.  
- `docker-compose.yml` — Stack definition  

## Chroma batch limit

Large ingests are **upserted in batches** (default 4500 vectors per request) to stay under Chroma’s internal batch cap (~5461). Tune `CHROMADB_UPSERT_BATCH_SIZE` in `backend/.env` if needed.
