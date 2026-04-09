import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.approval_service import approve_resolution, reject_resolution

logger = logging.getLogger(__name__)

approval_bp = Blueprint("approval", __name__)


@approval_bp.route("/approve-resolution", methods=["POST"])
@require_auth
def approve_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        logger.info("POST /approve-resolution | ticket_id=%s", data["ticket_id"])

        approve_resolution(
            ticket_id=data["ticket_id"],
            supabase_uuid=supabase_uuid,
            add_to_kb=data.get("add_to_kb", False),
        )

        return {"message": "Ticket approved successfully"}, 200

    except Exception as e:
        logger.error("POST /approve-resolution failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise


@approval_bp.route("/reject-resolution", methods=["POST"])
@require_auth
def reject_resolution_endpoint():
    data = request.get_json()
    if not data or "ticket_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        supabase_uuid = request.user.get("id")
        if not supabase_uuid:
            return {"error": "Unauthorized"}, 403

        rejection_reason = (data.get("rejection_reason") or "").strip() or None

        logger.info(
            "POST /reject-resolution | ticket_id=%s | has_reason=%s",
            data["ticket_id"], rejection_reason is not None
        )

        reject_resolution(
            ticket_id=data["ticket_id"],
            supabase_uuid=supabase_uuid,
            rejection_reason=rejection_reason,
        )

        return {"message": "Resolution rejected. Ticket reassigned."}, 200

    except Exception as e:
        logger.error("POST /reject-resolution failed | ticket_id=%s | error=%s", data.get("ticket_id"), e)
        raise