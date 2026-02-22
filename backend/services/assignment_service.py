from db import get_conn, release_conn

def assign_ticket(ticket_id: int, member_id: int, lead_id: int):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Check ticket exists
        cur.execute(
            "SELECT status FROM tickets WHERE ticket_id = %s;",
            (ticket_id,)
        )
        ticket = cur.fetchone()

        if not ticket:
            raise Exception("Ticket not found")

        current_status = ticket[0]

        # Only Pending tickets can be assigned
        if current_status != "Pending":
            raise Exception("Only pending tickets can be assigned")

        # Check member belongs to this lead
        cur.execute(
            """
            SELECT member_id
            FROM team_members
            WHERE member_id = %s AND lead_id = %s;
            """,
            (member_id, lead_id)
        )

        member = cur.fetchone()

        if not member:
            raise Exception("This member does not belong to this team lead")

        # Ensure ticket is not already assigned
        cur.execute(
            """
            SELECT 1 FROM ticket_assignments
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        if cur.fetchone():
            raise Exception("Ticket already assigned")

        # Insert assignment
        cur.execute(
            """
            INSERT INTO ticket_assignments (ticket_id, member_id, assigned_by)
            VALUES (%s, %s, %s);
            """,
            (ticket_id, member_id, lead_id)
        )

        # Update ticket status
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Assigned'
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # Insert status history
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