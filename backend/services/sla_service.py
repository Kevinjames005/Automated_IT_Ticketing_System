from datetime import datetime, timezone

SLA_RULES = {
    "high": {
        "lead_response":     15,   # minutes: lead must assign within
        "member_response":   15,   # minutes: member must reply once assigned
        "member_resolution": 120,  # minutes: member must resolve once assigned
    },
    "medium": {
        "lead_response":     60,
        "member_response":   60,
        "member_resolution": 480,
    },
    "low": {
        "lead_response":     240,
        "member_response":   240,
        "member_resolution": 1440,
    },
}


def _to_utc(dt):
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_sla_status(priority, created_at, assigned_at, resolved_at, closed_at):
    """
    Two independent SLA clocks:

    Lead SLA   — created_at → assigned_at (how fast did lead assign?)
    Member SLA — assigned_at → resolved_at/closed_at (how fast did member resolve?)
    """
    priority = priority.lower()
    rules = SLA_RULES.get(priority)
    if not rules:
        return {}

    now         = datetime.now(timezone.utc)
    created_at  = _to_utc(created_at)
    assigned_at = _to_utc(assigned_at)
    resolved_at = _to_utc(resolved_at)
    closed_at   = _to_utc(closed_at)

    # ── Lead SLA ─────────────────────────────────────────────────────────────
    lead_limit = rules["lead_response"]
    lead_elapsed = (
        (assigned_at - created_at).total_seconds() / 60
        if assigned_at
        else (now - created_at).total_seconds() / 60
    )
    lead_remaining = lead_limit - lead_elapsed

    if lead_elapsed > lead_limit:
        lead_status = "breached"
    elif lead_elapsed >= 0.8 * lead_limit:
        lead_status = "at_risk"
    else:
        lead_status = "healthy"

    # ── Member SLA ───────────────────────────────────────────────────────────
    # Clock only starts once the ticket is assigned.
    if assigned_at:
        end_time = resolved_at or closed_at or now
        member_elapsed = (end_time - assigned_at).total_seconds() / 60

        mr_limit   = rules["member_response"]
        mres_limit = rules["member_resolution"]

        mr_remaining   = mr_limit   - member_elapsed
        mres_remaining = mres_limit - member_elapsed

        if member_elapsed > mr_limit:
            mr_status = "breached"
        elif member_elapsed >= 0.8 * mr_limit:
            mr_status = "at_risk"
        else:
            mr_status = "healthy"

        if member_elapsed > mres_limit:
            mres_status = "breached"
        elif member_elapsed >= 0.8 * mres_limit:
            mres_status = "at_risk"
        else:
            mres_status = "healthy"
    else:
        member_elapsed = None
        mr_limit       = rules["member_response"]
        mres_limit     = rules["member_resolution"]
        mr_remaining   = mr_limit
        mres_remaining = mres_limit
        mr_status      = "pending"
        mres_status    = "pending"

    return {
        # ── Lead SLA fields ──────────────────────────────
        "lead_response_elapsed_minutes":   round(lead_elapsed, 2),
        "lead_response_remaining_minutes": round(lead_remaining, 2),
        "lead_sla_status":                 lead_status,

        # ── Member SLA fields ────────────────────────────
        "member_elapsed_minutes":              round(member_elapsed, 2) if member_elapsed is not None else None,
        "member_response_remaining_minutes":   round(mr_remaining, 2),
        "member_resolution_remaining_minutes": round(mres_remaining, 2),
        "member_response_sla_status":          mr_status,
        "member_resolution_sla_status":        mres_status,

        # ── Legacy aliases (existing code keeps working) ─
        "response_sla_status":        lead_status,
        "response_elapsed_minutes":   round(lead_elapsed, 2),
        "response_remaining_minutes": round(lead_remaining, 2),
        "resolution_sla_status":      mres_status,
        "resolution_elapsed_minutes": round(member_elapsed, 2) if member_elapsed is not None else None,
        "resolution_remaining_minutes": round(mres_remaining, 2),
    }