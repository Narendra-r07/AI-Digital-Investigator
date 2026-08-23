from pathlib import Path

import chromadb


# Store ChromaDB data inside the project
PROJECT_ROOT = Path(__file__).resolve().parents[2]

CHROMA_PATH = (
    PROJECT_ROOT
    / "storage"
    / "chroma"
)

CHROMA_PATH.mkdir(
    parents=True,
    exist_ok=True
)


# Persistent ChromaDB client
client = chromadb.PersistentClient(
    path=str(CHROMA_PATH)
)


# Collection for investigation evidence
collection = client.get_or_create_collection(
    name="investigation_evidence"
)


def add_chunk(
    chunk_id: str,
    text: str,
    embedding: list[float],
    investigation_id: int,
    evidence_id: int,
    filename: str,
):
    """
    Store one evidence chunk in ChromaDB.
    """

    collection.add(
        ids=[chunk_id],

        documents=[text],

        embeddings=[embedding],

        metadatas=[
            {
                "investigation_id": investigation_id,
                "evidence_id": evidence_id,
                "filename": filename,
            }
        ],
    )


def search_chunks(
    embedding: list[float],
    investigation_id: int,
    top_k: int = 5,
):
    """
    Search evidence chunks belonging to
    a specific investigation.
    """

    results = collection.query(
        query_embeddings=[embedding],

        n_results=top_k,

        where={
            "investigation_id": investigation_id
        },
    )

    return results