from typing import Dict, List

from fastapi import (
    APIRouter,
    HTTPException,
)

from pydantic import (
    BaseModel,
    Field,
)

from ai_engine.rag.search import search_evidence

from backend.services.ai_service import (
    AIEngineService,
)


router = APIRouter(
    prefix="/ai",
    tags=["AI Investigator"],
)


ai_service = AIEngineService()


# =========================================================
# MODELS
# =========================================================

class ChatMessage(BaseModel):

    role: str

    content: str


class ChatRequest(BaseModel):

    question: str = Field(
        ...,
        min_length=1,
    )

    investigation_id: int = Field(
        ...,
        gt=0,
    )

    conversation: List[
        ChatMessage
    ] = []


class SearchRequest(BaseModel):

    query: str = Field(
        ...,
        min_length=1,
    )

    investigation_id: int = Field(
        ...,
        gt=0,
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
    )


# =========================================================
# HEALTH
# =========================================================

@router.get("/health")
def ai_health():

    return {
        "success": True,
        "ai_available":
            ai_service.is_available(),
        "model":
            ai_service.model,
    }


# =========================================================
# CHATGPT-STYLE INVESTIGATOR
# =========================================================

@router.post("/chat")
def ai_chat(
    request: ChatRequest,
):

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    try:

        # -------------------------------------------------
        # Retrieve relevant evidence
        # -------------------------------------------------

        try:

            search_results = search_evidence(
                question,
                request.investigation_id,
                top_k=8,
            )

        except TypeError:

            # Compatibility with older
            # search_evidence implementation

            search_results = search_evidence(
                question,
                request.investigation_id,
            )

        # -------------------------------------------------
        # Build evidence context
        # -------------------------------------------------

        evidence_parts = []

        for index, result in enumerate(
            search_results or [],
            start=1,
        ):

            filename = (
                result.get("filename")
                or result.get("file_name")
                or result.get("name")
                or f"Evidence {index}"
            )

            text = (
                result.get("extracted_text")
                or result.get("text")
                or result.get("content")
                or ""
            )

            score = result.get(
                "score"
            )

            if not text:
                continue

            evidence_parts.append(
                f"""
EVIDENCE {index}

Filename:
{filename}

Relevance:
{score}

Content:
{text}
"""
            )

        evidence_context = "\n".join(
            evidence_parts
        )

        if not evidence_context:

            evidence_context = (
                "No matching evidence text "
                "was retrieved."
            )

        # -------------------------------------------------
        # Conversation
        # -------------------------------------------------

        conversation = []

        for message in (
            request.conversation[-12:]
        ):

            conversation.append(
                {
                    "role": message.role,
                    "content": message.content,
                }
            )

        # -------------------------------------------------
        # AI
        # -------------------------------------------------

        result = ai_service.chat(
            question=question,
            evidence_context=
                evidence_context,
            conversation=
                conversation,
        )

        return {
            "success": True,
            "answer":
                result["answer"],
            "model":
                result["model"],
            "investigation_id":
                request.investigation_id,
            "question":
                question,
            "evidence_count":
                len(evidence_parts),
            "evidence":
                search_results or [],
        }

    except Exception as error:

        print(
            "AI CHAT ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# =========================================================
# SEMANTIC SEARCH
# =========================================================

@router.post("/search")
def search_ai(
    request: SearchRequest,
):

    query = request.query.strip()

    if not query:

        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    try:

        try:

            results = search_evidence(
                query,
                request.investigation_id,
                top_k=request.top_k,
            )

        except TypeError:

            results = search_evidence(
                query,
                request.investigation_id,
            )

            results = results[
                :request.top_k
            ]

        return {
            "success": True,
            "query": query,
            "investigation_id":
                request.investigation_id,
            "results_count":
                len(results or []),
            "results":
                results or [],
        }

    except Exception as error:

        print(
            "AI SEARCH ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=f"AI search failed: {error}",
        )