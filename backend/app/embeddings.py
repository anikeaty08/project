from __future__ import annotations

from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    if not texts:
        return []
    model = _get_model()
    vecs = model.encode(
        texts,
        batch_size=max(1, batch_size),
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return [row.tolist() for row in vecs]


def embed_query(text: str) -> list[float]:
    return embed_texts([text], batch_size=1)[0]
