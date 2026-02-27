from sentence_transformers import SentenceTransformer

_model = None  # global cache


def get_model():
    global _model
    if _model is None:
        print("🔹 Loading embedding model...")
        _model = SentenceTransformer("thenlper/gte-small")
    return _model


def get_embedding(text: str):
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()