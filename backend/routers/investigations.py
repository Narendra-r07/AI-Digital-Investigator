from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Investigation
from backend.schemas import (
    InvestigationCreate,
    InvestigationResponse,
)

router = APIRouter(
    prefix="/investigations",
    tags=["Investigations"],
)


@router.get("", response_model=List[InvestigationResponse])
def get_investigations(
    db: Session = Depends(get_db),
):
    return (
        db.query(Investigation)
        .order_by(Investigation.created_at.desc())
        .all()
    )


@router.post(
    "",
    response_model=InvestigationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_investigation(
    data: InvestigationCreate,
    db: Session = Depends(get_db),
):
    title = data.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Investigation title is required.",
        )

    investigation = Investigation(
        title=title,
        description=data.description,
        status="Active",
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return investigation


@router.get(
    "/{investigation_id}",
    response_model=InvestigationResponse,
)
def get_investigation(
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

    return investigation


@router.delete("/{investigation_id}")
def delete_investigation(
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

    db.delete(investigation)
    db.commit()

    return {
        "success": True,
        "message": "Investigation deleted.",
    }