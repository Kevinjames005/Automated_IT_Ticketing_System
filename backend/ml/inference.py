import logging
import joblib
import os
import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# ── Load models at startup ────────────────────────────────────────────────────
try:
    logger.info("Loading priority model pipeline")
    priority_pipeline = joblib.load(
        os.path.join(BASE_DIR, "model", "priority_pipeline.pkl")
    )
    priority_encoder = joblib.load(
        os.path.join(BASE_DIR, "model", "priority_encoder.pkl")
    )
    logger.info("Priority model loaded successfully")
except Exception as e:
    logger.error("Failed to load priority model | error=%s", e)
    raise

try:
    logger.info("Loading category model pipeline")
    category_pipeline = joblib.load(
        os.path.join(BASE_DIR, "model", "category_pipeline.pkl")
    )
    category_encoder = joblib.load(
        os.path.join(BASE_DIR, "model", "category_encoder.pkl")
    )
    logger.info("Category model loaded successfully")
except Exception as e:
    logger.error("Failed to load category model | error=%s", e)
    raise
# ─────────────────────────────────────────────────────────────────────────────


def predict(subject: str, body: str):
    try:
        text = subject + " " + body

        priority_encoded = priority_pipeline.predict([text])[0]
        priority_probs   = priority_pipeline.predict_proba([text])[0]
        priority_confidence = float(np.max(priority_probs))
        priority = priority_encoder.inverse_transform([priority_encoded])[0]

        category_encoded = category_pipeline.predict([text])[0]
        category_probs   = category_pipeline.predict_proba([text])[0]
        category_confidence = float(np.max(category_probs))
        category = category_encoder.inverse_transform([category_encoded])[0]

        logger.info(
            "ML prediction complete | category=%s (%.2f) | priority=%s (%.2f)",
            category, category_confidence, priority, priority_confidence
        )

        return {
            "priority": {
                "value": priority,
                "confidence": round(priority_confidence, 3)
            },
            "category": {
                "value": category,
                "confidence": round(category_confidence, 3)
            }
        }

    except Exception as e:
        logger.error("ML prediction failed | subject=%s | error=%s", subject, e)
        raise