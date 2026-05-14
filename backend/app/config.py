from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    ingest_token: str = ""

    chroma_path: Path = Path("./chroma_db")
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    data_dir: Path = _default_data_dir()

    chunk_size: int = 800
    chunk_overlap: int = 120
    retrieval_top_k: int = 8
    max_url_bytes: int = 2_000_000
    url_fetch_timeout: float = 60.0

    openai_chat_model: str = "gpt-4o-mini"

    database_url: str = (
        "postgresql+psycopg://rag:rag@localhost:5432/ragchat"
    )
    chat_history_limit: int = 20
    session_summary_max_chars: int = 2000
    chat_history_max_chars: int = 12000


settings = Settings()
