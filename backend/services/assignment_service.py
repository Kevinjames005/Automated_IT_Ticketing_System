from db import get_conn, release_conn

def assign_ticket(ticket_id: int, member_id: int, lead_id: int):

    conn = get_conn()
    cur = conn.cursor()

    try:
        
        cur.execute(
            """
            SELECT status
            FROM tickets
            WHERE ticket_id = %s
            FOR UPDATE;
            """,
            (ticket_id,)
        )

        ticket = cur.fetchone()

        if not ticket:
            raise Exception("Ticket not found")

        current_status = ticket[0]

        
        if current_status != "Pending":
            raise Exception("Only pending tickets can be assigned")

        
        cur.execute(
            """
            SELECT 1
            FROM team_members
            WHERE member_id = %s AND lead_id = %s;
            """,
            (member_id, lead_id)
        )

        if not cur.fetchone():
            raise Exception("This member does not belong to this team lead")

        cur.execute(
            """
            SELECT 1
            FROM ticket_assignments
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        if cur.fetchone():
            raise Exception("Ticket already assigned")

        
        cur.execute(
            """
            INSERT INTO ticket_assignments (ticket_id, member_id, assigned_by)
            VALUES (%s, %s, %s);
            """,
            (ticket_id, member_id, lead_id)
        )

        
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Assigned',
                assigned_at = COALESCE(assigned_at, NOW())
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, current_status, 'Assigned', lead_id)
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)