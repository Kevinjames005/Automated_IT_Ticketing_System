import joblib
import os
import numpy as np


BASE_DIR = os.path.dirname(os.path.dirname(__file__))

priority_pipeline = joblib.load(
    os.path.join(BASE_DIR, "model", "priority_pipeline.pkl")
)
priority_encoder = joblib.load(
    os.path.join(BASE_DIR, "model", "priority_encoder.pkl")
)

category_pipeline = joblib.load(
    os.path.join(BASE_DIR, "model", "category_pipeline.pkl")
)
category_encoder = joblib.load(
    os.path.join(BASE_DIR, "model", "category_encoder.pkl")
)

def predict(subject: str, body: str):
    text = subject + " " + body

    priority_encoded = priority_pipeline.predict([text])[0]
    priority_probs = priority_pipeline.predict_proba([text])[0]
    priority_confidence = float(np.max(priority_probs))

    priority = priority_encoder.inverse_transform(
        [priority_encoded]
    )[0]

    
    category_encoded = category_pipeline.predict([text])[0]
    category_probs = category_pipeline.predict_proba([text])[0]
    category_confidence = float(np.max(category_probs))

    category = category_encoder.inverse_transform(
        [category_encoded]
    )[0]

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
