from ai_engine.embeddings.embedder import generate_embedding
from ai_engine.vector_store.chroma_store import search_chunks


def search_evidence(
    query: str,
    investigation_id: int,
    top_k: int = 5,
):
    """
    Search investigation evidence using
    semantic similarity.
    """

    if not query.strip():
        return []

    query_embedding = generate_embedding(query)

    results = search_chunks(
        embedding=query_embedding,
        investigation_id=investigation_id,
        top_k=top_k,
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    output = []

    for index, document in enumerate(documents):

        metadata = (
            metadatas[index]
            if index < len(metadatas)
            else {}
        )

        distance = (
            distances[index]
            if index < len(distances)
            else None
        )

        output.append({
            "text": document,
            "metadata": metadata,
            "distance": distance,
        })

    return output