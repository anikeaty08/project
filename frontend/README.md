# Frontend (React + Vite)

Chat UI for multilingual RAG: session list, persisted history (via backend Postgres), sources panel, re-index control.

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Default dev server: http://localhost:5173  

`vite.config.js` proxies API paths to the backend (default `http://127.0.0.1:8000`). Change the proxy `target` if your API runs elsewhere.

### Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Empty string = same origin (dev proxy or production Nginx). Set to full API URL if the UI is hosted separately. |
| `VITE_INGEST_TOKEN` | Must match backend `INGEST_TOKEN` when ingest is protected. Copy [.env.example](.env.example) to `.env.local`. |

## Production build

```bash
npm run build
```

Output in `dist/`. The [Dockerfile](Dockerfile) runs this build and serves files with **Nginx**, reverse-proxying `/sessions`, `/chat`, `/ingest`, `/health`, and `/docs` to the `backend` service (see `nginx.conf`).

## Docker

Built from repo root:

```bash
docker compose build frontend
```

Published on host port **8080** → container port 80.
