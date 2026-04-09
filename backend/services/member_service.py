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

        # 1️⃣ Insert resolution document (always saved, KB decision is made by lead later)
        cur.execute(
            """
            INSERT INTO resolution_documents (ticket_id, content)
            VALUES (%s, %s)
            RETURNING resolution_id;
            """,
            (ticket_id, resolution_text)
        )

        resolution_id = cur.fetchone()[0]

        # 2️⃣ Update ticket status → Resolved
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Resolved',
                resolved_at = COALESCE(resolved_at, NOW())
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # 3️⃣ Log status history
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


def approve_resolution(ticket_id: int, lead_id: int, add_to_kb: bool = False):
    """
    Called by the team lead when approving a resolved ticket.
    If add_to_kb is True, the resolution document is published to the knowledge base.
    """

    logger.info("Approving resolution | ticket_id=%s | lead_id=%s | add_to_kb=%s", ticket_id, lead_id, add_to_kb)

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Fetch the latest resolution document for this ticket
        cur.execute(
            """
            SELECT rd.resolution_id, rd.content, t.priority, t.status
            FROM resolution_documents rd
            JOIN tickets t ON t.ticket_id = rd.ticket_id
            WHERE rd.ticket_id = %s
            ORDER BY rd.created_at DESC
            LIMIT 1;
            """,
            (ticket_id,)
        )

        row = cur.fetchone()

        if not row:
            raise Exception("No resolution document found for this ticket")

        resolution_id, content, priority, status = row

        if status != "Resolved":
            raise Exception("Only resolved tickets can be approved")

        # 1️⃣ Mark resolution as approved
        cur.execute(
            """
            UPDATE resolution_documents
            SET approved_by = %s
            WHERE resolution_id = %s;
            """,
            (lead_id, resolution_id)
        )

        # 2️⃣ Update ticket status → Closed
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Closed',
                closed_at = COALESCE(closed_at, NOW())
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # 3️⃣ Log status history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, "Resolved", "Closed", lead_id)
        )

        # 4️⃣ Only add to KB if lead explicitly checked "Add to KB"
        if add_to_kb:
            cur.execute(
                """
                INSERT INTO knowledge_base_articles
                (title, content, source_resolution_id, embedding, embedding_status)
                VALUES (%s, %s, %s, NULL, 'pending');
                """,
                (
                    f"Resolution for Ticket #{ticket_id} [{priority}]",
                    content,
                    resolution_id,
                )
            )
            logger.info(
                "Resolution added to knowledge base | ticket_id=%s | resolution_id=%s",
                ticket_id, resolution_id
            )
        else:
            logger.info(
                "Resolution NOT added to knowledge base (add_to_kb=False) | ticket_id=%s",
                ticket_id
            )

        conn.commit()
        logger.info("Resolution approved | ticket_id=%s | lead_id=%s", ticket_id, lead_id)

        return {"resolution_id": resolution_id, "added_to_kb": add_to_kb}

    except Exception as e:
        conn.rollback()
        logger.error(
            "Failed to approve resolution | ticket_id=%s | lead_id=%s | error=%s",
            ticket_id, lead_id, e
        )
        raise

    finally:
        cur.close()
        release_conn(conn)

def get_all_members():
    """
    Returns all team members ordered by name.
    """
    from db import get_conn, release_conn
    import logging
    logger = logging.getLogger(__name__)

    conn = get_conn()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT member_id, name, lead_id, email
            FROM team_members
            ORDER BY name ASC;
        """)
        rows = cur.fetchall()
        return [
            {"member_id": row[0], "name": row[1], "lead_id": row[2], "email": row[3]}
            for row in rows
        ]
    finally:
        cur.close()
        release_conn(conn)