from __future__ import annotations

from functools import lru_cache

from fastembed import TextEmbedding

from app.config import settings


@lru_cache(maxsize=1)
def get_model() -> TextEmbedding:
    return TextEmbedding(model_name=settings.embedding_model)


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    if not texts:
        return []
    model = get_model()
    return [vec.tolist() for vec in model.embed(texts, batch_size=batch_size)]


def embed_query(text: str) -> list[float]:
    return embed_texts([text], batch_size=1)[0]
