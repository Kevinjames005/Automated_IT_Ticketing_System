import logging
from flask import Blueprint, request, jsonify
from security.supabase_auth import require_auth
from services.query_service import get_tickets

logger = logging.getLogger(__name__)

ticket_bp = Blueprint("tickets", __name__)


@ticket_bp.route("/tickets", methods=["GET"])
@require_auth
def get_tickets_endpoint():
    try:
        status     = request.args.get("status")
        priority   = request.args.get("priority")
        search     = request.args.get("search", "").strip() or None
        page       = int(request.args.get("page", 1))
        limit      = min(int(request.args.get("limit", 20)), 100)
        range_param = request.args.get("range")
        member_id  = request.args.get("member_id")
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
def get_ticket_comments(ticket_id):
    try:
        from db import get_conn, release_conn
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute(
            """
            SELECT
                tc.comment_id,
                tc.ticket_id,
                tc.author_id,
                tc.author_role,
                tc.comment_type,
                tc.body,
                tc.created_at,
                CASE
                    WHEN tc.author_role = 'lead'   THEN tl.name
                    ELSE tm.name
                END AS author_name
            FROM ticket_comments tc
            LEFT JOIN team_leads   tl ON tc.author_role = 'lead'   AND tl.lead_id   = tc.author_id
            LEFT JOIN team_members tm ON tc.author_role = 'member' AND tm.member_id  = tc.author_id
            WHERE tc.ticket_id = %s
            ORDER BY tc.created_at DESC
            """,
            (ticket_id,)
        )

        rows = cur.fetchall()
        cur.close()
        release_conn(conn)

        comments = [
            {
                "comment_id":   r[0],
                "ticket_id":    r[1],
                "author_id":    r[2],
                "author_role":  r[3],
                "comment_type": r[4],
                "body":         r[5],
                "created_at":   r[6].isoformat() if r[6] else None,
                "author_name":  r[7] or "Unknown",
            }
            for r in rows
        ]

        return jsonify({"comments": comments}), 200

    except Exception as e:
        logger.error("GET /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise


@ticket_bp.route("/tickets/<int:ticket_id>/comments", methods=["POST"])
@require_auth
def add_ticket_comment(ticket_id):
    data = request.get_json()
    if not data or not (data.get("body") or "").strip():
        return {"error": "Comment body is required"}, 400

    try:
        from db import get_conn, release_conn

        supabase_uuid = request.user.get("id")
        conn = get_conn()
        cur  = conn.cursor()

        cur.execute(
            "SELECT lead_id FROM team_leads WHERE supabase_user_id::text = %s",
            (supabase_uuid,)
        )
        row = cur.fetchone()
        if row:
            author_id   = row[0]
            author_role = "lead"
        else:
            cur.execute(
                "SELECT member_id FROM team_members WHERE supabase_user_id::text = %s",
                (supabase_uuid,)
            )
            row = cur.fetchone()
            if not row:
                cur.close()
                release_conn(conn)
                return {"error": "User not found"}, 403
            author_id   = row[0]
            author_role = "member"

        cur.execute(
            """
            INSERT INTO ticket_comments
                (ticket_id, author_id, author_role, comment_type, body)
            VALUES (%s, %s, %s, 'general', %s)
            RETURNING comment_id, created_at
            """,
            (ticket_id, author_id, author_role, data["body"].strip())
        )
        result = cur.fetchone()
        conn.commit()
        cur.close()
        release_conn(conn)

        return jsonify({
            "comment_id": result[0],
            "created_at": result[1].isoformat(),
        }), 201

    except Exception as e:
        logger.error("POST /tickets/%s/comments failed | error=%s", ticket_id, e)
        raise