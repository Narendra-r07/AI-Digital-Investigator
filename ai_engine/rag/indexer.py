from ai_engine.embeddings.embedder import generate_embedding
from ai_engine.rag.chunker import chunk_text
from ai_engine.vector_store.chroma_store import add_chunk


def index_evidence(
    evidence_id: int,
    investigation_id: int,
    filename: str,
    extracted_text: str,
):
    """
    Chunk evidence text, generate embeddings,
    and store the chunks in ChromaDB.
    """

    chunks = chunk_text(
        extracted_text
    )

    indexed_chunks = 0

    for index, chunk in enumerate(chunks):

        embedding = generate_embedding(
            chunk
        )

        chunk_id = (
            f"evidence_{evidence_id}"
            f"_chunk_{index}"
        )

        add_chunk(
            chunk_id=chunk_id,
            text=chunk,
            embedding=embedding,
            investigation_id=investigation_id,
            evidence_id=evidence_id,
            filename=filename,
        )

        indexed_chunks += 1

    return indexed_chunks