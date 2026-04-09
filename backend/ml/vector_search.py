import logging
from ml.embeddings import get_embedding
from db import get_conn, release_conn

logger = logging.getLogger(__name__)


def semantic_search(text: str, threshold: float = 0.80):

    embedding = get_embedding(text)

    if embedding is None:
        logger.error("Embedding generation failed — skipping semantic search")
        return {"resolved": False}

    # Build the pgvector literal directly and interpolate it into the SQL
    # as a plain string (not a psycopg2 parameter). When passed as a %s
    # parameter, psycopg2 wraps the string in quotes which can interfere
    # with pgvector's parser and silently produce a zero vector, causing
    # similarity scores of 0.0. Using an f-string bypasses that quoting.
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"

    conn = get_conn()
    cur = conn.cursor()

    try:
        # <=> is the pgvector cosine distance operator.
        # Supabase's HNSW index (created with vector_cosine_ops) is automatically
        # used by the query planner when you ORDER BY this operator — no extra
        # hints needed. Make sure your index was created like:
        #
        #   CREATE INDEX ON knowledge_base_articles
        #   USING hnsw (embedding vector_cosine_ops);
        #
        query = f"""
        SELECT article_id, title, content,
               1 - (embedding <=> '{embedding_str}'::vector) AS similarity
        FROM knowledge_base_articles
        ORDER BY similarity DESC
        LIMIT 1;
        """

        cur.execute(query)  # no parameter — embedding is already in the query
        result = cur.fetchone()

        if result:
            article_id, title, content, similarity = result
            similarity = float(similarity) if similarity is not None else 0.0

            if similarity >= threshold:
                logger.info(
                    "Semantic match found | article_id=%s | title=%s | similarity=%.4f | threshold=%.2f",
                    article_id, title, similarity, threshold
                )
                return {
                    "resolved":    True,
                    "article_id":  article_id,
                    "title":       title,
                    "content":     content,
                    "similarity":  similarity
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