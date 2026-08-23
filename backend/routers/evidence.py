from pathlib import Path
import hashlib
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Investigation, Evidence


router = APIRouter(
    prefix="/investigations",
    tags=["Evidence"],
)


# ---------------------------------------------------------
# STORAGE
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

STORAGE_DIR = (
    BASE_DIR
    / "storage"
    / "evidence"
)

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def calculate_hash(file_path: Path) -> str:

    sha256 = hashlib.sha256()

    with open(file_path, "rb") as file:

        while True:

            chunk = file.read(1024 * 1024)

            if not chunk:
                break

            sha256.update(chunk)

    return sha256.hexdigest()


def extract_text(file_path: Path) -> str:

    extension = file_path.suffix.lower()

    # TXT / CSV / LOG / JSON / XML / MD
    if extension in [
        ".txt",
        ".csv",
        ".log",
        ".json",
        ".xml",
        ".md",
        ".html",
        ".htm",
    ]:

        try:

            return file_path.read_text(
                encoding="utf-8",
                errors="ignore"
            )

        except Exception:

            return ""


    # PDF
    if extension == ".pdf":

        try:

            import pypdf

            text = []

            reader = pypdf.PdfReader(
                str(file_path)
            )

            for page in reader.pages:

                page_text = page.extract_text()

                if page_text:
                    text.append(page_text)

            return "\n".join(text)

        except Exception as error:

            print(
                "PDF extraction failed:",
                error
            )

            return ""


    # DOCX
    if extension == ".docx":

        try:

            from docx import Document

            document = Document(
                str(file_path)
            )

            return "\n".join(
                paragraph.text
                for paragraph in document.paragraphs
            )

        except Exception as error:

            print(
                "DOCX extraction failed:",
                error
            )

            return ""


    return ""


# ---------------------------------------------------------
# LIST EVIDENCE
# ---------------------------------------------------------

@router.get("/{investigation_id}/evidence")
def get_evidence(
    investigation_id: int,
    db: Session = Depends(get_db),
):

    investigation = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )


    evidence_items = (
        db.query(Evidence)
        .filter(
            Evidence.investigation_id
            == investigation_id
        )
        .order_by(
            Evidence.uploaded_at.desc()
        )
        .all()
    )


    result = []

    for item in evidence_items:

        result.append({

            "id": item.id,

            "investigation_id":
                item.investigation_id,

            "filename":
                item.filename,

            "file_type":
                item.file_type,

            "file_size":
                item.file_size or 0,

            "file_hash":
                item.file_hash,

            "storage_path":
                item.storage_path,

            "file_path":
                item.file_path,

            "processing_status":
                item.processing_status
                or "pending",

            "extracted_text":
                item.extracted_text,

            "ai_analysis_result":
                item.ai_analysis_result,

            "uploaded_at":
                item.uploaded_at.isoformat()
                if item.uploaded_at
                else None,

        })


    return result


# ---------------------------------------------------------
# UPLOAD EVIDENCE
# ---------------------------------------------------------

