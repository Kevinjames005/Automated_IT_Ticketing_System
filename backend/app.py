import os
from flask import Flask,request,jsonify
from ml.inference import predict
from dotenv import load_dotenv
from ml.vector_search import semantic_search
from services.ticket_service import create_ticket , get_category_id
from services.ai_service import store_ai_analysis
from services.user_service import get_or_create_user
from services.email_service import create_email_request
from services.assignment_service import assign_ticket
from services.member_service import start_ticket , resolve_ticket
from services.approval_service import approve_resolution, reject_resolution


load_dotenv()


app = Flask(__name__)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY not set in environment")

def rule_based_override(subject, body):
    text = f"{subject} {body}".lower()

    def build_response(category, priority, confidence):
        return {
            "category": {
                "value": category,
                "confidence": confidence
            },
            "priority": {
                "value": priority,
                "confidence": confidence
            },
            "source": "rule"
        }

    if any(word in text for word in [
        "unauthorized", "breach", "hacked", "malware",
        "ransomware", "suspicious login", "compromised", "admin access"
    ]):
        return build_response("security", "high", 0.98)

    if any(word in text for word in [
        "server down", "system down", "service unavailable",
        "outage", "500 error", "cannot access"
    ]):
        return build_response("infrastructure", "high", 0.95)

    if any(word in text for word in [
        "network down","dns issue", "packet loss", "latency"
    ]):
        return build_response("network", "high", 0.93)

    if any(word in text for word in [
        "payment failed", "charged twice",
        "invoice missing", "billing error"
    ]):
        return build_response("billing", "medium", 0.85)

    if any(word in text for word in [
        "cannot login", "login failed",
        "password not working", "locked out"
    ]):
        return build_response("login", "medium", 0.85)

    if any(word in text for word in [
        "api not working", "sync failed",
        "third party", "webhook error"
    ]):
        return build_response("integration", "low", 0.80)

    if any(word in text for word in [
        "disk failure", "hardware issue",
        "printer not working", "overheating"
    ]):
        return build_response("hardware", "medium", 0.80)

    if any(word in text for word in [
        "bug", "error in app",
        "unexpected behavior", "crash"
    ]):
        return build_response("bug", "low", 0.75)

    return None



@app.route("/classify", methods=["POST"])
def classify():

    client_key = request.headers.get("X-API-KEY")
    if client_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()

    if not data or "subject" not in data or "body" not in data or "sender_email" not in data:
        return jsonify({"error": "Invalid input"}), 400

    subject = data["subject"]
    body = data["body"]
    sender_email = data["sender_email"]
    sender_name = data.get("sender_name")

    # Get or Create User
    user_id = get_or_create_user(sender_email, sender_name)

    # Insert Email
    email_id = create_email_request(user_id, subject, body)

    # RULE-BASED CHECK
    override = rule_based_override(subject, body)

    if override:
        category_name = override["category"]["value"]
        priority = override["priority"]["value"]
        confidence = override["priority"]["confidence"]

        # Store AI analysis
        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=False,
            predicted_category=category_name,
            predicted_priority=priority,
            confidence_score=confidence
        )

        # Create Ticket
        category_id = get_category_id(category_name)
        ticket_id = create_ticket(email_id, category_id, priority)

        return jsonify({
            "ticket_created": True,
            "ticket_id": ticket_id,
            "source": "rule"
        }), 200


    # SEMANTIC SEARCH (AUTO RESOLVE)
    vector_result = semantic_search(subject + " " + body)

    if vector_result["resolved"]:
        store_ai_analysis(
            email_id=email_id,
            is_user_solvable=True,
            predicted_category=None,
            predicted_priority=None,
            confidence_score=vector_result["similarity"]
        )

        return jsonify({
            "auto_resolved": True,
            "resolution": vector_result["content"],
            "similarity": vector_result["similarity"]
        }), 200


    # ML CLASSIFICATION
    result = predict(subject, body)

    category_name = result["category"]["value"]
    priority = result["priority"]["value"]
    confidence = max(
        result["category"]["confidence"],
        result["priority"]["confidence"]
    )

    # Store AI analysis
    store_ai_analysis(
        email_id=email_id,
        is_user_solvable=False,
        predicted_category=category_name,
        predicted_priority=priority,
        confidence_score=confidence
    )

    # Create Ticket
    category_id = get_category_id(category_name)
    ticket_id = create_ticket(email_id, category_id, priority)

    return jsonify({
        "ticket_created": True,
        "ticket_id": ticket_id,
        "source": "model",
        "priority": priority,
        "category": category_name
    }), 200


@app.route("/assign-ticket", methods=["POST"])
def assign_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data or "lead_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        assign_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
            lead_id=data["lead_id"]
        )

        return {"message": "Ticket assigned successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/start-ticket", methods=["POST"])
def start_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        start_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"]
        )

        return {"message": "Ticket started successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/resolve-ticket", methods=["POST"])
def resolve_ticket_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "member_id" not in data or "resolution_text" not in data:
        return {"error": "Invalid input"}, 400

    try:
        resolution_id = resolve_ticket(
            ticket_id=data["ticket_id"],
            member_id=data["member_id"],
            resolution_text=data["resolution_text"]
        )

        return {
            "message": "Ticket resolved successfully",
            "resolution_id": resolution_id
        }, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/approve-resolution", methods=["POST"])
def approve_resolution_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "lead_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        approve_resolution(
            ticket_id=data["ticket_id"],
            lead_id=data["lead_id"],
            add_to_kb=data.get("add_to_kb", False)
        )

        return {"message": "Ticket approved successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
@app.route("/reject-resolution", methods=["POST"])
def reject_resolution_endpoint():

    data = request.get_json()

    if not data or "ticket_id" not in data or "lead_id" not in data:
        return {"error": "Invalid input"}, 400

    try:
        reject_resolution(
            ticket_id=data["ticket_id"],
            lead_id=data["lead_id"]
        )

        return {"message": "Resolution rejected. Ticket reassigned."}, 200

    except Exception as e:
        return {"error": str(e)}, 400
    
if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)
