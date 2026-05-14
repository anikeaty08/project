# Multilingual RAG (FastAPI + React + Chroma + Postgres + Redis)

Ayurveda / herb RAG with PostgreSQL chat history, Chroma retrieval, **local Sentence Transformers embeddings** (ingest from your machine), and optional **Redis** caching for query vectors.

**Default Compose:** Postgres + Redis only. Run **API + ingest from [`backend/`](backend/)** with `backend/.env` (see [backend/.env.example](backend/.env.example)). Optional **`docker compose --profile app`** runs backend + frontend in Docker; Chroma still reads **`./vector_store`** on the host (bind mount).

## Quick start

1. Put documents under `data/` (see [backend/README.md](backend/README.md)).
2. `docker compose up -d` — Postgres + Redis.
3. Copy [backend/.env.example](backend/.env.example) → `backend/.env` and set at least **`DATABASE_URL`**, **`OPENAI_API_KEY`** (chat), **`REDIS_URL`** if you use Redis, **`CHROMA_PATH=../vector_store`**.
4. From `backend/`: `python -m app.ingest_cli --clear --url-limit 0` (first run downloads the embedding model).
5. `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
6. UI: `cd frontend && npm run dev` (proxy to your API port).

**Embeddings:** `EMBEDDING_MODEL` defaults to **`paraphrase-multilingual-MiniLM-L12-v2`**. If you change it, clear **`./vector_store`** (or `ingest_cli --clear`) and re-ingest. **Do not run ingest in Docker** unless you choose to; the intended path is the host `backend/` folder.

**Optional full stack:** `docker compose --profile app up -d --build` — API http://localhost:8000/docs, UI http://localhost:8080. Ingest Chroma on the host first so `./vector_store` exists.

## Ingest token

When **`INGEST_TOKEN`** is set (Compose defaults it; override in root `.env`), **`POST /ingest/`** requires header **`X-Ingest-Token`**. Match [frontend/.env.example](frontend/.env.example) **`VITE_INGEST_TOKEN`** for local Vite. Empty token = open ingest (dev only).

## Services

| Service   | Port | Default in Compose      |
|----------|------|-------------------------|
| postgres | 5432 | always                  |
| redis    | 6379 | always                  |
| backend  | 8000 | profile **`app`** only   |
| frontend | 8080 | profile **`app`** only   |

## Redis

Compose runs Redis 7 with AOF, **256MB maxmemory**, **allkeys-lru**. Set **`REDIS_URL=redis://127.0.0.1:6379/0`** in `backend/.env` for a local API. In-container API uses **`redis://redis:6379/0`** (set in Compose).

## Repo layout

- `backend/` — FastAPI, agents, Chroma, ingest CLI  
- `frontend/` — Vite + React  
- `data/` — PDFs, TXT, MD, `herb.json`, `Linkss.txt`, …  
- `vector_store/` — Chroma persistence (gitignored; created by ingest)

Large ingests use batched upserts (**`CHROMADB_UPSERT_BATCH_SIZE`** in `backend/.env`, default 4500).

## Prescription uploads and verification

Composer **+** attaches PDFs/images/text; uploads go to **`POST /sessions/{id}/uploads`**. Weak PDF text can trigger vision (**`OPENAI_VISION_MODEL`**). Optional **`TAVILY_API_KEY`** enables web verification with **`TAVILY_TRUSTED_DOMAINS`**. Compose uses volume **`uploads_data`** at **`/app/uploads`** when the API runs in Docker.