@router.post("/{investigation_id}/evidence")
async def upload_evidence(
    investigation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    # -----------------------------------------------------
    # CHECK INVESTIGATION
    # -----------------------------------------------------

    investigation = (
        db.query(Investigation)
        .filter(
            Investigation.id == investigation_id
        )
        .first()
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )


    # -----------------------------------------------------
    # CHECK FILE
    # -----------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )


    original_filename = Path(
        file.filename
    ).name

    extension = Path(
        original_filename
    ).suffix.lower()


    # -----------------------------------------------------
    # TEMP FILE
    # -----------------------------------------------------

    temp_name = (
        f"temp_"
        f"{datetime.now().timestamp()}"
        f"_{original_filename}"
    )

    temp_path = STORAGE_DIR / temp_name


    try:

        with open(
            temp_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        # -------------------------------------------------
        # FILE SIZE
        # -------------------------------------------------

        file_size = temp_path.stat().st_size


        # -------------------------------------------------
        # HASH
        # -------------------------------------------------

        file_hash = calculate_hash(
            temp_path
        )


        # -------------------------------------------------
        # DUPLICATE CHECK
        # -------------------------------------------------

        existing = (
            db.query(Evidence)
            .filter(
                Evidence.investigation_id
                == investigation_id,

                Evidence.file_hash
                == file_hash
            )
            .first()
        )


        if existing:

            # Remove temporary file
            try:
                temp_path.unlink()
            except Exception:
                pass


            # Instead of returning 409,
            # return existing evidence.
            #
            # This prevents the frontend
            # from showing "Upload failed"
            # when the same file is selected again.

            return {

                "success": True,

                "duplicate": True,

                "message":
                    "This evidence file is already uploaded.",

                "evidence": {

                    "id":
                        existing.id,

                    "investigation_id":
                        existing.investigation_id,

                    "filename":
                        existing.filename,

                    "file_type":
                        existing.file_type,

                    "file_size":
                        existing.file_size or 0,

                    "file_hash":
                        existing.file_hash,

                    "processing_status":
                        existing.processing_status
                        or "completed",

                    "extracted_text":
                        existing.extracted_text,

                    "uploaded_at":
                        existing.uploaded_at.isoformat()
                        if existing.uploaded_at
                        else None,
                }
            }


        # -------------------------------------------------
        # FINAL STORAGE PATH
        # -------------------------------------------------

        safe_filename = (
            f"{file_hash}_"
            f"{original_filename}"
        )

        final_path = (
            STORAGE_DIR
            / safe_filename
        )


        # Move temp file
        shutil.move(
            str(temp_path),
            str(final_path)
        )


        # -------------------------------------------------
        # TEXT EXTRACTION
        # -------------------------------------------------

        extracted_text = ""

        try:

            extracted_text = extract_text(
                final_path
            )

        except Exception as error:

            print(
                "Text extraction failed:",
                error
            )

            extracted_text = ""


        # -------------------------------------------------
        # CREATE DATABASE RECORD
        # -------------------------------------------------

        evidence_item = Evidence(

            investigation_id=
                investigation_id,

            filename=
                original_filename,

            file_type=
                extension
                if extension
                else file.content_type,

            file_size=
                file_size,

            file_hash=
                file_hash,

            storage_path=
                str(final_path),

            file_path=
                str(final_path),

            processing_status=
                "completed",

            extracted_text=
                extracted_text,

            ai_analysis_result=
                None,

            uploaded_at=
                datetime.utcnow(),

        )


        db.add(
            evidence_item
        )

        db.commit()

        db.refresh(
            evidence_item
        )


        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        return {

            "success": True,

            "duplicate": False,

            "message":
                "Evidence uploaded successfully.",

            "evidence": {

                "id":
                    evidence_item.id,

                "investigation_id":
                    evidence_item.investigation_id,

                "filename":
                    evidence_item.filename,

                "file_type":
                    evidence_item.file_type,

                "file_size":
                    evidence_item.file_size,

                "file_hash":
                    evidence_item.file_hash,

                "storage_path":
                    evidence_item.storage_path,

                "processing_status":
                    evidence_item.processing_status,

                "extracted_text":
                    evidence_item.extracted_text,

                "uploaded_at":
                    evidence_item.uploaded_at.isoformat()
                    if evidence_item.uploaded_at
                    else None,

            }
        }


    except HTTPException:

        raise


    except Exception as error:

        db.rollback()

        print(
            "UPLOAD ERROR:",
            repr(error)
        )

        # Remove temporary file
        try:

            if temp_path.exists():
                temp_path.unlink()

        except Exception:
            pass


        raise HTTPException(
            status_code=500,
            detail=f"Evidence upload failed: {error}"
        )


# ---------------------------------------------------------
# DOWNLOAD
# ---------------------------------------------------------

@router.get("/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )


    path = Path(
        item.storage_path
        or item.file_path
        or ""
    )


    if not path.exists():

        raise HTTPException(
            status_code=404,
            detail="File not found on server"
        )


    return FileResponse(
        path=str(path),
        filename=item.filename,
        media_type="application/octet-stream"
    )


# ---------------------------------------------------------
# DELETE EVIDENCE
# ---------------------------------------------------------

@router.delete("/evidence/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):

    item = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )


    try:

        path = Path(
            item.storage_path
            or item.file_path
            or ""
        )

        if path.exists():
            path.unlink()


        db.delete(item)

        db.commit()


        return {

            "success": True,

            "message":
                "Evidence deleted successfully",

            "id":
                evidence_id,

        }


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )