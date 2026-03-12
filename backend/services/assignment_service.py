from db import get_conn, release_conn

def assign_ticket(ticket_id: int, member_id: int, supabase_uuid: str):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Resolve supabase_uuid → lead_id
        cur.execute(
            """
            SELECT lead_id
            FROM team_leads
            WHERE supabase_user_id = %s;
            """,
            (supabase_uuid,)
        )

        lead_row = cur.fetchone()

        if not lead_row:
            raise Exception("Unauthorized: not a team lead")

        lead_id = lead_row[0]

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

        # Verify new member belongs to this lead
        cur.execute(
            "SELECT 1 FROM team_members WHERE member_id = %s AND lead_id = %s;",
            (new_member_id, lead_id)
        )
        if not cur.fetchone():
            raise Exception("This member does not belong to this team lead")

        # Update existing assignment record (member_id + assigned_by)
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

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        release_conn(conn)