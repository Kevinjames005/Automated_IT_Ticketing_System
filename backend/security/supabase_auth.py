import logging
import os
import requests
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


def verify_token(token: str):
    """
    Calls Supabase /auth/v1/user with the user's JWT.
    Supabase requires both the Authorization header AND the apikey header.
    """
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            }
        )

        if response.status_code != 200:
            logger.warning(
                "Token verification failed | status=%s | reason=%s",
                response.status_code, response.text
            )
            raise Exception(f"Token invalid: {response.text}")

        user_data = response.json()
        logger.info("Token verified successfully | user_id=%s", user_data.get("id"))
        return user_data

    except Exception as e:
        logger.error("Token verification error | error=%s", e)
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
            logger.warning(
                "Missing or malformed Authorization header | path=%s",
                request.path
            )
            return jsonify({"error": "Missing or malformed Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
            user_data = verify_token(token)
            request.user = user_data

        except Exception as e:
            logger.error("Auth failed | path=%s | error=%s", request.path, e)
            return jsonify({"error": str(e)}), 401

        return f(*args, **kwargs)

    return decorated