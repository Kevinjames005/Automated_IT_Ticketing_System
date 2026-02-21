from db import get_conn, release_conn

def get_or_create_user(sender_email: str, sender_name: str = None):
    """
    Checks if user exists by email.
    If exists → return user_id.
    If not → create user and return new user_id.
    """

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Check if user already exists
        cur.execute(
            "SELECT user_id FROM users WHERE email = %s;",
            (sender_email,)
        )

        existing_user = cur.fetchone()

        if existing_user:
            return existing_user[0]

        # If not exists, insert new user
        cur.execute(
            """
            INSERT INTO users (name, email)
            VALUES (%s, %s)
            RETURNING user_id;
            """,
            (sender_name, sender_email)
        )

        user_id = cur.fetchone()[0]
        conn.commit()

        return user_id

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)