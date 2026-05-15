# 🌿 Vaidya AI

Ayurveda RAG chat with plant image detection, document uploads, Tavily verification, Clerk login, Postgres chat history, Redis cache, and a Next.js frontend.

Docker is intentionally small now. It starts only Postgres and Redis. Run the backend and `fronteend-1` locally so development stays fast and simple.

## 🚀 Run It

Step 1

```powershell
docker compose up -d
```

Step 2

```powershell
cd backend
copy .env.example .env
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

Step 3

```powershell
cd fronteend-1
copy .env.local.example .env.local
npm install
npm run dev
```

Open the Next.js URL printed by `npm run dev`.

## 🔐 Auth

The frontend uses Clerk.

Each backend request sends the Clerk bearer token.

The backend stores sessions with the Clerk user id.

One user cannot list, open, delete, upload to, or chat inside another user session.

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

`CLERK_JWKS_URL` can stay empty when `CLERK_ISSUER` is set.

## 💬 Chat

New chats get a useful name from the first message.

The user message appears first.

Then the model thinks.

Then the assistant answer appears.

Uploads can include plant images, medicine photos, PDFs, text files, and markdown files.

## 🎙️ Voice

The mic button turns speech into text in the chat box.

The speaker button reads assistant replies aloud.

The text answer still stays on screen, so voice never hides the actual response.

## 🧠 Backend

FastAPI handles:

```text
Clerk auth
Session ownership
Chat orchestration
RAG retrieval
Plant vision
Prescription and document parsing
Upload jobs
Tavily verification
Postgres messages
Chroma indexing
```

## 🧱 Docker

Only infrastructure runs in Docker:

```text
Postgres  localhost:5432
Redis     localhost:6379
```

Backend and frontend run from the host.

## 📁 Folders

```text
backend      FastAPI RAG backend
fronteend-1  Active Next.js frontend
data         Source documents
vector_store Chroma database
```

The old `frontend` folder is deleted.

## 📋 Copy These

Start database and cache:

```powershell
docker compose up -d
```

Backend:

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

Frontend:

```powershell
cd fronteend-1
npm run dev
```
