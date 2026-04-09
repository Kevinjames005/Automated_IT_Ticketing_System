import logging
from flask import Blueprint, request, jsonify
from security.auth import require_api_key
from services.intake_service import process_email

logger = logging.getLogger(__name__)

intake_bp = Blueprint("intake", __name__)


@intake_bp.route("/classify", methods=["POST"])
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
        sender_name=data.get("sender_name"),
    )

    return jsonify(result), 200