from flask import Flask,request,jsonify
from ml.inference import predict


app = Flask(__name__)

@app.route("/classify",methods=["POST"])

def classify():
    data = request.get_json()
    if not data or "subject" not in data or "body" not in data:
        return {"error": "Invalid input"}, 400
    result = predict(data["subject"], data["body"])
    return jsonify(result),200

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=8000)
