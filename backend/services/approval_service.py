import logging
from db import get_conn, release_conn
from ml.embeddings import get_embedding
from services.notification_service import notify_ticket_closed, notify_member_resolution_rejected

logger = logging.getLogger(__name__)


def approve_resolution(ticket_id: int, supabase_uuid: str, add_to_kb: bool):

    logger.info("Approving resolution | ticket_id=%s | add_to_kb=%s", ticket_id, add_to_kb)

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT lead_id
            FROM team_leads
            WHERE supabase_user_id = %s;
            """,
            (supabase_uuid,)
        )

        lead_row = cur.fetchone()

        if not lead_row:
            raise Exception("Unauthorized: not a team lead")

        lead_id = lead_row[0]

        cur.execute(
            """
            SELECT 1
            FROM ticket_assignments ta
            JOIN team_members tm ON ta.member_id = tm.member_id
            WHERE ta.ticket_id = %s
            AND tm.lead_id = %s;
            """,
            (ticket_id, lead_id)
        )

        if not cur.fetchone():
            raise Exception("Unauthorized: cannot modify this ticket")

        cur.execute(
            """
            SELECT status
            FROM tickets
            WHERE ticket_id = %s
            FOR UPDATE;
            """,
            (ticket_id,)
        )

        ticket = cur.fetchone()
        if not ticket:
            raise Exception("Ticket not found")

        current_status = ticket[0]

        if current_status != "Resolved":
            raise Exception("Only resolved tickets can be approved")

        cur.execute(
            """
            SELECT resolution_id, content
            FROM resolution_documents
            WHERE ticket_id = %s
            FOR UPDATE;
            """,
            (ticket_id,)
        )

        resolution = cur.fetchone()
        if not resolution:
            raise Exception("Resolution document not found")

        resolution_id, content = resolution

        cur.execute(
            """
            UPDATE resolution_documents
            SET approved_by = %s
            WHERE resolution_id = %s;
            """,
            (lead_id, resolution_id)
        )

        if add_to_kb:
            cur.execute(
                "SELECT 1 FROM knowledge_base_articles WHERE source_resolution_id = %s;",
                (resolution_id,)
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO knowledge_base_articles
                    (title, content, source_resolution_id, embedding, embedding_status)
                    VALUES (%s, %s, %s, NULL, 'pending');
                    """,
                    (
                        f"Resolution for Ticket {ticket_id}",
                        content,
                        resolution_id,
                    )
                )
                logger.info("Resolution added to knowledge base | ticket_id=%s | resolution_id=%s", ticket_id, resolution_id)

        cur.execute(
            """
            UPDATE tickets
            SET status = 'Closed',
                closed_at = COALESCE(closed_at, NOW())
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
            (ticket_id, current_status, "Closed", lead_id)
        )

        conn.commit()
        logger.info("Ticket closed | ticket_id=%s | lead_id=%s", ticket_id, lead_id)

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
            notify_ticket_closed(
                to_email=reporter_email,
                reporter_name=reporter_name,
                ticket_id=ticket_id,
                subject=subject,
            )
        else:
            logger.warning("Could not fetch reporter info for closed notification | ticket_id=%s", ticket_id)

    except Exception as e:
        conn.rollback()
        logger.error("Failed to approve resolution | ticket_id=%s | error=%s", ticket_id, e)
        raise

    finally:
        cur.close()
        release_conn(conn)


def reject_resolution(ticket_id: int, supabase_uuid: str, rejection_reason: str = None):

    logger.info("Rejecting resolution | ticket_id=%s", ticket_id)

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT lead_id
            FROM team_leads
            WHERE supabase_user_id = %s;
            """,
            (supabase_uuid,)
        )

        lead_row = cur.fetchone()

        if not lead_row:
            raise Exception("Unauthorized: not a team lead")

        lead_id = lead_row[0]

        cur.execute(
            """
            SELECT 1
            FROM ticket_assignments ta
            JOIN team_members tm ON ta.member_id = tm.member_id
            WHERE ta.ticket_id = %s
            AND tm.lead_id = %s;
            """,
            (ticket_id, lead_id)
        )

        if not cur.fetchone():
            raise Exception("Unauthorized: cannot modify this ticket")

        cur.execute(
            """
            SELECT status
            FROM tickets
            WHERE ticket_id = %s
            FOR UPDATE;
            """,
            (ticket_id,)
        )

        ticket = cur.fetchone()
        if not ticket:
            raise Exception("Ticket not found")

        current_status = ticket[0]

        if current_status != "Resolved":
            raise Exception("Only resolved tickets can be rejected")

        cur.execute(
            """
            UPDATE tickets
            SET status = 'Assigned',
                reopen_count = reopen_count + 1,
                reopened_at = NOW()
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
            (ticket_id, current_status, "Assigned", lead_id)
        )

        # ── Persist rejection reason as a comment ────────────────────────────
        if rejection_reason:
            cur.execute(
                """
                INSERT INTO ticket_comments
                    (ticket_id, author_id, author_role, comment_type, body)
                VALUES (%s, %s, 'lead', 'rejection_reason', %s)
                """,
                (ticket_id, lead_id, rejection_reason)
            )
            logger.info("Rejection reason saved as comment | ticket_id=%s", ticket_id)

        conn.commit()
        logger.info("Resolution rejected | ticket_id=%s | lead_id=%s", ticket_id, lead_id)

        cur.execute(
            """
            SELECT tm.email, tm.name, er.subject
            FROM ticket_assignments ta
            JOIN team_members tm    ON tm.member_id = ta.member_id
            JOIN tickets t          ON t.ticket_id  = ta.ticket_id
            JOIN email_requests er  ON er.email_id  = t.email_id
            WHERE ta.ticket_id = %s;
            """,
            (ticket_id,)
        )
        row = cur.fetchone()

        if row:
            member_email, member_name, subject = row
            notify_member_resolution_rejected(
                to_email=member_email,
                member_name=member_name,
                ticket_id=ticket_id,
                subject=subject,
                rejection_reason=rejection_reason,
            )
        else:
            logger.warning("Could not fetch member info for rejection notification | ticket_id=%s", ticket_id)

    except Exception as e:
        conn.rollback()
        logger.error("Failed to reject resolution | ticket_id=%s | error=%s", ticket_id, e)
        raise

    finally:
        cur.close()
        release_conn(conn)