import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.member_service import start_ticket, resolve_ticket, get_all_members

logger = logging.getLogger(__name__)

member_bp = Blueprint("members", __name__)


@member_bp.route("/members", methods=["GET"])
@require_auth
def get_members_endpoint():
    try:
        members = get_all_members()
        return jsonify({"members": members}), 200

    except Exception as e:
        logger.error("GET /members failed | error=%s", e)
        raise


@member_bp.route("/start-ticket", methods=["POST"])
@require_auth
def start_ticket_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data or "member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        logger.info("POST /start-ticket | ticket_id=%s | member_id=%s", data["ticket_id"], data["member_id"])

        start_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
        )

        return {"message": "Ticket started successfully"}, 200

    except Exception as e:
        logger.error("POST /start-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise


@member_bp.route("/resolve-ticket", methods=["POST"])
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
            resolution_text=data["resolution_text"],
        )

        return {
            "message": "Ticket resolved successfully",
            "resolution_id": resolution_id,
        }, 200

    except Exception as e:
        logger.error("POST /resolve-ticket failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise