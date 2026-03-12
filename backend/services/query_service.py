from db import get_conn, release_conn
from services.sla_service import calculate_sla_status
from datetime import datetime, timedelta


def get_tickets(status=None, priority=None, search=None, page=1, limit=20, member_id=None, date_range=None):
    conn = get_conn()
    cur = conn.cursor()

    try:
        offset = (page - 1) * limit

        filters = []
        params = []

        if member_id is not None:
            filters.append("ta.member_id = %s")
            params.append(member_id)

        if status:
            filters.append("t.status = %s")
            params.append(status)

        if priority:
            filters.append("t.priority = %s")
            params.append(priority)

        if search:
            filters.append("(er.subject ILIKE %s OR CAST(t.ticket_id AS TEXT) ILIKE %s)")
            params.append(f"%{search}%")
            params.append(f"%{search}%")

        if date_range:
            now = datetime.utcnow()
            if date_range == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif date_range == "7days":
                start_date = now - timedelta(days=7)
            elif date_range == "30days":
                start_date = now - timedelta(days=30)
            else:
                start_date = None
            if start_date:
                filters.append("t.created_at >= %s")
                params.append(start_date)

        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        assignment_join = ""
        if member_id is not None:
            assignment_join = "JOIN ticket_assignments ta ON t.ticket_id = ta.ticket_id"

        count_query = f"""
            SELECT COUNT(*)
            FROM tickets t
            {assignment_join}
            JOIN email_requests er ON t.email_id = er.email_id
            {where_clause};
        """
        cur.execute(count_query, params)
        total = cur.fetchone()[0]

        query = f"""
            SELECT
                t.ticket_id,
                er.subject,
                er.body,
                t.status,
                t.priority,
                t.created_at,
                t.assigned_at,
                t.started_at,
                t.resolved_at,
                t.closed_at,
                t.reopen_count,
                c.name AS category,
                (SELECT content FROM resolution_documents
                 WHERE ticket_id = t.ticket_id
                 ORDER BY created_at DESC LIMIT 1) AS resolution_text
            FROM tickets t
            {assignment_join}
            JOIN email_requests er ON t.email_id = er.email_id
            LEFT JOIN categories c ON t.category_id = c.category_id
            {where_clause}
            ORDER BY t.created_at DESC
            LIMIT %s OFFSET %s;
        """

        cur.execute(query, params + [limit, offset])
        rows = cur.fetchall()

        tickets = []

        for row in rows:
            (
                ticket_id,
                subject,
                body,
                status,
                priority,
                created_at,
                assigned_at,
                started_at,
                resolved_at,
                closed_at,
                reopen_count,
                category,
                resolution_text
            ) = row

            sla_status = calculate_sla_status(priority, created_at, assigned_at, resolved_at, closed_at)

            tickets.append({
                "ticket_id":    ticket_id,
                "subject":      subject,
                "body":         body,
                "status":       status,
                "priority":     priority,
                "created_at":   created_at,
                "assigned_at":  assigned_at,
                "started_at":   started_at,
                "resolved_at":  resolved_at,
                "closed_at":    closed_at,
                "reopen_count": reopen_count,
                "category":     category,
                "resolution_text": resolution_text,
                **sla_status
            })

        return {
            "page":    page,
            "limit":   limit,
            "total":   total,
            "tickets": tickets
        }

    finally:
        cur.close()
        release_conn(conn)