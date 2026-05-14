from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator


@dataclass
class TextChunk:
    text: str
    index: int


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[TextChunk]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be in [0, chunk_size)")

    text = text.strip()
    if not text:
        return []

    chunks: list[TextChunk] = []
    start = 0
    idx = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        piece = text[start:end].strip()
        if piece:
            chunks.append(TextChunk(text=piece, index=idx))
            idx += 1
        if end >= n:
            break
        start = end - chunk_overlap

    return chunks
