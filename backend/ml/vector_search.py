from ml.embeddings import get_embedding
from db import get_conn, release_conn

def semantic_search(text: str, threshold: float = 0.80):

    embedding = get_embedding(text)

    if embedding is None:
        print("❌ Embedding generation failed")
        return {"resolved": False}

    conn = get_conn()
    cur = conn.cursor()

    query = """
    SELECT article_id, title, content,
           1 - (embedding <=> %s::vector) AS similarity
    FROM knowledge_base_articles
    ORDER BY similarity DESC
    LIMIT 1;
    """

    cur.execute(query, (embedding,))
    result = cur.fetchone()

    cur.close()
    release_conn(conn)

    if result:
        article_id, title, content, similarity = result

        # 🔐 Safety check
        if similarity is not None and float(similarity) >= threshold:
            return {
                "resolved": True,
                "article_id": article_id,
                "content": content,
                "similarity": float(similarity)
            }

    return {"resolved": False}