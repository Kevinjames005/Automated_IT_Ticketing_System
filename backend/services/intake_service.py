import logging
from services.user_service import get_or_create_user
from services.email_service import create_email_request
from services.ai_service import store_ai_analysis
from services.ticket_service import create_ticket, get_category_id
from services.notification_service import notify_ticket_created, notify_auto_resolved
from ml.inference import predict
from ml.vector_search import semantic_search
from ml.rule_engine import rule_based_override
from db import get_conn, release_conn

logger = logging.getLogger(__name__)


def process_email(subject: str, body: str, sender_email: str, sender_name: str = None):
    """
    Orchestrates the entire intake pipeline.
    """

    logger.info("Processing incoming email | sender=%s | subject=%s", sender_email, subject)

    # 1️⃣ Get or create user
    user_id = get_or_create_user(sender_email, sender_name)
    logger.info("User resolved | user_id=%s | email=%s", user_id, sender_email)

    # 2️⃣ Duplicate check
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
        logger.warning(
            "Duplicate email detected | user_id=%s | email_id=%s | ticket_id=%s",
            user_id, existing[0], existing[1]
        )
        return {
            "duplicate":  True,
            "email_id":   existing[0],
            "ticket_id":  existing[1],
            "message":    "This email has already been processed."
        }

    # 3️⃣ Insert email
    email_id = create_email_request(user_id, subject, body)
    logger.info("Email request stored | email_id=%s", email_id)

    # 4️⃣ Rule-based override
    override = rule_based_override(subject, body)

    if override:
        category_name = override["category"]["value"]
        priority_value = override["priority"]["value"]
        confidence = override["priority"]["confidence"]

        logger.info(
            "Rule engine matched | email_id=%s | category=%s | priority=%s | confidence=%.2f",
            email_id, category_name, priority_value, confidence
        )

        category_id = get_category_id(category_name)

        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=False,
            predicted_category=category_name,
            predicted_priority=priority_value,
            confidence_score=confidence
        )

        ticket_id = create_ticket(email_id, category_id, priority_value)
        logger.info("Ticket created via rule engine | ticket_id=%s | email_id=%s", ticket_id, email_id)

        notify_ticket_created(
            to_email=sender_email,
            reporter_name=sender_name,
            ticket_id=ticket_id,
            subject=subject,
            category=category_name,
            priority=priority_value,
        )

        return {
            "ticket_created": True,
            "ticket_id": ticket_id,
            "source": "rule"
        }

    # 5️⃣ Semantic search (auto-resolve)
    vector_result = semantic_search(subject + " " + body)

    if vector_result.get("resolved"):
        logger.info(
            "Email auto-resolved via semantic search | email_id=%s | similarity=%.4f",
            email_id, vector_result["similarity"]
        )

        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=True,
            predicted_category=None,
            predicted_priority=None,
            confidence_score=vector_result["similarity"]
        )

        notify_auto_resolved(
            to_email=sender_email,
            reporter_name=sender_name,
            original_subject=subject,
            resolution_text=vector_result["content"],
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
    confidence = max(result["category"]["confidence"], result["priority"]["confidence"])

    logger.info(
        "ML model classified email | email_id=%s | category=%s | priority=%s | confidence=%.2f",
        email_id, category_name, priority_value, confidence
    )

    category_id = get_category_id(category_name)

    store_ai_analysis(
        email_id=email_id,
        is_user_solvable=False,
        predicted_category=category_name,
        predicted_priority=priority_value,
        confidence_score=confidence
    )

    ticket_id = create_ticket(email_id, category_id, priority_value)
    logger.info("Ticket created via ML model | ticket_id=%s | email_id=%s", ticket_id, email_id)

    notify_ticket_created(
        to_email=sender_email,
        reporter_name=sender_name,
        ticket_id=ticket_id,
        subject=subject,
        category=category_name,
        priority=priority_value,
    )

    return {
        "ticket_created": True,
        "ticket_id": ticket_id,
        "source": "model",
        "category": category_name,
        "priority": priority_value
    }