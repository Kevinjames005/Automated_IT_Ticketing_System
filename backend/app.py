import os
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from services.assignment_service import assign_ticket, reassign_ticket
from services.member_service import start_ticket, resolve_ticket
from services.approval_service import approve_resolution, reject_resolution
from services.intake_service import process_email
from security.auth import require_api_key
from services.query_service import get_tickets
from services.ticket_detail_service import get_ticket_detail
from services.analytics_service import get_analytics
from datetime import datetime, timedelta
from services.member_analytics_service import get_member_performance
from services.breakdown_analytics_service import (
    get_priority_breakdown, get_category_breakdown,
    get_sla_trend, get_sla_comparison
)
from security.supabase_auth import require_auth
from flask_cors import CORS

load_dotenv()

# ── Logging configuration ─────────────────────────────────────────────────────
# Writes to stdout (Render captures this automatically in the dashboard logs).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:5173"],
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})


@app.route("/classify", methods=["POST"])
@require_api_key
def classify():
    data = request.get_json()

    if not data or "subject" not in data or "body" not in data or "sender_email" not in data:
        return jsonify({"error": "Invalid input"}), 400

    logger.info("POST /classify | sender=%s", data.get("sender_email"))

    result = process_email(
        subject=data["subject"],
        body=data["body"],
        sender_email=data["sender_email"],
        sender_name=data.get("sender_name")
    )

    return jsonify(result), 200


@app.route("/assign-ticket", methods=["POST"])
@require_auth
def assign_ticket_endpoint():
    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        logger.info("POST /assign-ticket | ticket_id=%s | member_id=%s", data["ticket_id"], data["member_id"])

        assign_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
            supabase_uuid=supabase_uuid
        )

        return {"message": "Ticket assigned successfully"}, 200

    except Exception as e:
        logger.error("POST /assign-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/members", methods=["GET"])
@require_auth
def get_members_endpoint():
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute("""
            SELECT member_id, name, lead_id, email
            FROM team_members
            ORDER BY name ASC;
        """)

        rows = cur.fetchall()
        cur.close()
        release_conn(conn)

        members = [
            {"member_id": row[0], "name": row[1], "lead_id": row[2], "email": row[3]}
            for row in rows
        ]

        return jsonify({"members": members}), 200

    except Exception as e:
        logger.error("GET /members failed | error=%s", e)
        raise e


@app.route("/start-ticket", methods=["POST"])
@require_auth
def start_ticket_endpoint():
    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        logger.info("POST /start-ticket | ticket_id=%s | member_id=%s", data["ticket_id"], data["member_id"])

        start_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"]
        )

        return {"message": "Ticket started successfully"}, 200

    except Exception as e:
        logger.error("POST /start-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/resolve-ticket", methods=["POST"])
@require_auth
def resolve_ticket_endpoint():
    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data or "resolution_text" not in data:
        return {"error": "Invalid input"}, 400

    try:
        logger.info("POST /resolve-ticket | ticket_id=%s | member_id=%s", data["ticket_id"], data["member_id"])

        resolution_id = resolve_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
            resolution_text=data["resolution_text"]
        )

        return {
            "message": "Ticket resolved successfully",
            "resolution_id": resolution_id
        }, 200

    except Exception as e:
        logger.error("POST /resolve-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/approve-resolution", methods=["POST"])
@require_auth
def approve_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400
    try:
        from db import get_conn, release_conn

        supabase_user_id = request.user.get("id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s",
            (supabase_user_id,)
        )
        row = cur.fetchone()
        cur.close()
        release_conn(conn)

        if not row:
            return {"error": "Lead not found"}, 403

        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        logger.info("POST /approve-resolution | ticket_id=%s", data["ticket_id"])

        approve_resolution(
            ticket_id=data["ticket_id"],
            supabase_uuid=supabase_uuid,
            add_to_kb=data.get("add_to_kb", False)
        )
        return {"message": "Ticket approved successfully"}, 200

    except Exception as e:
        logger.error("POST /approve-resolution failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/reject-resolution", methods=["POST"])
