from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    openai_api_key: str = ""
    ingest_token: str = ""

    chroma_path: Path = Path("../vector_store")
    # Local CPU embeddings (same approach as pre-Docker ingest on the host).
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    data_dir: Path = _default_data_dir()

    redis_url: str = ""
    embedding_cache_ttl_seconds: int = 86_400

    chunk_size: int = 800
    chunk_overlap: int = 120
    retrieval_top_k: int = 8
    max_url_bytes: int = 2_000_000
    url_fetch_timeout: float = 60.0

    openai_chat_model: str = "gpt-4o-mini"
    openai_vision_model: str = "gpt-4o-mini"
    openai_plant_vision_model: str = "gpt-4.1"

    database_url: str = (
        "postgresql+psycopg://rag:rag@localhost:5432/ragchat"
    )
    chat_history_limit: int = 20
    session_summary_max_chars: int = 2000
    chat_history_max_chars: int = 12000

    upload_dir: Path = Path("./uploads")
    max_upload_mb: int = 20
    prescription_extraction_min_chars: int = 80
    vision_pdf_max_pages: int = 3

    tavily_api_key: str = ""
    tavily_trusted_domains: str = (
        "fda.gov,nih.gov,who.int,nlm.nih.gov,ncbi.nlm.nih.gov,medlineplus.gov"
    )
    unsplash_access_key: str = ""

    clerk_issuer: str = ""
    clerk_audience: str = ""
    clerk_jwks_url: str = ""
    clerk_jwt_leeway_seconds: int = 120

    chromadb_upsert_batch_size: int = 4500


settings = Settings()
