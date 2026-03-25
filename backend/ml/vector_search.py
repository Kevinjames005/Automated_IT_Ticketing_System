import logging
from ml.embeddings import get_embedding
from db import get_conn, release_conn

logger = logging.getLogger(__name__)


def semantic_search(text: str, threshold: float = 0.80):

    embedding = get_embedding(text)

    if embedding is None:
        logger.error("Embedding generation failed — skipping semantic search")
        return {"resolved": False}

    conn = get_conn()
    cur = conn.cursor()

    try:
        query = """
        SELECT article_id, title, content,
               1 - (embedding <=> %s::vector) AS similarity
        FROM knowledge_base_articles
        ORDER BY similarity DESC
        LIMIT 1;
        """

        cur.execute(query, (embedding,))
        result = cur.fetchone()

        if result:
            article_id, title, content, similarity = result
            similarity = float(similarity) if similarity is not None else 0.0

            if similarity >= threshold:
                logger.info(
                    "Semantic match found | article_id=%s | similarity=%.4f | threshold=%.2f",
                    article_id, similarity, threshold
                )
                return {
                    "resolved": True,
                    "article_id": article_id,
                    "content": content,
                    "similarity": similarity
                }
            else:
                logger.info(
                    "No match above threshold | best_similarity=%.4f | threshold=%.2f",
                    similarity, threshold
                )
        else:
            logger.info("No articles found in knowledge base for semantic search")

        return {"resolved": False}

    except Exception as e:
        logger.error("Semantic search query failed | error=%s", e)
        return {"resolved": False}

    finally:
        cur.close()
        release_conn(conn)