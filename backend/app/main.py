import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, health, ingest, sessions, unsplash_intent, prakriti

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        from app.db.session import init_db

        init_db()
    except Exception as e:
        logging.warning("Database init skipped or failed: %s", e)
    yield


app = FastAPI(title="Multilingual RAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(sessions.router)
app.include_router(unsplash_intent.router)
app.include_router(prakriti.router)


@app.get("/")
def root():
    return {"service": "multilingual-rag", "docs": "/docs"}
