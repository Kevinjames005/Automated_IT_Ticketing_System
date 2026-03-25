import logging
from db import get_conn, release_conn
from services.notification_service import notify_ticket_resolved

logger = logging.getLogger(__name__)


def start_ticket(ticket_id: int, member_id: int):

    logger.info("Starting ticket | ticket_id=%s | member_id=%s", ticket_id, member_id)

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT t.status
            FROM tickets t
            JOIN ticket_assignments ta 
                ON t.ticket_id = ta.ticket_id
            WHERE t.ticket_id = %s 
              AND ta.member_id = %s;
            """,
            (ticket_id, member_id)
        )

        result = cur.fetchone()

        if not result:
            raise Exception("Ticket is not assigned to this member")

        current_status = result[0]

        if current_status != "Assigned":
            raise Exception("Only assigned tickets can be started")

        cur.execute(
            """
            UPDATE tickets
            SET status = 'In Progress',
                started_at = COALESCE(started_at, NOW())
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, "Assigned", "In Progress", member_id)
        )

        conn.commit()
        logger.info("Ticket started | ticket_id=%s | member_id=%s", ticket_id, member_id)

    except Exception as e:
        conn.rollback()
        logger.error("Failed to start ticket | ticket_id=%s | member_id=%s | error=%s", ticket_id, member_id, e)
        raise

    finally:
        cur.close()
        release_conn(conn)


def resolve_ticket(ticket_id: int, member_id: int, resolution_text: str):

    logger.info("Resolving ticket | ticket_id=%s | member_id=%s", ticket_id, member_id)

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Lock the ticket row
        cur.execute(
            """
            SELECT status, priority
            FROM tickets
            WHERE ticket_id = %s
            FOR UPDATE;
            """,
            (ticket_id,)
        )

        ticket = cur.fetchone()

        if not ticket:
            raise Exception("Ticket not found")

        current_status, priority = ticket

        # Validate assignment
        cur.execute(
            """
            SELECT 1
            FROM ticket_assignments
            WHERE ticket_id = %s
              AND member_id = %s;
            """,
            (ticket_id, member_id)
        )

        if not cur.fetchone():
            raise Exception("Ticket is not assigned to this member")

        if current_status != "In Progress":
            raise Exception("Only In Progress tickets can be resolved")

        # 1️⃣ Insert resolution document
        cur.execute(
            """
            INSERT INTO resolution_documents (ticket_id, content)
            VALUES (%s, %s)
            RETURNING resolution_id;
            """,
            (ticket_id, resolution_text)
        )

        resolution_id = cur.fetchone()[0]

        # 2️⃣ Insert into knowledge_base_articles
        cur.execute(
            """
            INSERT INTO knowledge_base_articles
            (title, content, source_resolution_id, embedding, embedding_status)
            VALUES (%s, %s, %s, NULL, 'pending');
            """,
            (
                f"Resolution for Ticket #{ticket_id} [{priority}]",
                resolution_text,
                resolution_id,
            )
        )

        # 3️⃣ Update ticket status → Resolved
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Resolved',
                resolved_at = COALESCE(resolved_at, NOW())
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # 4️⃣ Log status history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, current_status, "Resolved", member_id)
        )

        conn.commit()
        logger.info(
            "Ticket resolved | ticket_id=%s | member_id=%s | resolution_id=%s",
            ticket_id, member_id, resolution_id
        )

        # ── Fetch reporter info and notify ───────────────────────────────────
        cur.execute(
            """
            SELECT u.email, u.name, er.subject
            FROM tickets t
            JOIN email_requests er ON er.email_id = t.email_id
            JOIN users u           ON u.user_id   = er.user_id
            WHERE t.ticket_id = %s;
            """,
            (ticket_id,)
        )
        row = cur.fetchone()

        if row:
            reporter_email, reporter_name, subject = row
            notify_ticket_resolved(
                to_email=reporter_email,
                reporter_name=reporter_name,
                ticket_id=ticket_id,
                subject=subject,
                resolution_text=resolution_text,
            )
        else:
            logger.warning("Could not fetch reporter info for resolved notification | ticket_id=%s", ticket_id)

        return resolution_id

    except Exception as e:
        conn.rollback()
        logger.error("Failed to resolve ticket | ticket_id=%s | member_id=%s | error=%s", ticket_id, member_id, e)
        raise

    finally:
        cur.close()
        release_conn(conn)