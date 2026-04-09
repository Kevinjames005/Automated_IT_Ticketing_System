import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.analytics_service import get_analytics
from services.member_analytics_service import get_member_performance
from services.breakdown_analytics_service import (
    get_priority_breakdown,
    get_category_breakdown,
    get_sla_trend,
    get_sla_comparison,
)

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/analytics", methods=["GET"])
@require_auth
def analytics_endpoint():
    range_param = request.args.get("range")
    start = request.args.get("start")
    end   = request.args.get("end")

    start_date = None
    end_date   = None

    if range_param == "7days":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif range_param == "30days":
        start_date = datetime.utcnow() - timedelta(days=30)
    elif start and end:
        start_date = datetime.fromisoformat(start)
        end_date   = datetime.fromisoformat(end)

    result = get_analytics(start_date, end_date)
    return result, 200


@analytics_bp.route("/analytics/members", methods=["GET"])
@require_auth
def analytics_members():
    range_param = request.args.get("range")

    start_date = None
    end_date   = None

    if range_param == "7days":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif range_param == "30days":
        start_date = datetime.utcnow() - timedelta(days=30)

    result = get_member_performance(start_date, end_date)
    return {"members": result}, 200


@analytics_bp.route("/analytics/priority", methods=["GET"])
@require_auth
def analytics_priority():
    result = get_priority_breakdown()
    return {"priority_breakdown": result}, 200


@analytics_bp.route("/analytics/categories", methods=["GET"])
@require_auth
def analytics_categories():
    result = get_category_breakdown()
    return {"category_breakdown": result}, 200


@analytics_bp.route("/analytics/sla-trend", methods=["GET"])
@require_auth
def analytics_sla_trend():
    days = int(request.args.get("days", 7))
    result = get_sla_trend(days)
    return {"sla_trend": result}, 200


@analytics_bp.route("/analytics/sla-comparison", methods=["GET"])
@require_auth
def analytics_sla_comparison():
    days = int(request.args.get("days", 7))
    result = get_sla_comparison(days)
    return result, 200