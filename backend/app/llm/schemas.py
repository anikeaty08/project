from __future__ import annotations

from pydantic import BaseModel, Field


class MedicationItem(BaseModel):
    name: str = ""
    strength: str = ""
    frequency: str = ""


class SessionQueryResult(BaseModel):
    retrieval_query: str = ""
    summary_delta: str = ""


class PrescriptionIntentResult(BaseModel):
    prescription_related: bool = False


class PrescriptionDocumentResult(BaseModel):
    medications: list[MedicationItem] = Field(default_factory=list)
    doctor: str = ""
    date: str = ""
    raw_notes: str = ""
    confidence: float = 0.0
    retrieval_query: str = ""
    provenance: str = ""
    flat_text: str = ""
    page_notes: list[str] = Field(default_factory=list)


class PlantImageResult(BaseModel):
    likely_name: str = ""
    botanical_name: str = ""
    confidence: float = 0.0
    visual_evidence: list[str] = Field(default_factory=list)
    uncertainty: str = ""
    retrieval_query: str = ""
    raw_notes: str = ""
    provenance: str = ""
    flat_text: str = ""


class CitationItem(BaseModel):
    title: str = ""
    url: str = ""
    snippet: str = ""


class PrescriptionVerifyResult(BaseModel):
    verified_summary: str = ""
    supplementary_notes: str = ""
    trusted_citations: list[CitationItem] = Field(default_factory=list)
    other_citations: list[CitationItem] = Field(default_factory=list)
    limitations: str = ""
    tavily_raw_result_count: int = 0


class UnsplashIntentResult(BaseModel):
    show_images: bool = False
    keyword: str = ""
