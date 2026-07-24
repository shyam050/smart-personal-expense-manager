"""
Categorization microservice — Flask REST API wrapping the hybrid NLP model.

Runs independently on port 5000. Called by the Spring Boot backend when a
user types a merchant name into the transaction form.

Endpoints:
  POST /predict         — predict category for a single merchant name
  POST /predict/batch   — predict categories for multiple names at once
  GET  /health          — health check
  GET  /categories      — list all supported categories
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from model import load_model, predict, build_and_train
from training_data import TRAINING_DATA

app = Flask(__name__)
CORS(app, origins=os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:4200").split(","))

# Load model once at startup — not on every request
_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


@app.before_request
def warmup():
    """Pre-load model on first request so subsequent calls are fast."""
    get_model()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "UP", "service": "categorization-service"}), 200


@app.route("/categories", methods=["GET"])
def categories():
    cats = sorted(set(c for _, c in TRAINING_DATA))
    return jsonify({"categories": cats}), 200


@app.route("/predict", methods=["POST"])
def predict_category():
    """
    Predict the category for a single merchant name.

    Request:  { "merchant": "Zomato" }
    Response: {
        "merchant": "Zomato",
        "category": "Food",
        "confidence": 1.0,
        "method": "keyword",   // "keyword" or "ml"
        "all_scores": { "Food": 1.0, ... }
    }
    """
    body = request.get_json(silent=True)
    if not body or "merchant" not in body:
        return jsonify({"error": "Request body must contain 'merchant' field"}), 400

    merchant = str(body["merchant"]).strip()
    if not merchant:
        return jsonify({"error": "merchant cannot be empty"}), 400

    result = predict(merchant, get_model())
    return jsonify({"merchant": merchant, **result}), 200


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    """
    Predict categories for multiple merchant names.

    Request:  { "merchants": ["Zomato", "Uber", "Netflix"] }
    Response: { "results": [ { "merchant": "Zomato", "category": "Food", ... }, ... ] }
    """
    body = request.get_json(silent=True)
    if not body or "merchants" not in body:
        return jsonify({"error": "Request body must contain 'merchants' array"}), 400

    merchants = body["merchants"]
    if not isinstance(merchants, list):
        return jsonify({"error": "'merchants' must be an array"}), 400
    if len(merchants) > 50:
        return jsonify({"error": "Maximum 50 merchants per batch"}), 400

    model = get_model()
    results = []
    for merchant in merchants:
        merchant_str = str(merchant).strip()
        result = predict(merchant_str, model)
        results.append({"merchant": merchant_str, **result})

    return jsonify({"results": results}), 200


if __name__ == "__main__":
    print("Starting categorization microservice on port 5000...")
    print("Loading model...")
    get_model()
    print("Model ready. Starting server...")
    app.run(host="0.0.0.0", port=5000, debug=False)
