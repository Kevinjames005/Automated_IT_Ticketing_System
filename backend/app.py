import os
from flask import Flask,request,jsonify
from ml.inference import predict
from dotenv import load_dotenv

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
        "network down", "vpn not connecting",
        "dns issue", "packet loss", "latency"
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



@app.route("/classify",methods=["POST"])

def classify():
    client_key = request.headers.get("X-API-KEY")

    if client_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or "subject" not in data or "body" not in data:
        return {"error": "Invalid input"}, 400
    
    override = rule_based_override(data["subject"], data["body"])
    if override:
        return jsonify(override), 200
    
    result = predict(data["subject"], data["body"])
    result["source"] = "model"

    return jsonify(result),200

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)
