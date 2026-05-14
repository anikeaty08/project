from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.models.session_upload import SessionUpload
from app.services.observability import safe_error, traced_stage
from app.services.upload_indexing import UploadIndexingService
from app.services.upload_processing import UploadProcessingService
from app.services.upload_verification import UploadVerificationService


class UploadJobRunner:
    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=2)

    def enqueue(self, upload_id: uuid.UUID, user_context: str | None = None) -> None:
        self._executor.submit(self.process_now, upload_id, user_context)

    def process_now(self, upload_id: uuid.UUID, user_context: str | None = None) -> None:
        SessionLocal = get_session_factory()
        db: Session = SessionLocal()
        try:
            upload = db.get(SessionUpload, upload_id)
            if upload is None:
                return
            trace_id = upload.trace_id or uuid.uuid4().hex
            upload.status = "processing"
            upload.processing_error = None
            db.commit()

            with traced_stage(trace_id, upload.session_id, "upload.process"):
                parsed = UploadProcessingService().process(upload, user_context)
            with traced_stage(trace_id, upload.session_id, "upload.verify"):
                verify = UploadVerificationService().verify_if_needed(
                    upload, parsed, user_context
                )
            with traced_stage(trace_id, upload.session_id, "upload.index"):
                UploadIndexingService().index_parse(
                    upload.session_id,
                    upload.id,
                    upload.original_filename,
                    parsed,
                )

            upload.parse_result_json = parsed
            upload.verify_result_json = verify
            upload.status = "completed"
            upload.processed_at = datetime.now(timezone.utc)
            db.commit()
        except Exception as exc:
            try:
                upload = db.get(SessionUpload, upload_id)
                if upload is not None:
                    upload.status = "failed"
                    upload.processing_error = safe_error(exc)
                    upload.processed_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception:
                db.rollback()
        finally:
            db.close()


upload_job_runner = UploadJobRunner()