@require_auth
def reject_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400
    try:
        from db import get_conn, release_conn

        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        rejection_reason = (data.get("rejection_reason") or "").strip() or None

        logger.info("POST /reject-resolution | ticket_id=%s | has_reason=%s", data["ticket_id"], rejection_reason is not None)

        reject_resolution(
            ticket_id=data["ticket_id"],
            supabase_uuid=supabase_uuid,
            rejection_reason=rejection_reason,
        )

        if rejection_reason:
            conn = get_conn()
            cur  = conn.cursor()

            cur.execute(
                "SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s",
                (supabase_uuid,)
            )
            row = cur.fetchone()
            if row:
                lead_id = row[0]
                cur.execute(
                    """
                    INSERT INTO ticket_comments
                        (ticket_id, author_id, author_role, comment_type, body)
                    VALUES (%s, %s, 'lead', 'rejection_reason', %s)
                    """,
                    (data["ticket_id"], lead_id, rejection_reason)
                )
                conn.commit()

            cur.close()
            release_conn(conn)

        return {"message": "Resolution rejected. Ticket reassigned."}, 200

    except Exception as e:
        logger.error("POST /reject-resolution failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/tickets/<int:ticket_id>/comments", methods=["GET"])
@require_auth
def get_ticket_comments(ticket_id):
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute(
            """
            SELECT
                tc.comment_id,
                tc.ticket_id,
                tc.author_id,
                tc.author_role,
                tc.comment_type,
                tc.body,
                tc.created_at,
                CASE
                    WHEN tc.author_role = 'lead'
                         THEN tl.name
                    ELSE tm.name
                END AS author_name
            FROM ticket_comments tc
            LEFT JOIN team_leads   tl ON tc.author_role = 'lead'   AND tl.lead_id   = tc.author_id
            LEFT JOIN team_members tm ON tc.author_role = 'member' AND tm.member_id  = tc.author_id
            WHERE tc.ticket_id = %s
            ORDER BY tc.created_at DESC
            """,
            (ticket_id,)
        )

        rows = cur.fetchall()
        cur.close()
        release_conn(conn)

        comments = [
            {
                "comment_id":   r[0],
                "ticket_id":    r[1],
                "author_id":    r[2],
                "author_role":  r[3],
                "comment_type": r[4],
                "body":         r[5],
                "created_at":   r[6].isoformat() if r[6] else None,
                "author_name":  r[7] or "Unknown",
            }
            for r in rows
        ]

        return jsonify({"comments": comments}), 200

    except Exception as e:
        logger.error("GET /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise e


@app.route("/tickets/<int:ticket_id>/comments", methods=["POST"])
@require_auth
def add_ticket_comment(ticket_id):
    data = request.get_json()
    if not data or not (data.get("body") or "").strip():
        return {"error": "Comment body is required"}, 400
    try:
        from db import get_conn, release_conn

        supabase_uuid = request.user.get("id")
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute(
            "SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s",
            (supabase_uuid,)
        )
        row = cur.fetchone()
        if row:
            author_id   = row[0]
            author_role = "lead"
        else:
            cur.execute(
                "SELECT member_id FROM team_members WHERE supabase_user_id::text = %s",
                (supabase_uuid,)
            )
            row = cur.fetchone()
            if not row:
                cur.close()
                release_conn(conn)
                return {"error": "User not found"}, 403
            author_id   = row[0]
            author_role = "member"

        cur.execute(
            """
            INSERT INTO ticket_comments
                (ticket_id, author_id, author_role, comment_type, body)
            VALUES (%s, %s, %s, 'general', %s)
            RETURNING comment_id, created_at
            """,
            (ticket_id, author_id, author_role, data["body"].strip())
        )
        result = cur.fetchone()
        conn.commit()
        cur.close()
        release_conn(conn)

        return jsonify({
            "comment_id": result[0],
            "created_at": result[1].isoformat(),
        }), 201

    except Exception as e:
        logger.error("POST /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise e


@app.route("/tickets", methods=["GET"])
@require_auth
def get_tickets_endpoint():
    try:
        status   = request.args.get("status")
        priority = request.args.get("priority")
        search   = request.args.get("search", "").strip() or None
        page     = int(request.args.get("page",  1))
        limit    = int(request.args.get("limit", 20))

        range_param = request.args.get("range")
        member_id = request.args.get("member_id")
        if member_id:
            member_id = int(member_id)

        result = get_tickets(
            status=status,
            priority=priority,
            search=search,
            page=page,
            limit=limit,
            date_range=range_param,
            member_id=member_id,
        )

        for t in result.get("tickets", []):
            for field in ("created_at", "assigned_at", "started_at",
                          "resolved_at", "closed_at"):
                if t.get(field) and hasattr(t[field], "isoformat"):
                    t[field] = t[field].isoformat()

        return jsonify(result), 200

    except Exception as e:
        logger.error("GET /tickets failed | error=%s", e)
        raise e


@app.route("/analytics", methods=["GET"])
@require_auth
def analytics_endpoint():
    range_param = request.args.get("range")
    start = request.args.get("start")
    end = request.args.get("end")

    start_date = None
    end_date = None

    if range_param == "7days":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif range_param == "30days":
        start_date = datetime.utcnow() - timedelta(days=30)
    elif start and end:
        start_date = datetime.fromisoformat(start)
        end_date = datetime.fromisoformat(end)

    result = get_analytics(start_date, end_date)
    return result, 200


@app.route("/analytics/members", methods=["GET"])
@require_auth
def analytics_members():
    range_param = request.args.get("range")

    start_date = None
    end_date = None

    if range_param == "7days":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif range_param == "30days":
        start_date = datetime.utcnow() - timedelta(days=30)

    result = get_member_performance(start_date, end_date)
    return {"members": result}, 200


@app.route("/analytics/priority", methods=["GET"])
@require_auth
def analytics_priority():
    result = get_priority_breakdown()
    return {"priority_breakdown": result}, 200


@app.route("/analytics/categories", methods=["GET"])
@require_auth
def analytics_categories():
    result = get_category_breakdown()
    return {"category_breakdown": result}, 200


@app.route("/analytics/sla-trend", methods=["GET"])
@require_auth
def analytics_sla_trend():
    days = int(request.args.get("days", 7))
    result = get_sla_trend(days)
    return {"sla_trend": result}, 200


@app.route("/reassign-ticket", methods=["POST"])
@require_auth
def reassign_ticket_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data or "new_member_id" not in data or "lead_id" not in data:
        return {"error": "Invalid input"}, 400
    try:
        logger.info("POST /reassign-ticket | ticket_id=%s | new_member_id=%s", data["ticket_id"], data["new_member_id"])

        reassign_ticket(
            ticket_id=data["ticket_id"],
            new_member_id=data["new_member_id"],
            lead_id=data["lead_id"]
        )
        return {"message": "Ticket reassigned successfully"}, 200
    except Exception as e:
        logger.error("POST /reassign-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise e


@app.route("/analytics/sla-comparison", methods=["GET"])
@require_auth
def analytics_sla_comparison():
    days = int(request.args.get("days", 7))
    result = get_sla_comparison(days)
    return result, 200


@app.route("/me", methods=["GET"])
@require_auth
def get_me():
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur = conn.cursor()

        user_id = request.user.get("id")

        cur.execute("SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s", (user_id,))
        if cur.fetchone():
            cur.close()
            release_conn(conn)
            return {"role": "teamlead"}, 200

        cur.execute("SELECT member_id FROM team_members WHERE supabase_user_id = %s", (user_id,))
        if cur.fetchone():
            cur.close()
            release_conn(conn)
            return {"role": "member"}, 200

        cur.close()
        release_conn(conn)
        return {"role": "unknown"}, 403

    except Exception as e:
        logger.error("GET /me failed | error=%s", e)
        raise e
    
@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("Unhandled exception occurred")  # better logging

    return jsonify({
        "error": "Internal Server Error"
    }), 500


if __name__ == "__main__":
    logger.info("Starting IT Ticketing System backend on port 8000")
    app.run(host="0.0.0.0", port=8000, debug=os.getenv("FLASK_ENV") == "development")