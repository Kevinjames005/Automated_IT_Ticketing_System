from functools import wraps
from flask import request, jsonify
import os

API_KEY = os.getenv("API_KEY")

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_key = request.headers.get("X-API-KEY")
        if client_key != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function