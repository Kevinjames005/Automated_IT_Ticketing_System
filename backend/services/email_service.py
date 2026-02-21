from db import get_conn, release_conn

def create_email_request(user_id: int, subject: str, body: str):
    """
    Inserts a new email into email_requests table.
    Returns generated email_id.
    """

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO email_requests 
            (user_id, subject, body, processing_status)
            VALUES (%s, %s, %s, 'received')
            RETURNING email_id;
            """,
            (user_id, subject, body)
        )

        email_id = cur.fetchone()[0]
        conn.commit()

        return email_id

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)