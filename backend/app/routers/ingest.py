from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.ingest.pipeline import run_ingest

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    clear: bool = False
    url_limit: int | None = None


class IngestResponse(BaseModel):
    chunks: int
    raw_sources: int | None = None
    data_dir: str | None = None
    message: str | None = None


@router.post("/", response_model=IngestResponse)
def ingest_endpoint(
    body: IngestRequest,
    x_ingest_token: str | None = Header(default=None, alias="X-Ingest-Token"),
):
    if settings.ingest_token and x_ingest_token != settings.ingest_token:
        raise HTTPException(status_code=401, detail="Invalid or missing ingest token")

    try:
        result = run_ingest(clear=body.clear, url_limit=body.url_limit)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return IngestResponse(**result)
