import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.database import Base, engine
from backend.routers import ai
from backend.routers import evidence
from backend.routers import investigations




# ---------------------------------------------------------
# APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="AI Digital Investigator",
    description=(
        "AI-powered digital evidence investigation platform"
    ),
    version="2.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

cors_env = os.getenv("CORS_ORIGINS", "*").strip()
if cors_env == "*" or not cors_env:
    allowed_origins = ["*"]
    allow_credentials = False
else:
    allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]

STORAGE_DIR = (
    BASE_DIR / "storage" / "evidence"
)

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ---------------------------------------------------------
# DATABASE INITIALIZATION
# ---------------------------------------------------------

@app.on_event("startup")
def startup():

    try:
        Base.metadata.create_all(
            bind=engine
        )

        print(
            "Database initialized successfully."
        )

    except Exception as exc:

        print(
            f"Database initialization failed: {exc}"
        )


# ---------------------------------------------------------
# ROUTERS
# ---------------------------------------------------------

app.include_router(
    investigations.router
)

app.include_router(
    evidence.router
)

app.include_router(
    ai.router
)


# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------

@app.get("/health")
def health():

    database_status = "unknown"

    try:

        with engine.connect() as connection:
            connection.execute(
                text("SELECT 1")
            )

        database_status = "online"

    except Exception:

        database_status = "offline"

    return {
        "status": "online",
        "service": "AI Digital Investigator",
        "database": database_status,
    }


# ---------------------------------------------------------
# DASHBOARD STATISTICS
# ---------------------------------------------------------

@app.get("/dashboard/stats")
def dashboard_stats():

    from backend.database import SessionLocal
    from backend.models import Evidence, Investigation

    db = SessionLocal()

    try:

        investigations_count = (
            db.query(Investigation).count()
        )

        evidence_count = (
            db.query(Evidence).count()
        )

        completed_count = (
            db.query(Evidence)
            .filter(
                Evidence.processing_status
                == "completed"
            )
            .count()
        )

        pending_count = (
            db.query(Evidence)
            .filter(
                Evidence.processing_status
                == "processing"
            )
            .count()
        )

        failed_count = (
            db.query(Evidence)
            .filter(
                Evidence.processing_status
                == "failed"
            )
            .count()
        )

        return {
            "investigations": investigations_count,
            "evidence": evidence_count,
            "processed": completed_count,
            "pending": pending_count,
            "failed": failed_count,
        }

    finally:

        db.close()


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():

    return {
        "name": "AI Digital Investigator",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


# ---------------------------------------------------------
# GLOBAL ERROR HANDLER
# ---------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(
    request,
    exc,
):

    print(
        f"Unhandled server error: {exc}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "error": str(exc),
        },
    )
