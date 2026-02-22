from db import get_conn, release_conn
from db import get_conn, release_conn
from ml.embeddings import get_embedding

def approve_resolution(ticket_id: int, lead_id: int, add_to_kb: bool):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # 1️⃣ Check ticket status
        cur.execute(
            "SELECT status FROM tickets WHERE ticket_id = %s;",
            (ticket_id,)
        )

        result = cur.fetchone()

        if not result:
            raise Exception("Ticket not found")

        current_status = result[0]

        if current_status != "Resolved":
            raise Exception("Only resolved tickets can be approved")

        # 2️⃣ Update ticket → Closed
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Closed'
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # 3️⃣ Get resolution content
        cur.execute(
            """
            SELECT resolution_id, content
            FROM resolution_documents
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        resolution = cur.fetchone()

        if not resolution:
            raise Exception("Resolution document not found")

        resolution_id, content = resolution

        # 4️⃣ Update resolution → approved_by
        cur.execute(
            """
            UPDATE resolution_documents
            SET approved_by = %s
            WHERE resolution_id = %s;
            """,
            (lead_id, resolution_id)
        )

        # 5️⃣ If Lead chooses to add to Knowledge Base
        if add_to_kb:

            # Generate embedding
            embedding = get_embedding(content)

            # Insert into knowledge_base_articles
            cur.execute(
                """
                INSERT INTO knowledge_base_articles
                (title, content, source_resolution_id, embedding)
                VALUES (%s, %s, %s, %s);
                """,
                (
                    f"Resolution for Ticket {ticket_id}",
                    content,
                    resolution_id,
                    embedding
                )
            )

        # 6️⃣ Insert status history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, "Resolved", "Closed", lead_id)
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)

def reject_resolution(ticket_id: int, lead_id: int):

    conn = get_conn()
    cur = conn.cursor()

    try:
        # 1️⃣ Check ticket status
        cur.execute(
            "SELECT status FROM tickets WHERE ticket_id = %s;",
            (ticket_id,)
        )

        result = cur.fetchone()

        if not result:
            raise Exception("Ticket not found")

        current_status = result[0]

        if current_status != "Resolved":
            raise Exception("Only resolved tickets can be rejected")

        # 2️⃣ Update ticket back to Assigned
        cur.execute(
            """
            UPDATE tickets
            SET status = 'Assigned'
            WHERE ticket_id = %s;
            """,
            (ticket_id,)
        )

        # 3️⃣ Log history
        cur.execute(
            """
            INSERT INTO ticket_status_history
            (ticket_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s);
            """,
            (ticket_id, "Resolved", "Assigned", lead_id)
        )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        release_conn(conn)