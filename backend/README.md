# Backend

FastAPI RAG backend for Vaidya AI.

It handles Clerk auth, user-owned chat sessions, Chroma retrieval, OpenAI chat and vision agents, plant image detection, prescription or document uploads, Tavily verification, Postgres history, and optional Redis query caching.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
```

Set these in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://rag:rag@127.0.0.1:5432/ragchat
REDIS_URL=redis://127.0.0.1:6379/0
CHROMA_PATH=../vector_store
OPENAI_API_KEY=
CLERK_ISSUER=
```

## Run

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

If you use another port, update `NEXT_PUBLIC_API_BASE_URL` in `fronteend-1/.env.local`.

## Ingest

```powershell
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0
```

Use this for the full URL list from `data/Linkss.txt`:

```powershell
.\.venv\Scripts\python -m app.ingest_cli --clear
```

## Docker

From the repo root:

```powershell
docker compose up -d
```

Docker starts only Postgres and Redis. Run ingest and the API from this folder.

## Routes

```text
GET  /health
POST /ingest/
GET  /sessions/
POST /sessions/
GET  /sessions/{id}/messages
GET  /sessions/{id}/uploads
POST /sessions/{id}/uploads
POST /sessions/{id}/chat/
```
