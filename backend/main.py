# ============================================================
# AI DIGITAL INVESTIGATOR
# backend/main.py
# ============================================================

import os
import hashlib
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    Depends,
    File,
    UploadFile,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

# ------------------------------------------------------------
# Load environment variables
# ------------------------------------------------------------

load_dotenv()


# ------------------------------------------------------------
# Database
# ------------------------------------------------------------

from backend.database import (
    engine,
    Base,
    get_db,
)

from backend.models import (
    Investigation,
    Evidence,
)


# ------------------------------------------------------------
# Schemas
# ------------------------------------------------------------

from backend.schemas import (
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationResponse,
)


# ------------------------------------------------------------
# AI Router
# ------------------------------------------------------------

from backend.routers.ai import (
    router as ai_router,
)


# ------------------------------------------------------------
# Other Routers
# ------------------------------------------------------------

# These imports are protected so that the application can
# still show a useful error if one router has a problem.

try:

    from backend.routers.investigations import (
        router as investigations_router,
    )

except Exception as error:

    print(
        "WARNING: Investigation router could not be loaded:",
        error,
    )

    investigations_router = None


try:

    from backend.routers.evidence import (
        router as evidence_router,
    )

except Exception as error:

    print(
        "WARNING: Evidence router could not be loaded:",
        error,
    )

    evidence_router = None


# ------------------------------------------------------------
# Semantic Search
# ------------------------------------------------------------

try:

    from ai_engine.rag.search import (
        search_evidence,
    )

except Exception as error:

    print(
        "WARNING: Semantic search could not be loaded:",
        error,
    )

    search_evidence = None


# ------------------------------------------------------------
# Text extraction
# ------------------------------------------------------------

try:

    from backend.services.text_extractor import (
        extract_text,
    )

except Exception as error:

    print(
        "WARNING: Text extractor could not be loaded:",
        error,
    )

    extract_text = None


# ------------------------------------------------------------
# AI service
# ------------------------------------------------------------

try:

    from backend.services.ai_service import (
        AIEngineService,
    )

    ai_service = AIEngineService()

except Exception as error:

    print(
        "WARNING: AI service could not be loaded:",
        error,
    )

    ai_service = None


