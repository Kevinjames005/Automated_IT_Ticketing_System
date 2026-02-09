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

    if any(word in text for word in [
        "unauthorized", "breach", "hacked", "malware",
        "ransomware", "suspicious login", "compromised", "admin access"
    ]):
        return {"category": "security", "priority": "high", "source": "rule"}

    if any(word in text for word in [
        "server down", "system down", "service unavailable",
        "outage", "500 error", "cannot access"
    ]):
        return {"category": "infrastructure", "priority": "high", "source": "rule"}

    if any(word in text for word in [
        "network down", "vpn not connecting",
        "dns issue", "packet loss", "latency"
    ]):
        return {"category": "network", "priority": "high", "source": "rule"}

    if any(word in text for word in [
        "payment failed", "charged twice",
        "invoice missing", "billing error"
    ]):
        return {"category": "billing", "priority": "medium", "source": "rule"}

    if any(word in text for word in [
        "cannot login", "login failed",
        "password not working", "locked out"
    ]):
        return {"category": "login", "priority": "medium", "source": "rule"}

    if any(word in text for word in [
        "api not working", "sync failed",
        "third party", "webhook error"
    ]):
        return {"category": "integration", "priority": "low", "source": "rule"}

    if any(word in text for word in [
        "disk failure", "hardware issue",
        "printer not working", "overheating"
    ]):
        return {"category": "hardware", "priority": "medium", "source": "rule"}

    if any(word in text for word in [
        "bug", "error in app",
        "unexpected behavior", "crash"
    ]):
        return {"category": "bug", "priority": "low", "source": "rule"}

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
