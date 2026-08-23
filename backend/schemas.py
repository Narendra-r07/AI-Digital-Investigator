from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InvestigationCreate(BaseModel):
    title: str
    description: str | None = None


class InvestigationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class InvestigationResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class EvidenceResponse(BaseModel):
    id: int
    investigation_id: int
    filename: str
    file_type: str | None
    file_size: int
    file_hash: str | None
    storage_path: str | None
    processing_status: str
    extracted_text: str | None
    uploaded_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class SearchResponse(BaseModel):
    investigation_id: int
    query: str
    results_count: int
    results: list