# ============================================================
# APPLICATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print()
    print("=" * 60)
    print("AI DIGITAL INVESTIGATOR")
    print("=" * 60)

    # --------------------------------------------------------
    # Database initialization
    # --------------------------------------------------------

    try:

        Base.metadata.create_all(
            bind=engine
        )

        print(
            "Database: READY"
        )

    except Exception as error:

        print(
            "Database initialization failed:"
        )

        print(
            error
        )

        # Do not immediately crash the server.
        # This allows us to see the actual API error.

    # --------------------------------------------------------
    # AI status
    # --------------------------------------------------------

    if ai_service is not None:

        if ai_service.is_available():

            print(
                f"AI Engine: READY ({ai_service.model})"
            )

        else:

            print(
                "AI Engine: OFFLINE - "
                "OPENAI_API_KEY not configured"
            )

    else:

        print(
            "AI Engine: FAILED TO LOAD"
        )

    # --------------------------------------------------------
    # Semantic search status
    # --------------------------------------------------------

    if search_evidence is not None:

        print(
            "Semantic Search: READY"
        )

    else:

        print(
            "Semantic Search: OFFLINE"
        )

    print(
        "=" * 60
    )
    print()

    yield

    print()
    print(
        "AI Digital Investigator shutting down..."
    )


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="AI Digital Investigator",
    description=(
        "AI-powered digital investigation and "
        "evidence analysis platform."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# ROUTERS
# ============================================================

# ------------------------------------------------------------
# AI Router
# ------------------------------------------------------------

app.include_router(
    ai_router
)


# ------------------------------------------------------------
# Investigation Router
# ------------------------------------------------------------

if investigations_router is not None:

    app.include_router(
        investigations_router
    )


# ------------------------------------------------------------
# Evidence Router
# ------------------------------------------------------------

if evidence_router is not None:

    app.include_router(
        evidence_router
    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,

        "message":
            "AI Digital Investigator API is running.",

        "version":
            "1.0.0",

        "services": {

            "api":
                "online",

            "ai":
                (
                    "online"
                    if (
                        ai_service
                        and ai_service.is_available()
                    )
                    else "offline"
                ),

            "semantic_search":
                (
                    "online"
                    if search_evidence
                    else "offline"
                ),
        },

        "docs":
            "/docs",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health"
)
def health():

    return {

        "status":
            "healthy",

        "api":
            True,

        "ai":
            (
                ai_service.is_available()
                if ai_service
                else False
            ),

        "semantic_search":
            bool(
                search_evidence
            ),
    }


# ============================================================
# DATABASE HEALTH
# ============================================================

@app.get(
    "/health/database"
)
def database_health(
    db: Session = Depends(get_db),
):

    try:

        # Simple query to verify database connection

        db.execute(
            "SELECT 1"
        )

        return {

            "success":
                True,

            "database":
                "connected",

        }

    except Exception as error:

        return {

            "success":
                False,

            "database":
                "error",

            "detail":
                str(error),

        }


# ============================================================
# LIST INVESTIGATIONS
# ============================================================

@app.get(
    "/api/investigations"
)
def list_investigations(
    db: Session = Depends(get_db),
):

    investigations = (
        db.query(
            Investigation
        )
        .order_by(
            Investigation.id.desc()
        )
        .all()
    )

    return [
        {
            "id":
                item.id,

            "title":
                item.title,

            "description":
                item.description,

            "status":
                item.status,

            "created_at":
                item.created_at,

            "updated_at":
                item.updated_at,
        }

        for item in investigations
    ]


# ============================================================
# CREATE INVESTIGATION
# ============================================================

@app.post(
    "/api/investigations",
    status_code=201,
)
def create_investigation(
    data: InvestigationCreate,
    db: Session = Depends(get_db),
):

    investigation = Investigation(

        title=data.title,

        description=data.description,

        status="active",
    )

    db.add(
        investigation
    )

    db.commit()

    db.refresh(
        investigation
    )

    return {

        "success":
            True,

        "id":
            investigation.id,

        "title":
            investigation.title,

        "description":
            investigation.description,

        "status":
            investigation.status,

        "created_at":
            investigation.created_at,

        "updated_at":
            investigation.updated_at,
    }


# ============================================================
# GET SINGLE INVESTIGATION
# ============================================================

@app.get(
    "/api/investigations/{investigation_id}"
)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
):

    investigation = (
        db.query(
            Investigation
        )
        .filter(
            Investigation.id
            == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return {

        "success":
            True,

        "id":
            investigation.id,

        "title":
            investigation.title,

        "description":
            investigation.description,

        "status":
            investigation.status,

        "created_at":
            investigation.created_at,

        "updated_at":
            investigation.updated_at,
    }


# ============================================================
# UPDATE INVESTIGATION
# ============================================================

@app.put(
    "/api/investigations/{investigation_id}"
)
def update_investigation(
    investigation_id: int,

    data: InvestigationUpdate,

    db: Session = Depends(get_db),
):

    investigation = (
        db.query(
            Investigation
        )
        .filter(
            Investigation.id
            == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    investigation.title = (
        data.title
    )

    investigation.description = (
        data.description
    )

    if data.status is not None:

        investigation.status = (
            data.status
        )

    db.commit()

    db.refresh(
        investigation
    )

    return {

        "success":
            True,

        "message":
            "Investigation updated successfully",

        "id":
            investigation.id,

        "title":
            investigation.title,

        "description":
            investigation.description,

        "status":
            investigation.status,

        "created_at":
            investigation.created_at,

        "updated_at":
            investigation.updated_at,
    }


# ============================================================
# GET EVIDENCE
# ============================================================

@app.get(
    "/api/investigations/{investigation_id}/evidence"
)
def list_evidence(
    investigation_id: int,

    db: Session = Depends(get_db),
):

    investigation = (
        db.query(
            Investigation
        )
        .filter(
            Investigation.id
            == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    evidence_items = (
        db.query(
            Evidence
        )
        .filter(
            Evidence.investigation_id
            == investigation_id
        )
        .order_by(
            Evidence.id.desc()
        )
        .all()
    )

    return [

        {
            "id":
                item.id,

            "investigation_id":
                item.investigation_id,

            "filename":
                item.filename,

            "file_type":
                item.file_type,

            "file_size":
                item.file_size,

            "file_hash":
                item.file_hash,

            "processing_status":
                item.processing_status,

            "extracted_text":
                item.extracted_text,

            "uploaded_at":
                item.uploaded_at,
        }

        for item in evidence_items

    ]


# ============================================================
# UPLOAD EVIDENCE
# ============================================================

@app.post(
    "/api/investigations/{investigation_id}/evidence"
)
async def upload_evidence(
    investigation_id: int,

    file: UploadFile = File(...),

    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Check investigation
    # --------------------------------------------------------

    investigation = (
        db.query(
            Investigation
        )
        .filter(
            Investigation.id
            == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )


    # --------------------------------------------------------
    # Check filename
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No filename provided",
        )


    original_filename = (
        Path(
            file.filename
        ).name
    )


    extension = (
        Path(
            original_filename
        ).suffix.lower()
    )


    # --------------------------------------------------------
    # Read file
    # --------------------------------------------------------

    contents = await file.read()


    if not contents:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )


    # --------------------------------------------------------
    # Hash
    # --------------------------------------------------------

    file_hash = (
        hashlib.sha256(
            contents
        ).hexdigest()
    )


    # --------------------------------------------------------
    # Duplicate check
    # --------------------------------------------------------

    existing = (
        db.query(
            Evidence
        )
        .filter(
            Evidence.file_hash
            == file_hash
        )
        .first()
    )


    if existing:

        raise HTTPException(
            status_code=409,
            detail=(
                "This evidence file has "
                "already been uploaded."
            ),
        )


    # --------------------------------------------------------
    # Storage directory
    # --------------------------------------------------------

    base_dir = (
        Path(__file__)
        .resolve()
        .parent
        .parent
    )


    storage_dir = (
        base_dir
        / "storage"
        / "evidence"
    )


    storage_dir.mkdir(
        parents=True,
        exist_ok=True,
    )


    # --------------------------------------------------------
    # Storage filename
    # --------------------------------------------------------

    storage_filename = (
        f"{file_hash}_{original_filename}"
    )


    storage_path = (
        storage_dir
        / storage_filename
    )


    # --------------------------------------------------------
    # Save file
    # --------------------------------------------------------

    try:

        with open(
            storage_path,
            "wb",
        ) as output:

            output.write(
                contents
            )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not save evidence: {error}"
            ),
        )


    # --------------------------------------------------------
    # Extract text
    # --------------------------------------------------------

    extracted_text = ""


    if extract_text is not None:

        try:

            extracted_text = (
                extract_text(
                    str(
                        storage_path
                    )
                )
            )

        except Exception as error:

            print(
                "Text extraction failed:",
                error,
            )

            extracted_text = ""


    # --------------------------------------------------------
    # Processing status
    # --------------------------------------------------------

    processing_status = (
        "completed"
    )


    if not extracted_text:

        processing_status = (
            "completed"
        )


    # --------------------------------------------------------
    # AI analysis
    # --------------------------------------------------------

    ai_result = None


    if ai_service is not None:

        try:

            ai_result = (
                ai_service.analyze_text(
                    extracted_text,
                    original_filename,
                )
            )

        except Exception as error:

            print(
                "AI analysis failed:",
                error,
            )


    # --------------------------------------------------------
    # Create Evidence
    # --------------------------------------------------------

    evidence = Evidence(

        investigation_id=
            investigation_id,

        filename=
            original_filename,

        file_type=
            extension,

        file_size=
            len(contents),

        file_hash=
            file_hash,

        storage_path=
            str(storage_path),

        file_path=
            str(storage_path),

        processing_status=
            processing_status,

        extracted_text=
            extracted_text,
    )


    # --------------------------------------------------------
    # Optional AI result
    # --------------------------------------------------------

    if (
        ai_result
        and hasattr(
            Evidence,
            "ai_analysis_result"
        )
    ):

        import json

        evidence.ai_analysis_result = (
            json.dumps(
                ai_result,
                ensure_ascii=False,
            )
        )


    # --------------------------------------------------------
    # Save database
    # --------------------------------------------------------

    try:

        db.add(
            evidence
        )

        db.commit()

        db.refresh(
            evidence
        )

    except Exception as error:

        db.rollback()

        # Remove physical file if DB failed

        try:

            if storage_path.exists():

                storage_path.unlink()

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not save evidence "
                f"to database: {error}"
            ),
        )


    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "Evidence uploaded successfully.",

        "id":
            evidence.id,

        "investigation_id":
            evidence.investigation_id,

        "filename":
            evidence.filename,

        "file_type":
            evidence.file_type,

        "file_size":
            evidence.file_size,

        "file_hash":
            evidence.file_hash,

        "processing_status":
            evidence.processing_status,

        "extracted_text":
            evidence.extracted_text,

        "uploaded_at":
            evidence.uploaded_at,
    }


# ============================================================
# DOWNLOAD EVIDENCE
# ============================================================

@app.get(
    "/evidence/{evidence_id}/download"
)
def download_evidence(
    evidence_id: int,

    db: Session = Depends(get_db),
):

    evidence = (
        db.query(
            Evidence
        )
        .filter(
            Evidence.id
            == evidence_id
        )
        .first()
    )

    if not evidence:

        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )


    path = Path(
        evidence.storage_path
        or evidence.file_path
    )


    if not path.exists():

        raise HTTPException(
            status_code=404,
            detail="Stored file not found",
        )


    return FileResponse(
        path=path,

        filename=
            evidence.filename,

        media_type=
            "application/octet-stream",
    )


