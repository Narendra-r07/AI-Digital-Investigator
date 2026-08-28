import hashlib
import os
from pathlib import Path
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Evidence, Investigation
from backend.schemas import EvidenceResponse
from backend.services.text_extractor import extract_text

router = APIRouter(
    prefix="/investigations",
    tags=["Evidence"],
)

BASE_DIR = Path(__file__).resolve().parents[2]

STORAGE_DIR = BASE_DIR / "storage" / "evidence"
STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_EXTENSIONS = {
    ".txt",
    ".pdf",
    ".docx",
    ".md",
    ".csv",
    ".log",
    ".json",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def calculate_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)

    filename = filename.replace(
        "\x00",
        "",
    )

    return filename[:255]


@router.get(
    "/{investigation_id}/evidence",
    response_model=List[EvidenceResponse],
)
def get_evidence(
    investigation_id: int,
    db: Session = Depends(get_db),
):
    investigation = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id)
        .first()
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    return (
        db.query(Evidence)
        .filter(
            Evidence.investigation_id == investigation_id
        )
        .order_by(Evidence.uploaded_at.desc())
        .all()
    )


@router.post(
    "/{investigation_id}/evidence",
    response_model=EvidenceResponse,
)
async def upload_evidence(
    investigation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    investigation = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id)
        .first()
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    filename = safe_filename(file.filename)

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {extension}. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum size is 25 MB.",
        )

    file_hash = calculate_hash(content)

    # Duplicate check inside the same investigation
    existing = (
        db.query(Evidence)
        .filter(
            Evidence.investigation_id == investigation_id,
            Evidence.file_hash == file_hash,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This file has already been uploaded to this investigation.",
        )

    stored_name = f"{file_hash}_{filename}"

    stored_path = STORAGE_DIR / stored_name

    try:
        stored_path.write_bytes(content)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save file: {exc}",
        )

    evidence = Evidence(
        investigation_id=investigation_id,
        filename=filename,
        file_type=extension,
        file_size=len(content),
        file_hash=file_hash,
        storage_path=str(stored_path),
        processing_status="processing",
        extracted_text=None,
        ai_analysis_result=None,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # Extract text and index in vector store
    try:
        extracted = extract_text(
            str(stored_path)
        )

        evidence.extracted_text = extracted
        evidence.processing_status = "completed"

        # Index in ChromaDB Vector Store
        try:
            from ai_engine.rag.indexer import index_evidence
            if extracted:
                index_evidence(
                    evidence_id=evidence.id,
                    investigation_id=investigation_id,
                    filename=filename,
                    extracted_text=extracted,
                )
        except Exception as idx_err:
            print(f"Vector indexing warning for evidence {evidence.id}: {idx_err}")

    except Exception as exc:
        evidence.extracted_text = (
            f"Text extraction failed: {str(exc)}"
        )
        evidence.processing_status = "failed"

    db.commit()
    db.refresh(evidence)

    return evidence


@router.delete(
    "/evidence/{evidence_id}",
)
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found.",
        )

    try:
        if evidence.storage_path:
            path = Path(evidence.storage_path)

            if path.exists():
                path.unlink()

    except Exception:
        pass

    db.delete(evidence)
    db.commit()

    return {
        "success": True,
        "message": "Evidence deleted.",
    }


@router.get(
    "/evidence/{evidence_id}",
    response_model=EvidenceResponse,
)
def get_single_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found.",
        )

    return evidence