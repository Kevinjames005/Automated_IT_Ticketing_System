import os
import requests
from functools import wraps
from flask import request, jsonify

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")  # 👈 needed for Supabase API calls


def verify_token(token):
    """
    Calls Supabase /auth/v1/user with the user's JWT.
    Supabase requires both the Authorization header AND the apikey header.
    """
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,  # 👈 this was missing — Supabase rejects without it
            }
        )

        if response.status_code != 200:
            raise Exception(f"Token invalid: {response.text}")

        return response.json()

    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


def require_auth(f):
    """
    Decorator to protect Flask routes.
    Expects: Authorization: Bearer <supabase_access_token>
    Attaches the verified user data to request.user
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
            user_data = verify_token(token)
            request.user = user_data  # accessible inside the route as request.user

        except Exception as e:
            return jsonify({"error": str(e)}), 401

        return f(*args, **kwargs)

    return decorated