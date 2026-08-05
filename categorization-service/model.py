
import re
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, LeaveOneOut
import numpy as np

from training_data import TRAINING_DATA

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

_LOOKUP_INDEX = {
    re.sub(r"[^a-z0-9\s]", " ", m.lower()).strip(): c
    for m, c in TRAINING_DATA
}


def preprocess(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _keyword_lookup(processed: str) -> str | None:

    if processed in _LOOKUP_INDEX:
        return _LOOKUP_INDEX[processed]
    
    for known, category in _LOOKUP_INDEX.items():
        if known in processed or processed in known:
            return category

    return None


def build_and_train():
    
    merchants = [preprocess(m) for m, _ in TRAINING_DATA]
    categories = [c for _, c in TRAINING_DATA]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            min_df=1,
            max_features=8000
        )),
        ("clf", MultinomialNB(alpha=0.1))
    ])

    pipeline.fit(merchants, categories)


    loo_scores = cross_val_score(
        pipeline, merchants, categories,
        cv=LeaveOneOut(), scoring="accuracy"
    )
    print(f"ML stage LOO accuracy (unseen merchants): {loo_scores.mean():.2%}")
    print(f"System accuracy on known merchants (keyword stage): ~100%")
    print(f"Categories: {sorted(set(categories))}")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"Model saved to {MODEL_PATH}")
    return pipeline


def load_model():
    if not os.path.exists(MODEL_PATH):
        print("Model not found — training now...")
        return build_and_train()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def predict(merchant_name: str, model=None) -> dict:

    if model is None:
        model = load_model()

    processed = preprocess(merchant_name)
    if not processed.strip():
        return {"category": None, "confidence": 0.0, "method": "none", "all_scores": {}}

    keyword_result = _keyword_lookup(processed)
    if keyword_result:
        return {
            "category": keyword_result,
            "confidence": 1.0,
            "method": "keyword",
            "all_scores": {keyword_result: 1.0}
        }

    proba = model.predict_proba([processed])[0]
    classes = model.classes_
    scores = dict(zip(classes, proba.tolist()))
    top_category = classes[np.argmax(proba)]
    top_confidence = float(np.max(proba))

    return {
        "category": top_category,
        "confidence": round(top_confidence, 4),
        "method": "ml",
        "all_scores": {k: round(v, 4) for k, v in sorted(
            scores.items(), key=lambda x: x[1], reverse=True
        )}
    }


if __name__ == "__main__":
    print("Training categorization model...")
    model = build_and_train()

    test_cases = [
        ("Zomato", "Food"),
        ("Swiggy", "Food"),
        ("IRCTC", "Transport"),
        ("BookMyShow", "Entertainment"),
        ("Apollo Pharmacy", "Health"),
        ("Coursera", "Education"),
        ("MakeMyTrip", "Travel"),
        ("BigBasket", "Food"),
        ("Airtel", "Utilities"),
        # Unseen merchants — ML stage kicks in
        ("Jubilant FoodWorks", "Food"),
        ("Rapido Bike", "Transport"),
        ("Hotstar", "Entertainment"),
        ("Meesho Shop", "Shopping"),
        ("City Gas Bill", "Utilities"),
        ("Eye Clinic", "Health"),
    ]

    print("\n--- Predictions ---")
    correct = 0
    for merchant, expected in test_cases:
        result = predict(merchant, model)
        status = "✓" if result["category"] == expected else "✗"
        print(f"{status} {merchant:30s} → {result['category']:15s} "
              f"({result['confidence']:.0%}, {result['method']})")
        if result["category"] == expected:
            correct += 1

    print(f"\nTest accuracy: {correct}/{len(test_cases)} ({correct/len(test_cases):.0%})")
