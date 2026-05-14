# Backend (FastAPI)

RAG with **Chroma** + **local Sentence Transformers** embeddings, OpenAI chat/vision, PostgreSQL sessions, optional Redis embedding cache.

## Requirements

- Python 3.12+  
- **Docker (recommended):** `docker compose up -d` at repo root for Postgres + Redis only; run **ingest + uvicorn** from this directory.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` (examples below target Docker DBs on localhost):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql+psycopg://rag:rag@127.0.0.1:5432/ragchat` |
| `REDIS_URL` | `redis://127.0.0.1:6379/0` (optional; speeds repeated queries) |
| `CHROMA_PATH` | `../vector_store` |
| `EMBEDDING_MODEL` | `paraphrase-multilingual-MiniLM-L12-v2` (default) |
| `OPENAI_API_KEY` | Required for chat / vision (not for vector embedding) |

## Run API

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

If port **8000** is busy, pick another port and set `NEXT_PUBLIC_API_BASE_URL` in `fronteend-1/.env.local`.

## Ingest (from `backend/`)

```powershell
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0
# Include all URLs from data/Linkss.txt (slow):
.\.venv\Scripts\python -m app.ingest_cli --clear
```

Chroma writes to **`CHROMA_PATH`**. Reset: delete that folder or `--clear`.

## Reset local vector data

[scripts/clean_local_vector_store.ps1](../scripts/clean_local_vector_store.ps1) removes repo-root `vector_store/` and legacy `backend/chroma_db` if present.

## Docker (`--profile app`)

From repo root: `docker compose --profile app up -d --build`. Backend bind-mounts **`./vector_store`** — run ingest on the host first. See root [README.md](../README.md) for **`INGEST_TOKEN`**.

## HTTP routes

- `GET /health`  
- `POST /ingest/`  
- `POST /sessions/`, `GET /sessions/`, `GET /sessions/{id}/messages`, `POST /sessions/{id}/chat/`  
- `POST /chat/` — legacy RAG without DB session  

## Redis cache

With **`REDIS_URL`** set, **`embed_query`** results are cached for **`EMBEDDING_CACHE_TTL_SECONDS`** (default 86400). Bulk ingest does not use this cache.

## LLM agents and context rendering

Backend LLM behavior lives in separate Python agent modules under `app/llm/agents/`. Each agent owns its own prompt, input builder, and output handling; shared code only handles OpenAI calls, JSON parsing, and schema validation. Herb JSON records are rendered by `app/ingest/herb_formatter.py`, so changing labels or field order requires re-running ingest to refresh Chroma chunks.
