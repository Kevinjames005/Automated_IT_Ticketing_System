from db import get_conn, release_conn

def store_ai_analysis(email_id: int,
                      is_user_solvable: bool,
                      predicted_category: str,
                      predicted_priority: str,
                      confidence_score: float):
    """
    Stores AI analysis result for an email.
    """

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO ai_analysis
            (email_id, is_user_solvable, predicted_category, predicted_priority, confidence_score)
            VALUES (%s, %s, %s, %s, %s);
            """,
            (
                email_id,
                is_user_solvable,
                predicted_category,
                predicted_priority,
                confidence_score
            )
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)