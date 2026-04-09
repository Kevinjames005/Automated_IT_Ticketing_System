from db import get_conn, release_conn
from services.sla_service import calculate_sla_status


def get_ticket_detail(ticket_id: int):
    conn = get_conn()
    cur = conn.cursor()

    try:
        # Fetch main ticket info
        cur.execute("""
            SELECT
                t.ticket_id,
                er.subject,
                c.name as category,
                t.priority,
                t.status,
                t.created_at,
                t.assigned_at,
                t.started_at,
                t.resolved_at,
                t.closed_at,
                t.reopened_at,
                t.reopen_count,
                a.predicted_category,
                a.predicted_priority,
                a.confidence_score,
                a.is_user_solvable
            FROM tickets t
            JOIN email_requests er ON t.email_id = er.email_id
            LEFT JOIN categories c ON t.category_id = c.category_id
            LEFT JOIN ai_analysis a ON t.email_id = a.email_id
            WHERE t.ticket_id = %s;
        """, (ticket_id,))

        ticket = cur.fetchone()

        if not ticket:
            return None

        (
            ticket_id,
            subject,
            category,
            priority,
            status,
            created_at,
            assigned_at,
            started_at,
            resolved_at,
            closed_at,
            reopened_at,
            reopen_count,
            predicted_category,
            predicted_priority,
            confidence_score,
            is_user_solvable
        ) = ticket

        # ── SLA Calculation — correct argument order: (priority, created_at, assigned_at, resolved_at, closed_at)
        sla_data = calculate_sla_status(
            priority,
            created_at,
            assigned_at,
            resolved_at,   # was previously missing — closed_at was passed here instead
            closed_at
        )

        # Fetch resolution
        cur.execute("""
            SELECT resolution_id, content, approved_by
            FROM resolution_documents
            WHERE ticket_id = %s;
        """, (ticket_id,))

        resolution = cur.fetchone()

        resolution_data = None
        if resolution:
            resolution_id, content, approved_by = resolution
            resolution_data = {
                "resolution_id": resolution_id,
                "content": content,
                "approved_by": approved_by
            }

        # Fetch status history
        cur.execute("""
            SELECT old_status, new_status, changed_by, changed_at
            FROM ticket_status_history
            WHERE ticket_id = %s
            ORDER BY changed_at ASC;
        """, (ticket_id,))

        history_rows = cur.fetchall()

        history = [
            {
                "old_status": row[0],
                "new_status": row[1],
                "changed_by": row[2],
                "changed_at": row[3]
            }
            for row in history_rows
        ]

        # Fetch KB reference
        cur.execute("""
            SELECT article_id, title
            FROM knowledge_base_articles
            WHERE source_resolution_id IN (
                SELECT resolution_id
                FROM resolution_documents
                WHERE ticket_id = %s
            );
        """, (ticket_id,))

        kb = cur.fetchone()

        kb_data = None
        if kb:
            kb_data = {
                "article_id": kb[0],
                "title": kb[1]
            }

        return {
            "ticket_id": ticket_id,
            "subject": subject,
            "category": category,
            "priority": priority,
            "status": status,
            "created_at": created_at,
            "assigned_at": assigned_at,
            "started_at": started_at,
            "resolved_at": resolved_at,
            "closed_at": closed_at,
            "reopened_at": reopened_at,
            "reopen_count": reopen_count,
            "sla": sla_data,
            "ai_analysis": {
                "predicted_category": predicted_category,
                "predicted_priority": predicted_priority,
                "confidence_score": confidence_score,
                "is_user_solvable": is_user_solvable
            },
            "resolution": resolution_data,
            "status_history": history,
            "knowledge_base_article": kb_data
        }

    finally:
        cur.close()
        release_conn(conn)