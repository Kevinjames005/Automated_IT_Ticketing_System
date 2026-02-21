from db import get_conn, release_conn

def get_category_id(category_name: str):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        "SELECT category_id FROM categories WHERE LOWER(name) = LOWER(%s);",
        (category_name,)
    )

    result = cur.fetchone()

    cur.close()
    release_conn(conn)

    if result:
        return result[0]
    else:
        raise Exception(f"Category '{category_name}' not found")

def create_ticket(email_id: int, category_id: int, priority: str):
    """
    Creates a ticket linked to an email.
    Returns ticket_id.
    """

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO tickets 
            (email_id, category_id, priority)
            VALUES (%s, %s, %s)
            RETURNING ticket_id;
            """,
            (email_id, category_id, priority)
        )

        ticket_id = cur.fetchone()[0]
        conn.commit()

        return ticket_id

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)

