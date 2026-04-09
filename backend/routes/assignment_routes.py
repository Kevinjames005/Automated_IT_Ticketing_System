import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.assignment_service import assign_ticket, reassign_ticket

logger = logging.getLogger(__name__)

assignment_bp = Blueprint("assignment", __name__)


@assignment_bp.route("/assign-ticket", methods=["POST"])
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
            supabase_uuid=supabase_uuid,
        )

        return {"message": "Ticket assigned successfully"}, 200

    except Exception as e:
        logger.error("POST /assign-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise


@assignment_bp.route("/reassign-ticket", methods=["POST"])
@require_auth
def reassign_ticket_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data or "new_member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        logger.info("POST /reassign-ticket | ticket_id=%s | new_member_id=%s", data["ticket_id"], data["new_member_id"])

        reassign_ticket(
            ticket_id=data["ticket_id"],
            new_member_id=data["new_member_id"],
            supabase_uuid=supabase_uuid,
        )

        return {"message": "Ticket reassigned successfully"}, 200

    except Exception as e:
        logger.error("POST /reassign-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise