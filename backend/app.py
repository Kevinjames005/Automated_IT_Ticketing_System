import os
from flask import Flask,request,jsonify
from dotenv import load_dotenv
from services.assignment_service import assign_ticket
from services.member_service import start_ticket , resolve_ticket
from services.approval_service import approve_resolution, reject_resolution
from services.intake_service import process_email
from security.auth import require_api_key
from services.query_service import get_tickets

load_dotenv()


app = Flask(__name__)

@require_api_key

@app.route("/classify", methods=["POST"])
def classify():

    data = request.get_json()

    if not data or "subject" not in data or "body" not in data or "sender_email" not in data:
        return jsonify({"error": "Invalid input"}), 400

    result = process_email(
        subject=data["subject"],
        body=data["body"],
        sender_email=data["sender_email"],
        sender_name=data.get("sender_name")
    )

    return jsonify(result), 200


@app.route("/assign-ticket", methods=["POST"])
@require_api_key
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
@require_api_key
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
@require_api_key
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
@require_api_key
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
@require_api_key
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
    
@app.route("/tickets", methods=["GET"])
def get_tickets_endpoint():
    try:
        status = request.args.get("status")
        priority = request.args.get("priority")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))

        data = get_tickets(
            status=status,
            priority=priority,
            page=page,
            limit=limit
        )

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)
