# backend/services/analytics_service.py

from db import get_conn, release_conn


def get_analytics(start_date=None, end_date=None):
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
            ) AS avg_resolution_minutes,

            /* ---------- RESPONSE BREACH RATE ---------- */
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
            ) AS response_breach_rate_percent,

            /* ---------- RESOLUTION BREACH RATE ---------- */
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
            ) AS resolution_breach_rate_percent

        FROM tickets
        {where_clause};
        """

        cur.execute(query, params)
        result = cur.fetchone()

        return {
            "total_tickets": int(result[0] or 0),
            "open_tickets": int(result[1] or 0),
            "closed_tickets": int(result[2] or 0),
            "average_response_time_minutes": float(result[3] or 0),
            "average_resolution_time_minutes": float(result[4] or 0),
            "response_breach_rate_percent": float(result[5] or 0),
            "resolution_breach_rate_percent": float(result[6] or 0)
        }

    finally:
        cur.close()
        release_conn(conn)