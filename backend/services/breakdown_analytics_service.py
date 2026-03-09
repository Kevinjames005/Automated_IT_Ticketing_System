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
    
def get_sla_trend(days=7):
    conn = get_conn()
    cur = conn.cursor()

    try:
        query = """
        SELECT
            DATE(created_at) AS date,

            COUNT(*) AS total_tickets,

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
            ) AS avg_resolution_minutes,

            /* Response Breach Rate */
            ROUND(
                (
                    COUNT(*) FILTER (
                        WHERE priority = 'high'
                        AND assigned_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (assigned_at - created_at))/60 > 15
                    )
                    +
                    COUNT(*) FILTER (
                        WHERE priority = 'medium'
                        AND assigned_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (assigned_at - created_at))/60 > 60
                    )
                    +
                    COUNT(*) FILTER (
                        WHERE priority = 'low'
                        AND assigned_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (assigned_at - created_at))/60 > 240
                    )
                )::decimal
                /
                NULLIF(
                    COUNT(*) FILTER (WHERE assigned_at IS NOT NULL),
                    0
                )
                * 100,
                2
            ) AS response_breach_percent,

            /* Resolution Breach Rate */
            ROUND(
                (
                    COUNT(*) FILTER (
                        WHERE priority = 'high'
                        AND closed_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (closed_at - created_at))/60 > 120
                    )
                    +
                    COUNT(*) FILTER (
                        WHERE priority = 'medium'
                        AND closed_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (closed_at - created_at))/60 > 480
                    )
                    +
                    COUNT(*) FILTER (
                        WHERE priority = 'low'
                        AND closed_at IS NOT NULL
                        AND EXTRACT(EPOCH FROM (closed_at - created_at))/60 > 1440
                    )
                )::decimal
                /
                NULLIF(
                    COUNT(*) FILTER (WHERE closed_at IS NOT NULL),
                    0
                )
                * 100,
                2
            ) AS resolution_breach_percent

        FROM tickets
        WHERE created_at >= NOW() - INTERVAL '%s days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC;
        """

        cur.execute(query, (days,))
        rows = cur.fetchall()

        result = []

        for row in rows:
            result.append({
                "date": row[0],
                "total_tickets": row[1],
                "average_response_time_minutes": float(row[2] or 0),
                "average_resolution_time_minutes": float(row[3] or 0),
                "response_breach_percent": float(row[4] or 0),
                "resolution_breach_percent": float(row[5] or 0)
            })

        return result

    finally:
        cur.close()
        release_conn(conn)

def get_sla_comparison(days=7):
    conn = get_conn()
    cur = conn.cursor()

    try:
        query = """
        WITH current_period AS (
            SELECT *
            FROM tickets
            WHERE created_at >= NOW() - INTERVAL '%s days'
        ),
        previous_period AS (
            SELECT *
            FROM tickets
            WHERE created_at >= NOW() - INTERVAL '%s days'
              AND created_at < NOW() - INTERVAL '%s days'
        )

        SELECT
            /* ---------- CURRENT ---------- */
            (SELECT COUNT(*) FROM current_period) AS current_total,
            (SELECT ROUND(
                AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))/60)
                FILTER (WHERE assigned_at IS NOT NULL),
                2
            ) FROM current_period) AS current_avg_response,

            (SELECT ROUND(
                AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/60)
                FILTER (WHERE closed_at IS NOT NULL),
                2
            ) FROM current_period) AS current_avg_resolution,

            /* ---------- PREVIOUS ---------- */
            (SELECT COUNT(*) FROM previous_period) AS previous_total,
            (SELECT ROUND(
                AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))/60)
                FILTER (WHERE assigned_at IS NOT NULL),
                2
            ) FROM previous_period) AS previous_avg_response,

            (SELECT ROUND(
                AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/60)
                FILTER (WHERE closed_at IS NOT NULL),
                2
            ) FROM previous_period) AS previous_avg_resolution
        ;
        """

        cur.execute(query, (days, days*2, days))
        result = cur.fetchone()

        (
            current_total,
            current_avg_response,
            current_avg_resolution,
            previous_total,
            previous_avg_response,
            previous_avg_resolution
        ) = result

        def percent_change(current, previous):
            if not previous or previous == 0:
                return 0
            return round(((current - previous) / previous) * 100, 2)

        return {
            "current_period": {
                "total_tickets": current_total,
                "average_response_time_minutes": float(current_avg_response or 0),
                "average_resolution_time_minutes": float(current_avg_resolution or 0)
            },
            "previous_period": {
                "total_tickets": previous_total,
                "average_response_time_minutes": float(previous_avg_response or 0),
                "average_resolution_time_minutes": float(previous_avg_resolution or 0)
            },
            "trend": {
                "ticket_volume_change_percent": percent_change(current_total, previous_total),
                "response_time_change_percent": percent_change(
                    current_avg_response or 0,
                    previous_avg_response or 0
                ),
                "resolution_time_change_percent": percent_change(
                    current_avg_resolution or 0,
                    previous_avg_resolution or 0
                )
            }
        }

    finally:
        cur.close()
        release_conn(conn)          