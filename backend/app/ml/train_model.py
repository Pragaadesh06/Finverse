"""
Finverse Real Machine Learning Anomaly Detection Model Training Script
Trains an Isolation Forest model on multi-dimensional transaction features:
- Log amount
- Amount-to-median ratio
- Payment channel risk
- Time of day & nocturnal transaction flags
- International / High-risk jurisdiction flags
- Structuring / round amount indicators
"""
import os
import json
import joblib
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest_model.joblib")
META_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

FEATURE_NAMES = [
    "amount_log",
    "amount_to_median_ratio",
    "channel_risk",
    "hour_of_day",
    "is_night_txn",
    "is_foreign_country",
    "is_high_risk_country",
    "is_round_amount",
]

CHANNEL_RISK_MAP = {
    "CRYPTO_GATEWAY": 3.0,
    "HAWALA": 3.0,
    "ANONYMOUS_PREPAID": 2.5,
    "OFFSHORE_WIRE": 2.5,
    "SWIFT": 1.8,
    "WIRE": 1.0,
    "UPI": 0.8,
    "CARD": 0.7,
    "ACH": 0.5,
}

HIGH_RISK_COUNTRIES = {"PRK", "IRN", "MMR", "PAN", "CYP", "VUT"}

def extract_feature_vector(tx: dict) -> list[float]:
    amount = float(tx.get("amount", 0.0))
    amount_log = float(np.log1p(max(0.0, amount)))
    amount_to_median = float(amount / 50000.0)

    channel = str(tx.get("channel", "WIRE")).upper().strip()
    channel_risk = CHANNEL_RISK_MAP.get(channel, 1.0)

    raw_ts = tx.get("timestamp")
    hour = 14
    if isinstance(raw_ts, datetime):
        hour = raw_ts.hour
    elif isinstance(raw_ts, str) and raw_ts:
        try:
            hour = datetime.fromisoformat(raw_ts.replace("Z", "+00:00")).hour
        except Exception:
            hour = 14

    is_night = 1.0 if hour in (0, 1, 2, 3, 4, 5) else 0.0
    country = str(tx.get("ip_country", "IN")).upper().strip()
    is_foreign = 1.0 if country != "IN" else 0.0
    is_high_risk = 1.0 if country in HIGH_RISK_COUNTRIES else 0.0
    is_round = 1.0 if (amount >= 10000 and amount % 10000 == 0) else 0.0

    return [
        amount_log,
        amount_to_median,
        channel_risk,
        float(hour),
        is_night,
        is_foreign,
        is_high_risk,
        is_round,
    ]

def generate_training_data(n_samples: int = 5000, contamination: float = 0.08) -> np.ndarray:
    np.random.seed(42)
    features = []

    # 1. Normal retail & corporate transfers (92%)
    n_normal = int(n_samples * (1.0 - contamination))
    for _ in range(n_normal):
        # Log-normal distribution around ₹25,000
        amt = float(np.random.lognormal(mean=9.8, sigma=1.2))
        amt = max(50.0, min(amt, 800000.0))
        ch = np.random.choice(["WIRE", "UPI", "CARD", "ACH"], p=[0.4, 0.4, 0.1, 0.1])
        hr = int(np.random.choice(range(6, 23)))
        country = "IN"
        features.append(extract_feature_vector({
            "amount": amt,
            "channel": ch,
            "timestamp": datetime(2026, 1, 1, hr, 0, tzinfo=timezone.utc),
            "ip_country": country,
        }))

    # 2. Anomalous / suspicious transfers (8%)
    n_anom = n_samples - n_normal
    for _ in range(n_anom):
        scenario = np.random.choice(["outlier_amt", "crypto_nocturnal", "smurfing", "offshore"])
        if scenario == "outlier_amt":
            amt = float(np.random.uniform(1500000.0, 9500000.0))
            ch = np.random.choice(["SWIFT", "OFFSHORE_WIRE", "WIRE"])
            hr = int(np.random.choice(range(0, 24)))
            country = np.random.choice(["IN", "CYP", "PAN"])
        elif scenario == "crypto_nocturnal":
            amt = float(np.random.uniform(200000.0, 980000.0))
            ch = "CRYPTO_GATEWAY"
            hr = int(np.random.choice([1, 2, 3, 4]))
            country = np.random.choice(["CYP", "PAN", "IN"])
        elif scenario == "smurfing":
            amt = float(np.random.choice([985000.0, 990000.0, 995000.0]))
            ch = "WIRE"
            hr = int(np.random.choice(range(8, 20)))
            country = "IN"
        else: # offshore
            amt = float(np.random.uniform(500000.0, 3000000.0))
            ch = "OFFSHORE_WIRE"
            hr = int(np.random.choice(range(0, 24)))
            country = np.random.choice(["PAN", "PRK", "IRN"])

        features.append(extract_feature_vector({
            "amount": amt,
            "channel": ch,
            "timestamp": datetime(2026, 1, 1, hr, 0, tzinfo=timezone.utc),
            "ip_country": country,
        }))

    return np.array(features)

def train_and_save():
    print("[ML] Generating representative transaction feature space...")
    X = generate_training_data(n_samples=5000, contamination=0.08)

    print("[ML] Fitting Isolation Forest (n_estimators=100, contamination=0.08)...")
    clf = IsolationForest(
        n_estimators=100,
        contamination=0.08,
        random_state=42,
        max_samples="auto",
        n_jobs=-1,
    )
    clf.fit(X)

    # Evaluate on training distribution
    preds = clf.predict(X)
    scores = clf.decision_function(X)
    anom_pct = float(np.mean(preds == -1) * 100)
    print(f"[ML] Model fitted. Detected anomaly rate: {anom_pct:.2f}% (Target: 8.00%)")

    # Persist model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    print(f"[ML] Saved model artifact to {MODEL_PATH}")

    # Metadata
    metadata = {
        "model_name": "Isolation Forest Unsupervised Anomaly Detector",
        "model_version": "Finverse-IsoForest-v1.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_estimators": 100,
        "contamination": 0.08,
        "features": FEATURE_NAMES,
        "train_samples": len(X),
        "score_offset": float(clf.offset_),
        "min_decision_score": float(np.min(scores)),
        "max_decision_score": float(np.max(scores)),
        "median_decision_score": float(np.median(scores)),
    }
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[ML] Wrote metadata to {META_PATH}")

if __name__ == "__main__":
    train_and_save()
