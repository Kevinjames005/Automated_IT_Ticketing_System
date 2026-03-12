from services.user_service import get_or_create_user
from services.email_service import create_email_request
from services.ai_service import store_ai_analysis
from services.ticket_service import create_ticket, get_category_id
from ml.inference import predict
from ml.vector_search import semantic_search
from ml.rule_engine import rule_based_override
from db import get_conn, release_conn


def process_email(subject: str, body: str, sender_email: str, sender_name: str = None):
    """
    Orchestrates the entire intake pipeline.
    """

    # 1️⃣ Get or create user
    user_id = get_or_create_user(sender_email, sender_name)

    # 2⃣ Duplicate check — if this exact email was already processed, return early
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT er.email_id, t.ticket_id
        FROM email_requests er
        JOIN tickets t ON t.email_id = er.email_id
        WHERE er.user_id = %s
          AND er.subject  = %s
          AND er.body     = %s
        LIMIT 1;
    """, (user_id, subject, body))
    existing = cur.fetchone()
    cur.close()
    release_conn(conn)

    if existing:
        return {
            "duplicate":  True,
            "email_id":   existing[0],
            "ticket_id":  existing[1],
            "message":    "This email has already been processed."
        }

    # 3️⃣ Insert email
    email_id = create_email_request(user_id, subject, body)

    # 4️⃣ Rule-based override
    override = rule_based_override(subject, body)

    if override:
        category_name = override["category"]["value"]
        priority_value = override["priority"]["value"]
        confidence = override["priority"]["confidence"]

        category_id = get_category_id(category_name)

        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=False,
            predicted_category=category_name,
            predicted_priority=priority_value,
            confidence_score=confidence
        )

        ticket_id = create_ticket(email_id, category_id, priority_value)

        return {
            "ticket_created": True,
            "ticket_id": ticket_id,
            "source": "rule"
        }

    # 5️⃣ Semantic search (auto-resolve)
    vector_result = semantic_search(subject + " " + body)

    if vector_result.get("resolved"):
        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=True,
            predicted_category=None,
            predicted_priority=None,
            confidence_score=vector_result["similarity"]
        )

        return {
            "auto_resolved": True,
            "resolution": vector_result["content"],
            "similarity": vector_result["similarity"]
        }

    # 6️⃣ ML classification
    result = predict(subject, body)

    category_name = result["category"]["value"]
    priority_value = result["priority"]["value"]

    category_id = get_category_id(category_name)

    store_ai_analysis(
        email_id=email_id,
        is_user_solvable=False,
        predicted_category=category_name,
        predicted_priority=priority_value,
        confidence_score=max(
            result["category"]["confidence"],
            result["priority"]["confidence"]
        )
    )

    ticket_id = create_ticket(email_id, category_id, priority_value)

    return {
        "ticket_created": True,
        "ticket_id": ticket_id,
        "source": "model",
        "category": category_name,
        "priority": priority_value
    }