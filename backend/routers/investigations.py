from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Evidence, Investigation
from backend.schemas import (
    InvestigationCreate,
    InvestigationResponse,
    InvestigationUpdate,
)


router = APIRouter(
    prefix="/investigations",
    tags=["Investigations"],
)


# =========================================================
# CREATE
# =========================================================

@router.post(
    "",
    response_model=InvestigationResponse,
    status_code=201,
)
@router.post(
    "/",
    response_model=InvestigationResponse,
    status_code=201,
)
def create_investigation(
    investigation: InvestigationCreate,
    db: Session = Depends(get_db),
):

    title = investigation.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Investigation title cannot be empty",
        )

    item = Investigation(
        title=title,
        description=investigation.description,
        status="Active",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


# =========================================================
# LIST
# =========================================================

@router.get(
    "",
    response_model=list[InvestigationResponse],
)
@router.get(
    "/",
    response_model=list[InvestigationResponse],
)
def list_investigations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):

    return (
        db.query(Investigation)
        .order_by(
            Investigation.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


# =========================================================
# GET ONE
# =========================================================

@router.get(
    "/{investigation_id}",
    response_model=InvestigationResponse,
)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return item


# =========================================================
# UPDATE
# =========================================================

@router.put(
    "/{investigation_id}",
    response_model=InvestigationResponse,
)
def update_investigation(
    investigation_id: int,
    data: InvestigationUpdate,
    db: Session = Depends(get_db),
):

    item = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    if data.title is not None:
        title = data.title.strip()

        if not title:
            raise HTTPException(
                status_code=400,
                detail="Title cannot be empty",
            )

        item.title = title

    if data.description is not None:
        item.description = data.description

    if data.status is not None:
        item.status = data.status

    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)

    return item


# =========================================================
# DELETE
# =========================================================

@router.delete(
    "/{investigation_id}"
)
def delete_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    db.query(Evidence).filter(
        Evidence.investigation_id
        == investigation_id
    ).delete(
        synchronize_session=False
    )

    db.delete(item)
    db.commit()

    return {
        "message": "Investigation deleted successfully",
        "id": investigation_id,
    }