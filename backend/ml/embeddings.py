from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("thenlper/gte-small")

def get_embedding(text: str):
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
