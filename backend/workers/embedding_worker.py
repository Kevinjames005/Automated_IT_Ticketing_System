import time
from db import get_conn, release_conn
from ml.embeddings import get_embedding


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
        return True

    except Exception as e:
        conn.rollback()

        # mark failed
        if 'article_id' in locals():
            cur.execute(
                """
                UPDATE knowledge_base_articles
                SET embedding_status = 'failed'
                WHERE article_id = %s;
                """,
                (article_id,)
            )
            conn.commit()

        raise e

    finally:
        cur.close()
        release_conn(conn)


if __name__ == "__main__":
    while True:
        processed = process_pending_embeddings()
        if not processed:
            time.sleep(5)