MODEL_NAME = "all-MiniLM-L6-v2"
model = None

def _get_model():
    global model
    if model is None:
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(MODEL_NAME)
        except Exception as exc:
            print(f"Warning: SentenceTransformer load deferred ({exc})")
            return None
    return model


def generate_embedding(text: str) -> list[float]:
    """
    Convert text into a numerical embedding with fallback.
    """
    if not text.strip():
        return []

    st_model = _get_model()
    if st_model is not None:
        try:
            embedding = st_model.encode(
                text,
                normalize_embeddings=True
            )
            return embedding.tolist()
        except Exception as err:
            print(f"Embedding encoding failed: {err}")

    # Fallback pseudo-embedding vector for term match
    import hashlib
    h = hashlib.sha256(text.encode()).digest()
    return [float(b) / 255.0 for b in h[:384]]