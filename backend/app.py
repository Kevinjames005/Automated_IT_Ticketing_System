import os
from flask import Flask,request,jsonify
from ml.inference import predict


app = Flask(__name__)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY not set in environment")

@app.route("/classify",methods=["POST"])

def classify():
    client_key = request.headers.get("X-API-KEY")

    if client_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or "subject" not in data or "body" not in data:
        return {"error": "Invalid input"}, 400
    result = predict(data["subject"], data["body"])
    return jsonify(result),200

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)
