import os
from flask import Flask,request,jsonify
from dotenv import load_dotenv
from services.assignment_service import assign_ticket
from services.member_service import start_ticket , resolve_ticket
from services.approval_service import approve_resolution, reject_resolution
from services.intake_service import process_email
from security.auth import require_api_key
from services.query_service import get_tickets
from services.ticket_detail_service import get_ticket_detail
from services.analytics_service import get_analytics
from datetime import datetime, timedelta
from services.member_analytics_service import get_member_performance
from services.breakdown_analytics_service import get_priority_breakdown, get_category_breakdown, get_sla_trend,get_sla_comparison
from security.supabase_auth import require_auth
from flask_cors import CORS

load_dotenv()


app = Flask(__name__)
CORS(app)



@app.route("/classify", methods=["POST"])
@require_api_key
def classify():

    data = request.get_json()

    if not data or "subject" not in data or "body" not in data or "sender_email" not in data:
        return jsonify({"error": "Invalid input"}), 400

    result = process_email(
        subject=data["subject"],
        body=data["body"],
        sender_email=data["sender_email"],
        sender_name=data.get("sender_name")
    )

    return jsonify(result), 200


@app.route("/assign-ticket", methods=["POST"])
@require_auth  # 👈 called from frontend with Supabase token
def assign_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data or "lead_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        assign_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
            lead_id=data["lead_id"]
        )

        return {"message": "Ticket assigned successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 400


@app.route("/members", methods=["GET"])
@require_auth  # 👈 returns all team members with their IDs
def get_members_endpoint():
    """
    Returns all team members so the frontend can
    show names in the dropdown and send member_id on assign.
    """
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("""
            SELECT member_id, name, lead_id
            FROM team_members
            ORDER BY name ASC;
        """)

        rows = cur.fetchall()
        cur.close()
        release_conn(conn)

        members = [
            {"member_id": row[0], "name": row[1], "lead_id": row[2]}
            for row in rows
        ]

        return jsonify({"members": members}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
@app.route("/start-ticket", methods=["POST"])
@require_api_key
def start_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        start_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"]
        )

        return {"message": "Ticket started successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/resolve-ticket", methods=["POST"])
@require_api_key
def resolve_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data or "resolution_text" not in data:
        return {"error": "Invalid input"}, 400

    try:
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
        return {"error": str(e)}, 400
    
@app.route("/approve-resolution", methods=["POST"])
@require_auth
def approve_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400
    try:
        # lead_id comes from the verified Supabase user attached by @require_auth
        lead_id = request.user.get("id") or data.get("lead_id")
        approve_resolution(
            ticket_id=data["ticket_id"],
            lead_id=lead_id,
            add_to_kb=data.get("add_to_kb", False)
        )
        return {"message": "Ticket approved successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 400

@app.route("/reject-resolution", methods=["POST"])
@require_auth
def reject_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400
    try:
        lead_id = request.user.get("id") or data.get("lead_id")
        reject_resolution(
            ticket_id=data["ticket_id"],
            lead_id=lead_id
        )
        return {"message": "Resolution rejected. Ticket reassigned."}, 200
    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/tickets", methods=["GET"])
@require_auth
def get_tickets_endpoint():
    try:
        status = request.args.get("status")
        priority = request.args.get("priority")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))

        data = get_tickets(
            status=status,
            priority=priority,
            page=page,
            limit=limit
        )

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
from services.analytics_service import get_analytics
from datetime import datetime, timedelta

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
    
from services.member_analytics_service import get_member_performance

@app.route("/analytics/members", methods=["GET"])
@require_auth
def analytics_members():
    range_param = request.args.get("range")

    from datetime import datetime, timedelta

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

        # 🔥 IMPORTANT — use supabase_user_id
        cur.execute("SELECT lead_id FROM team_leads WHERE supabase_user_id = %s", (user_id,))
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
        print("ERROR IN /me:", str(e))
        return {"error": str(e)}, 400
    
    
if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)