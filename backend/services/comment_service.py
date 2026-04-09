import logging
from db import get_conn, release_conn

logger = logging.getLogger(__name__)


def get_ticket_comments(ticket_id: int):
    """
    Returns all comments for a ticket, ordered newest first.
    """
    conn = get_conn()
    cur  = conn.cursor()

    try:
        cur.execute(
            """
            SELECT
                tc.comment_id,
                tc.ticket_id,
                tc.author_id,
                tc.author_role,
                tc.comment_type,
                tc.body,
                tc.created_at,
                CASE
                    WHEN tc.author_role = 'lead'   THEN tl.name
                    ELSE tm.name
                END AS author_name
            FROM ticket_comments tc
            LEFT JOIN team_leads   tl ON tc.author_role = 'lead'   AND tl.lead_id   = tc.author_id
            LEFT JOIN team_members tm ON tc.author_role = 'member' AND tm.member_id  = tc.author_id
            WHERE tc.ticket_id = %s
            ORDER BY tc.created_at DESC
            """,
            (ticket_id,)
        )

        rows = cur.fetchall()

        return [
            {
                "comment_id":   r[0],
                "ticket_id":    r[1],
                "author_id":    r[2],
                "author_role":  r[3],
                "comment_type": r[4],
                "body":         r[5],
                "created_at":   r[6].isoformat() if r[6] else None,
                "author_name":  r[7] or "Unknown",
            }
            for r in rows
        ]

    finally:
        cur.close()
        release_conn(conn)


def add_ticket_comment(ticket_id: int, supabase_uuid: str, body: str):
    """
    Resolves the caller's role, inserts a general comment, and returns
    the new comment_id and created_at.
    Raises ValueError if the user is not found.
    """
    conn = get_conn()
    cur  = conn.cursor()

    try:
        # Resolve caller → lead or member
        cur.execute(
            "SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s",
            (supabase_uuid,)
        )
        row = cur.fetchone()
        if row:
            author_id   = row[0]
            author_role = "lead"
        else:
            cur.execute(
                "SELECT member_id FROM team_members WHERE supabase_user_id::text = %s",
                (supabase_uuid,)
            )
            row = cur.fetchone()
            if not row:
                raise ValueError("User not found")
            author_id   = row[0]
            author_role = "member"

        cur.execute(
            """
            INSERT INTO ticket_comments
                (ticket_id, author_id, author_role, comment_type, body)
            VALUES (%s, %s, %s, 'general', %s)
            RETURNING comment_id, created_at
            """,
            (ticket_id, author_id, author_role, body)
        )
        result = cur.fetchone()
        conn.commit()

        logger.info(
            "Comment added | ticket_id=%s | author_id=%s | role=%s",
            ticket_id, author_id, author_role
        )

        return {"comment_id": result[0], "created_at": result[1].isoformat()}

    except Exception as e:
        conn.rollback()
        raise

    finally:
        cur.close()
        release_conn(conn)