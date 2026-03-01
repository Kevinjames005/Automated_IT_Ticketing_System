# backend/services/breakdown_analytics_service.py

from db import get_conn, release_conn


def get_priority_breakdown(start_date=None, end_date=None):
    conn = get_conn()
    cur = conn.cursor()

    try:
        filters = []
        params = []

        if start_date:
            filters.append("created_at >= %s")
            params.append(start_date)

        if end_date:
            filters.append("created_at <= %s")
            params.append(end_date)

        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        query = f"""
        SELECT
            priority,
            COUNT(*) AS total_tickets,

            COUNT(*) FILTER (WHERE status != 'Closed') AS open_tickets,

            COUNT(*) FILTER (WHERE status = 'Closed') AS closed_tickets,

            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (assigned_at - created_at))/60
                ) FILTER (WHERE assigned_at IS NOT NULL),
                2
            ) AS avg_response_minutes,

            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (closed_at - created_at))/60
                ) FILTER (WHERE closed_at IS NOT NULL),
                2
            ) AS avg_resolution_minutes

        FROM tickets
        {where_clause}
        GROUP BY priority
        ORDER BY priority;
        """

        cur.execute(query, params)
        rows = cur.fetchall()

        result = []

        for row in rows:
            result.append({
                "priority": row[0],
                "total_tickets": row[1],
                "open_tickets": row[2],
                "closed_tickets": row[3],
                "average_response_time_minutes": float(row[4] or 0),
                "average_resolution_time_minutes": float(row[5] or 0)
            })

        return result

    finally:
        cur.close()
        release_conn(conn)


def get_category_breakdown(start_date=None, end_date=None):
    conn = get_conn()
    cur = conn.cursor()

    try:
        filters = []
        params = []

        if start_date:
            filters.append("t.created_at >= %s")
            params.append(start_date)

        if end_date:
            filters.append("t.created_at <= %s")
            params.append(end_date)

        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        query = f"""
        SELECT
            c.name AS category,
            COUNT(*) AS total_tickets,

            COUNT(*) FILTER (WHERE t.status != 'Closed') AS open_tickets,

            COUNT(*) FILTER (WHERE t.status = 'Closed') AS closed_tickets,

            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (t.assigned_at - t.created_at))/60
                ) FILTER (WHERE t.assigned_at IS NOT NULL),
                2
            ) AS avg_response_minutes,

            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/60
                ) FILTER (WHERE t.closed_at IS NOT NULL),
                2
            ) AS avg_resolution_minutes

        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.category_id
        {where_clause}
        GROUP BY c.name
        ORDER BY total_tickets DESC;
        """

        cur.execute(query, params)
        rows = cur.fetchall()

        result = []

        for row in rows:
            result.append({
                "category": row[0],
                "total_tickets": row[1],
                "open_tickets": row[2],
                "closed_tickets": row[3],
                "average_response_time_minutes": float(row[4] or 0),
                "average_resolution_time_minutes": float(row[5] or 0)
            })

        return result

    finally:
        cur.close()
        release_conn(conn)