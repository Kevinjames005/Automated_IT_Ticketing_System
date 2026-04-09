import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur  = conn.cursor()

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
        raise