import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.query_service import get_tickets
from services.comment_service import get_ticket_comments, add_ticket_comment

logger = logging.getLogger(__name__)

ticket_bp = Blueprint("tickets", __name__)


@ticket_bp.route("/tickets", methods=["GET"])
@require_auth
def get_tickets_endpoint():
    try:
        status      = request.args.get("status")
        priority    = request.args.get("priority")
        search      = request.args.get("search", "").strip() or None
        page        = int(request.args.get("page", 1))
        limit       = min(int(request.args.get("limit", 20)), 100)
        range_param = request.args.get("range")
        member_id   = request.args.get("member_id")
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
            for field in ("created_at", "assigned_at", "started_at", "resolved_at", "closed_at"):
                if t.get(field) and hasattr(t[field], "isoformat"):
                    t[field] = t[field].isoformat()

        return jsonify(result), 200

    except Exception as e:
        logger.error("GET /tickets failed | error=%s", e)
        raise


@ticket_bp.route("/tickets/<int:ticket_id>/comments", methods=["GET"])
@require_auth
def get_ticket_comments_endpoint(ticket_id):
    try:
        comments = get_ticket_comments(ticket_id)
        return jsonify({"comments": comments}), 200

    except Exception as e:
        logger.error("GET /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise


@ticket_bp.route("/tickets/<int:ticket_id>/comments", methods=["POST"])
@require_auth
def add_ticket_comment_endpoint(ticket_id):
    data = request.get_json()
    if not data or not (data.get("body") or "").strip():
        return {"error": "Comment body is required"}, 400

    try:
        supabase_uuid = request.user.get("id")
        result = add_ticket_comment(
            ticket_id=ticket_id,
            supabase_uuid=supabase_uuid,
            body=data["body"].strip(),
        )
        return jsonify(result), 201

    except ValueError as e:
        return {"error": str(e)}, 403

    except Exception as e:
        logger.error("POST /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise