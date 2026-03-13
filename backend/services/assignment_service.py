from db import get_conn, release_conn
from services.notification_service import notify_member_assigned, notify_user_ticket_assigned


def assign_ticket(ticket_id: int, member_id: int, supabase_uuid: str):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Resolve supabase_uuid → lead_id + lead name
        cur.execute(
            """
            SELECT lead_id, name
            FROM team_leads
            WHERE supabase_user_id = %s;
            """,
            (supabase_uuid,)
        )

        lead_row = cur.fetchone()

        if not lead_row:
            raise Exception("Unauthorized: not a team lead")

        lead_id, lead_name = lead_row

        # Lock ticket
        cur.execute(
            "SELECT status FROM tickets WHERE ticket_id = %s FOR UPDATE;",
            (ticket_id,)
        )
        ticket = cur.fetchone()
        if not ticket:
            raise Exception("Ticket not found")

        if ticket[0] != "Pending":
            raise Exception("Only pending tickets can be assigned")

        cur.execute(
            "SELECT 1 FROM team_members WHERE member_id = %s AND lead_id = %s;",
            (member_id, lead_id)
        )
        if not cur.fetchone():
            raise Exception("This member does not belong to this team lead")

        cur.execute(
            "SELECT 1 FROM ticket_assignments WHERE ticket_id = %s;",
            (ticket_id,)
        )
        if cur.fetchone():
            raise Exception("Ticket already assigned")

        cur.execute(
            "INSERT INTO ticket_assignments (ticket_id, member_id, assigned_by) VALUES (%s, %s, %s);",
            (ticket_id, member_id, lead_id)
        )
        cur.execute(
            "UPDATE tickets SET status = 'Assigned', assigned_at = COALESCE(assigned_at, NOW()) WHERE ticket_id = %s;",
            (ticket_id,)
        )
        cur.execute(
            "INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by) VALUES (%s, %s, %s, %s);",
            (ticket_id, "Pending", "Assigned", lead_id)
        )
        conn.commit()

        # ── Fetch data needed for notifications ─────────────────────────────
        cur.execute(
            """
            SELECT tm.email, tm.name, er.subject, t.priority, t.category_id,
                   u.email AS reporter_email, u.name AS reporter_name,
                   c.name  AS category_name
            FROM team_members tm
            JOIN tickets t          ON t.ticket_id = %s
            JOIN email_requests er  ON er.email_id = t.email_id
            JOIN users u            ON u.user_id   = er.user_id
            LEFT JOIN categories c  ON c.category_id = t.category_id
            WHERE tm.member_id = %s;
            """,
            (ticket_id, member_id)
        )
        row = cur.fetchone()

        if row:
            (member_email, member_name, subject, priority,
             _cat_id, reporter_email, reporter_name, category_name) = row

            # 📧 Notify team member: ticket assigned to them
            notify_member_assigned(
                to_email=member_email,
                member_name=member_name,
                ticket_id=ticket_id,
                subject=subject,
                category=category_name,
                priority=priority,
                assigned_by=lead_name,
            )

            # 📧 Notify reporter: their ticket is now being handled
            notify_user_ticket_assigned(
                to_email=reporter_email,
                reporter_name=reporter_name,
                ticket_id=ticket_id,
                subject=subject,
                priority=priority,
            )

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        release_conn(conn)


def reassign_ticket(ticket_id: int, new_member_id: int, lead_id: int):
    """
    Reassigns a Resolved ticket to a different (or same) member.
    - Updates ticket_assignments (member_id, assigned_by)
    - Resets ticket status back to 'Assigned'
    - Increments reopen_count so history is visible
    - Logs to ticket_status_history
    - Notifies the new member by email
    """
    conn = get_conn()
    cur = conn.cursor()

    try:
        # Lock ticket
        cur.execute(
            "SELECT status FROM tickets WHERE ticket_id = %s FOR UPDATE;",
            (ticket_id,)
        )
        ticket = cur.fetchone()
        if not ticket:
            raise Exception("Ticket not found")

        current_status = ticket[0]
        if current_status != "Resolved":
            raise Exception("Only resolved tickets can be reassigned")

        # Verify new member belongs to this lead + get their info
        cur.execute(
            "SELECT name, email FROM team_members WHERE member_id = %s AND lead_id = %s;",
            (new_member_id, lead_id)
        )
        member_row = cur.fetchone()
        if not member_row:
            raise Exception("This member does not belong to this team lead")

        new_member_name, new_member_email = member_row

        # Fetch lead name
        cur.execute("SELECT name FROM team_leads WHERE lead_id = %s;", (lead_id,))
        lead_row = cur.fetchone()
        lead_name = lead_row[0] if lead_row else "Team Lead"

        # Update existing assignment record
        cur.execute(
            """
            UPDATE ticket_assignments
            SET member_id   = %s,
                assigned_by = %s
            WHERE ticket_id = %s;
            """,
            (new_member_id, lead_id, ticket_id)
        )

        # Reset ticket status → Assigned, bump reopen_count
        cur.execute(
            """
            UPDATE tickets
            SET status        = 'Assigned',
                reopen_count  = reopen_count + 1,
                reopened_at   = NOW(),
                started_at    = NULL,
                resolved_at   = NULL
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # Log history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, current_status, "Assigned", lead_id)
        )

        conn.commit()

        # ── Notify new member ────────────────────────────────────────────────
        cur.execute(
            """
            SELECT er.subject, t.priority, c.name AS category
            FROM tickets t
            JOIN email_requests er ON er.email_id = t.email_id
            LEFT JOIN categories c ON c.category_id = t.category_id
            WHERE t.ticket_id = %s;
            """,
            (ticket_id,)
        )
        ticket_row = cur.fetchone()

        if ticket_row and new_member_email:
            subject, priority, category_name = ticket_row
            notify_member_assigned(
                to_email=new_member_email,
                member_name=new_member_name,
                ticket_id=ticket_id,
                subject=subject,
                category=category_name,
                priority=priority,
                assigned_by=lead_name,
            )

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        release_conn(conn)