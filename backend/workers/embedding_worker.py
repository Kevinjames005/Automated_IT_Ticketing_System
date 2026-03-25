import time
import logging
from db import get_conn, release_conn
from ml.embeddings import get_embedding

# ── Logging configuration for standalone worker process ──────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
# ─────────────────────────────────────────────────────────────────────────────


def process_pending_embeddings():

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Lock one pending row
        cur.execute(
            """
            SELECT article_id, content
            FROM knowledge_base_articles
            WHERE embedding_status = 'pending'
            FOR UPDATE SKIP LOCKED
            LIMIT 1;
            """
        )

        article = cur.fetchone()

        if not article:
            conn.commit()
            return False

        article_id, content = article

        logger.info("Processing embedding | article_id=%s", article_id)

        # Mark as processing
        cur.execute(
            """
            UPDATE knowledge_base_articles
            SET embedding_status = 'processing'
            WHERE article_id = %s;
            """,
            (article_id,)
        )

        conn.commit()
        release_conn(conn)

        # Generate embedding outside transaction
        embedding = get_embedding(content)

        conn = get_conn()
        cur = conn.cursor()

        # Update record with embedding
        cur.execute(
            """
            UPDATE knowledge_base_articles
            SET embedding = %s,
                embedding_status = 'completed'
            WHERE article_id = %s;
            """,
            (embedding, article_id)
        )

        conn.commit()
        logger.info("Embedding completed | article_id=%s", article_id)
        return True

    except Exception as e:
        conn.rollback()
        logger.error("Embedding failed | article_id=%s | error=%s", locals().get("article_id"), e)

        if 'article_id' in locals():
            try:
                cur.execute(
                    """
                    UPDATE knowledge_base_articles
                    SET embedding_status = 'failed'
                    WHERE article_id = %s;
                    """,
                    (article_id,)
                )
                conn.commit()
            except Exception as mark_err:
                logger.error("Failed to mark embedding as failed | article_id=%s | error=%s", article_id, mark_err)

        raise

    finally:
        cur.close()
        release_conn(conn)


if __name__ == "__main__":
    logger.info("Embedding worker started")
    while True:
        try:
            processed = process_pending_embeddings()
            if not processed:
                time.sleep(5)
        except Exception as e:
            logger.error("Embedding worker encountered an error | error=%s | retrying in 10s", e)
            time.sleep(10)