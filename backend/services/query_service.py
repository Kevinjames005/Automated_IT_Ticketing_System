from db import get_conn, release_conn
from services.sla_service import calculate_sla_status


def get_tickets(status=None, priority=None, page=1, limit=20):
    conn = get_conn()
    cur = conn.cursor()

    try:
        offset = (page - 1) * limit

        filters = []
        params = []

        if status:
            filters.append("t.status = %s")
            params.append(status)

        if priority:
            filters.append("t.priority = %s")
            params.append(priority)

        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        # Get total count
        count_query = f"""
            SELECT COUNT(*)
            FROM tickets t
            {where_clause};
        """
        cur.execute(count_query, params)
        total = cur.fetchone()[0]

        # Get paginated results
        query = f"""
            SELECT
                t.ticket_id,
                er.subject,
                t.status,
                t.priority,
                t.created_at,
                t.assigned_at,
                t.started_at,
                t.resolved_at,
                t.closed_at,
                t.reopen_count
            FROM tickets t
            JOIN email_requests er ON t.email_id = er.email_id
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
                status,
                priority,
                created_at,
                assigned_at,
                started_at,
                resolved_at,
                closed_at,
                reopen_count
            ) = row

            sla_status = calculate_sla_status(priority, created_at, assigned_at, closed_at)

            tickets.append({
                "ticket_id": ticket_id,
                "subject": subject,
                "status": status,
                "priority": priority,
                "created_at": created_at,
                "assigned_at": assigned_at,
                "started_at": started_at,
                "resolved_at": resolved_at,
                "closed_at": closed_at,
                "reopen_count": reopen_count,
                **sla_status
            })

        return {
            "page": page,
            "limit": limit,
            "total": total,
            "tickets": tickets
        }

    finally:
        cur.close()
        release_conn(conn)