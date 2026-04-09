import os
import logging
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

from routes.intake_routes import intake_bp
from routes.ticket_routes import ticket_bp
from routes.assignment_routes import assignment_bp
from routes.member_routes import member_bp
from routes.approval_routes import approval_bp
from routes.analytics_routes import analytics_bp
from routes.auth_routes import auth_bp

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
CORS(app, resources={r"/*": {
    "origins":             [o.strip() for o in allowed],
    "methods":             ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers":       ["Content-Type", "Authorization"],
    "supports_credentials": True,
}})

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(intake_bp)
app.register_blueprint(ticket_bp)
app.register_blueprint(assignment_bp)
app.register_blueprint(member_bp)
app.register_blueprint(approval_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(auth_bp)

# ── Error handler ─────────────────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("Unhandled exception occurred")
    return jsonify({"error": "Internal Server Error"}), 500


if __name__ == "__main__":
    logger.info("Starting IT Ticketing System backend on port 8000")
    app.run(host="0.0.0.0", port=8000, debug=os.getenv("FLASK_ENV") == "development")