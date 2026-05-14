# Backend (FastAPI)

Python API: RAG retrieval (Chroma + **FastEmbed** / ONNX embeddings, no PyTorch), dual `gpt-4o-mini` agents (session query + grounded answer), PostgreSQL chat history, optional Redis embedding cache.

## Requirements

- Python 3.12+ recommended  
- For local DB: Docker `postgres` + `redis` from repo root (`docker compose up -d postgres redis`)

### Docker-only: you do not need `backend/.venv`

The API runs inside the **Docker image**; `backend/.venv` is only for running Python on your PC.

To delete `backend/.venv`, **stop anything using it** first (otherwise Windows locks `.dll` / `.pyd` files):

1. Stop **uvicorn** / **Python** terminals pointed at this project (and Cursor terminals whose cwd is `backend`).
2. In Task Manager, end stray **Python** processes if needed.
3. Run from repo root:

   ```powershell
   .\scripts\remove-backend-venv.ps1
   ```

   Or delete `backend\.venv` in File Explorer after closing those processes.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
# Edit .env: OPENAI_API_KEY, DATABASE_URL, optional REDIS_URL
```

## Run API

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

If port **8000** is blocked on Windows, use another port (e.g. `8765`) and point the Vite proxy in `frontend/vite.config.js` at that port.

## Reset local vector data

Run [scripts/clean_local_vector_store.ps1](../scripts/clean_local_vector_store.ps1) to delete `backend/chroma_db` and `backend/vector_store` on disk. For Docker, remove the `vector_store_data` volume (see root [README.md](../README.md)).

## Ingest (vectors)

From `backend/` with venv active:

```powershell
# Herbs + local files only (no URLs from Linkss.txt)
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0

# Everything including all URLs in data/Linkss.txt (slow / large)
.\.venv\Scripts\python -m app.ingest_cli --clear
```

Chroma writes under `CHROMA_PATH` (default `./vector_store`). Large runs use **batched upserts** to avoid `Batch size ... greater than max batch size` errors.

## Docker

From the **repo root**, `docker compose up -d --build` runs **`vector-init`** (first-time ingest if needed), then **`backend`**, then **`frontend`**. Ingest does **not** require `OPENAI_API_KEY`; chat does.

See the root [README.md](../README.md) for `AUTO_INGEST_URL_LIMIT`, volumes, and re-indexing.

Build is defined in [Dockerfile](Dockerfile) with context at the **repo root** (see root `docker-compose.yml`).

Environment (typical):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for chat only; API starts without it |
| `DATABASE_URL` | Postgres SQLAlchemy URL |
| `REDIS_URL` | Optional, e.g. `redis://localhost:6379/0` |
| `DATA_DIR` | Folder to read for ingest (Docker: `/data`) |
| `CHROMA_PATH` | Chroma persistence directory |
| `INGEST_TOKEN` | If set, `POST /ingest/` requires `X-Ingest-Token` header (see root README) |

## Main HTTP routes

- `GET /health`  
- `POST /ingest/` — rebuild index  
- `POST /sessions/`, `GET /sessions/`, `GET /sessions/{id}/messages`, `POST /sessions/{id}/chat/`  
- `POST /chat/` — legacy full `messages[]` RAG (no DB session)

## Redis cache

When `REDIS_URL` is set, **single-query** embeddings (`embed_query`) are cached with TTL `EMBEDDING_CACHE_TTL_SECONDS` to speed repeated questions. Ingest bulk embedding does not use this cache.
