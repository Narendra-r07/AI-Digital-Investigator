from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CHROMA_PATH = PROJECT_ROOT / "storage" / "chroma"
CHROMA_PATH.mkdir(parents=True, exist_ok=True)

_collection = None
_in_memory_store = []

def _get_collection():
    global _collection
    if _collection is None:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(CHROMA_PATH))
            _collection = client.get_or_create_collection(name="investigation_evidence")
        except Exception as exc:
            print(f"Warning: ChromaDB load deferred ({exc})")
            return None
    return _collection


def add_chunk(
    chunk_id: str,
    text: str,
    embedding: list[float],
    investigation_id: int,
    evidence_id: int,
    filename: str,
):
    """
    Store one evidence chunk in ChromaDB or fallback store.
    """
    col = _get_collection()
    if col is not None:
        try:
            col.add(
                ids=[chunk_id],
                documents=[text],
                embeddings=[embedding] if embedding else None,
                metadatas=[
                    {
                        "investigation_id": investigation_id,
                        "evidence_id": evidence_id,
                        "filename": filename,
                    }
                ],
            )
            return
        except Exception as err:
            print(f"ChromaDB add failed: {err}")

    # In-memory fallback
    _in_memory_store.append({
        "id": chunk_id,
        "text": text,
        "investigation_id": investigation_id,
        "evidence_id": evidence_id,
        "filename": filename
    })


def search_chunks(
    embedding: list[float],
    investigation_id: int,
    top_k: int = 5,
):
    """
    Search evidence chunks belonging to a specific investigation.
    """
    col = _get_collection()
    if col is not None:
        try:
            results = col.query(
                query_embeddings=[embedding] if embedding else None,
                n_results=top_k,
                where={"investigation_id": investigation_id},
            )
            return results
        except Exception as err:
            print(f"ChromaDB query failed: {err}")

    # In-memory fallback filtering
    filtered = [item for item in _in_memory_store if item["investigation_id"] == investigation_id][:top_k]
    docs = [item["text"] for item in filtered]
    metas = [{"filename": item["filename"], "investigation_id": item["investigation_id"]} for item in filtered]
    dists = [0.1 * i for i in range(len(filtered))]

    return {
        "documents": [docs],
        "metadatas": [metas],
        "distances": [dists]
    }