# Multilingual RAG

FastAPI Ayurveda/herb RAG with PostgreSQL chat history, Chroma retrieval, OpenAI chat/vision agents, optional Tavily verification, and a Clerk-authenticated Next.js frontend in `fronteend-1`.

Default Compose starts Postgres and Redis only. Run ingest and the API from `backend/` for local development, or use `docker compose --profile app up -d --build` for the full stack after Chroma has been ingested on the host.

## Quick Start

1. Put documents under `data/`.
2. Start infrastructure: `docker compose up -d`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Set at least `DATABASE_URL`, `OPENAI_API_KEY`, `CHROMA_PATH=../vector_store`, and Clerk auth settings.
5. From `backend/`, run `.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0`.
6. Start the API: `.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload`.
7. Copy `fronteend-1/.env.local.example` to `fronteend-1/.env.local`, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_BASE_URL`.
8. From `fronteend-1/`, run `npm run dev`.

## Auth

The active frontend uses Clerk. The backend validates Clerk bearer tokens and stores sessions by Clerk user ID, so users can only list, open, delete, upload to, and chat inside their own sessions.

Frontend env:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5500
```

Backend env:

```env
CLERK_ISSUER=
CLERK_AUDIENCE=
CLERK_JWKS_URL=
```

`CLERK_JWKS_URL` is optional when `CLERK_ISSUER` is set.

## Services

| Service | Port | Default in Compose |
| --- | --- | --- |
| postgres | 5432 | always |
| redis | 6379 | always |
| backend | 8000 | profile `app` only |
| fronteend-1 | 8080 | profile `app` only |

## Repo Layout

- `backend/` - FastAPI, deterministic chat/upload orchestration, LLM agents, Chroma, ingest CLI
- `fronteend-1/` - Next.js + Clerk frontend wired to the RAG backend
- `data/` - PDFs, TXT, MD, `herb.json`, `Linkss.txt`
- `vector_store/` - Chroma persistence, created by ingest and gitignored

## Uploads And Verification

Uploads go to `POST /sessions/{id}/uploads` and are processed by backend services. Images are routed deterministically to plant vision or prescription/document parsing based on the prompt. PDFs/text are extracted page-wise where possible, indexed into Chroma, and can be verified with Tavily when `TAVILY_API_KEY` is configured.

Large files use queued in-process jobs with DB status, so chat can report when an upload is still processing instead of blocking forever.
