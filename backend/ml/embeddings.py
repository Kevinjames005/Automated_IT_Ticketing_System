import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_model = None  # global cache


def get_model():
    global _model
    if _model is None:
        logger.info("Loading embedding model: thenlper/gte-small")
        _model = SentenceTransformer("thenlper/gte-small")
        logger.info("Embedding model loaded successfully")
    return _model


def get_embedding(text: str):
    try:
        model = get_model()
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        logger.error("Failed to generate embedding | error=%s", e)
        return None