# ============================================================
# DELETE EVIDENCE
# ============================================================

@app.delete(
    "/evidence/{evidence_id}"
)
def delete_evidence(
    evidence_id: int,

    db: Session = Depends(get_db),
):

    evidence = (
        db.query(
            Evidence
        )
        .filter(
            Evidence.id
            == evidence_id
        )
        .first()
    )

    if not evidence:

        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )


    path = Path(
        evidence.storage_path
        or evidence.file_path
        or ""
    )


    try:

        if path.exists():

            path.unlink()


        db.delete(
            evidence
        )

        db.commit()


        return {

            "success":
                True,

            "message":
                "Evidence deleted successfully",

            "id":
                evidence_id,
        }


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not delete evidence: {error}"
            ),
        )


# ============================================================
# SEMANTIC SEARCH
# ============================================================

@app.get(
    "/investigations/{investigation_id}/search"
)
def semantic_search(
    investigation_id: int,

    query: str,

    top_k: int = 5,

    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Validate investigation
    # --------------------------------------------------------

    investigation = (
        db.query(
            Investigation
        )
        .filter(
            Investigation.id
            == investigation_id
        )
        .first()
    )


    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )


    # --------------------------------------------------------
    # Validate query
    # --------------------------------------------------------

    if not query.strip():

        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty",
        )


    # --------------------------------------------------------
    # Validate top_k
    # --------------------------------------------------------

    if (
        top_k < 1
        or top_k > 20
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "top_k must be between 1 and 20"
            ),
        )


    if search_evidence is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "Semantic search service is unavailable."
            ),
        )


    # --------------------------------------------------------
    # Search
    # --------------------------------------------------------

    try:

        results = (
            search_evidence(
                query=query,
                investigation_id=
                    investigation_id,
                top_k=top_k,
            )
        )

    except Exception as error:

        print(
            "Semantic search error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Semantic search failed: {error}"
            ),
        )


    return {

        "success":
            True,

        "investigation_id":
            investigation_id,

        "query":
            query,

        "results_count":
            len(results),

        "results":
            results,
    }


# ============================================================
# STARTUP INFORMATION
# ============================================================

@app.get(
    "/api/status"
)
def application_status():

    return {

        "application":
            "AI Digital Investigator",

        "version":
            "1.0.0",

        "backend":
            "FastAPI",

        "database":
            "PostgreSQL",

        "ai_engine":
            (
                ai_service.model
                if ai_service
                else "Unavailable"
            ),

        "ai_available":
            (
                ai_service.is_available()
                if ai_service
                else False
            ),

        "semantic_search":
            bool(
                search_evidence
            ),
    }