from db import get_conn, release_conn

def start_ticket(ticket_id: int, member_id: int):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Verify ticket is assigned to this member
        cur.execute(
            """
            SELECT t.status
            FROM tickets t
            JOIN ticket_assignments ta 
                ON t.ticket_id = ta.ticket_id
            WHERE t.ticket_id = %s 
              AND ta.member_id = %s;
            """,
            (ticket_id, member_id)
        )

        result = cur.fetchone()

        if not result:
            raise Exception("Ticket is not assigned to this member")

        current_status = result[0]

        # Only Assigned tickets can be started
        if current_status != "Assigned":
            raise Exception("Only assigned tickets can be started")

        # Update ticket status → In Progress
        cur.execute(
            """
            UPDATE tickets
            SET status = 'In Progress'
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # Log status history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, "Assigned", "In Progress", member_id)
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)

def resolve_ticket(ticket_id: int, member_id: int, resolution_text: str):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Verify ticket assigned to this member and get status
        cur.execute(
            """
            SELECT t.status
            FROM tickets t
            JOIN ticket_assignments ta
              ON t.ticket_id = ta.ticket_id
            WHERE t.ticket_id = %s
              AND ta.member_id = %s;
            """,
            (ticket_id, member_id)
        )

        result = cur.fetchone()

        if not result:
            raise Exception("Ticket is not assigned to this member")

        current_status = result[0]

        # Only In Progress tickets can be resolved
        if current_status != "In Progress":
            raise Exception("Only In Progress tickets can be resolved")

        # nsert resolution document
        cur.execute(
            """
            INSERT INTO resolution_documents (ticket_id, content)
            VALUES (%s, %s)
            RETURNING resolution_id;
            """,
            (ticket_id, resolution_text)
        )

        resolution_id = cur.fetchone()[0]

        # Update ticket status → Resolved
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Resolved'
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
            (ticket_id, "In Progress", "Resolved", member_id)
        )

        conn.commit()

        return resolution_id

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)