from db import get_conn, release_conn
from services.sla_service import calculate_sla_status


def get_member_performance(start_date=None, end_date=None):
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

        cur.execute(f"""
            SELECT
                m.member_id,
                m.name,
                t.priority,
                t.created_at,
                t.assigned_at,
                t.closed_at,
                t.reopen_count
            FROM ticket_assignments ta
            JOIN team_members m ON ta.member_id = m.member_id
            JOIN tickets t ON ta.ticket_id = t.ticket_id
            {where_clause}
        """, params)

        rows = cur.fetchall()

        performance = {}

        for (
            member_id,
            name,
            priority,
            created_at,
            assigned_at,
            closed_at,
            reopen_count
        ) in rows:

            if member_id not in performance:
                performance[member_id] = {
                    "member_id": member_id,
                    "name": name,
                    "tickets_handled": 0,
                    "avg_response_time": 0,
                    "avg_resolution_time": 0,
                    "sla_breaches": 0,
                    "reopens": 0,
                    "response_count": 0,
                    "resolution_count": 0,
                    "total_response_time": 0,
                    "total_resolution_time": 0
                }

            member_data = performance[member_id]

            member_data["tickets_handled"] += 1
            member_data["reopens"] += reopen_count or 0

            sla = calculate_sla_status(
                priority,
                created_at,
                assigned_at,
                closed_at
            )

            # Response Time
            if sla.get("response_elapsed_minutes") is not None:
                member_data["total_response_time"] += sla["response_elapsed_minutes"]
                member_data["response_count"] += 1

                if sla["response_sla_status"] == "breached":
                    member_data["sla_breaches"] += 1

            # Resolution Time
            if sla.get("resolution_elapsed_minutes") is not None:
                member_data["total_resolution_time"] += sla["resolution_elapsed_minutes"]
                member_data["resolution_count"] += 1

        # Final Calculations
        result = []

        for member in performance.values():

            avg_response = (
                round(member["total_response_time"] / member["response_count"], 2)
                if member["response_count"] > 0 else 0
            )

            avg_resolution = (
                round(member["total_resolution_time"] / member["resolution_count"], 2)
                if member["resolution_count"] > 0 else 0
            )
            breach_rate = (
                round((member["sla_breaches"] / member["tickets_handled"]) * 100, 2)
                if member["tickets_handled"] > 0 else 0
            )
            if breach_rate <= 10:
                grade = "A"
            elif breach_rate <= 30:
                grade = "B"
            elif breach_rate <= 60:
                grade = "C"
            else:
                grade = "D"

            result.append({
                "member_id": member["member_id"],
                "name": member["name"],
                "tickets_handled": member["tickets_handled"],
                "average_response_time_minutes": avg_response,
                "average_resolution_time_minutes": avg_resolution,
                "sla_breaches": member["sla_breaches"],
                "sla_breach_rate_percent": breach_rate,
                "reopens": member["reopens"],
                "performance_grade": grade
            })

        return result

    finally:
        cur.close()
        release_conn(conn)