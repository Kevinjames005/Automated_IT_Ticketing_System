from datetime import datetime, timezone

SLA_RULES = {
    "high": {
        "response": 15,
        "resolution": 120
    },
    "medium": {
        "response": 60,
        "resolution": 480
    },
    "low": {
        "response": 240,
        "resolution": 1440
    }
}


def calculate_sla_status(priority, created_at, assigned_at, closed_at):
    priority = priority.lower()
    rules = SLA_RULES.get(priority)

    if not rules:
        return {}

    now = datetime.now(timezone.utc)

# Convert DB timestamps to UTC-aware
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if assigned_at and assigned_at.tzinfo is None:
        assigned_at = assigned_at.replace(tzinfo=timezone.utc)

    if closed_at and closed_at.tzinfo is None:
        closed_at = closed_at.replace(tzinfo=timezone.utc)
        
    if assigned_at:
        response_elapsed = (assigned_at - created_at).total_seconds() / 60
    else:
        response_elapsed = (now - created_at).total_seconds() / 60

    response_limit = rules["response"]
    response_remaining = response_limit - response_elapsed

    if response_elapsed > response_limit:
        response_status = "breached"
    elif response_elapsed >= 0.8 * response_limit:
        response_status = "at_risk"
    else:
        response_status = "healthy"

    # ---------- RESOLUTION ----------
    if closed_at:
        resolution_elapsed = (closed_at - created_at).total_seconds() / 60
    else:
        resolution_elapsed = (now - created_at).total_seconds() / 60

    resolution_limit = rules["resolution"]
    resolution_remaining = resolution_limit - resolution_elapsed

    if resolution_elapsed > resolution_limit:
        resolution_status = "breached"
    elif resolution_elapsed >= 0.8 * resolution_limit:
        resolution_status = "at_risk"
    else:
        resolution_status = "healthy"

    return {
        "response_elapsed_minutes": round(response_elapsed, 2),
        "response_remaining_minutes": round(response_remaining, 2),
        "response_sla_status": response_status,
        "resolution_elapsed_minutes": round(resolution_elapsed, 2),
        "resolution_remaining_minutes": round(resolution_remaining, 2),
        "resolution_sla_status": resolution_status,
    }