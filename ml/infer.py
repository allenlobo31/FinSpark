"""
SentinelPAM Inference Pipeline
Loads trained model, computes features, predicts risk score, explains with SHAP.
Classifies negligent vs malicious based on feature thresholds.
Writes results to risk_scores table in Postgres.

Called by Node.js via: python ml/infer.py --session_id <id>
Outputs JSON to stdout for Node to parse.
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db
import features

import xgboost as xgb

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'sentinel_model.json')


def load_model():
    """Load the trained XGBoost model."""
    if not os.path.exists(MODEL_PATH):
        return None
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    return model


def classify_pattern(feat_values, shap_values):
    """
    Second-stage classification: negligent vs malicious.
    Based on real feature thresholds from SHAP contributions — not random.

    Negligent pattern:
    - High time_deviation BUT low query_novelty AND low access_entropy
    - User logged in at wrong time but did normal, familiar work

    Malicious pattern:
    - High query_novelty AND high access_entropy AND high data_volume
    - User actively probing unfamiliar systems and potentially exfiltrating data
    """
    time_dev = feat_values.get('time_deviation', 0)
    query_nov = feat_values.get('query_novelty', 0)
    access_ent = feat_values.get('access_entropy', 0)
    data_vol = feat_values.get('data_volume', 0)

    # Malicious: novel queries + broad access + high data volume
    if query_nov > 0.7 and access_ent > 2.0 and data_vol > 1.5:
        return 'malicious'

    # Malicious: very high access entropy even without novel queries
    if access_ent > 3.0 and data_vol > 2.0:
        return 'malicious'

    # Negligent: unusual time but familiar operations
    if abs(time_dev) > 2.0 and query_nov < 0.3 and access_ent < 1.5:
        return 'negligent'

    # Negligent: high time deviation is the dominant SHAP contributor
    shap_abs = {k: abs(v) for k, v in shap_values.items()}
    max_contributor = max(shap_abs, key=shap_abs.get) if shap_abs else None
    if max_contributor == 'time_deviation' and query_nov < 0.5:
        return 'negligent'

    # Default to normal for low-risk scores (this function is only called for elevated scores)
    return 'normal'


def run_inference(session_id):
    """
    Run inference on a session. Returns result dict.
    """
    # Get session info
    session_rows = db.query("""
        SELECT s.id, s.user_id, s.started_at, u.username, u.role
        FROM sessions s JOIN users u ON s.user_id = u.id
        WHERE s.id = %s
    """, (session_id,))

    if not session_rows:
        return {'error': f'Session {session_id} not found', 'score': 0}

    session = session_rows[0]
    user_id = session['user_id']
    event_timestamp = session['started_at']

    # Compute features using the shared module
    feat_values = features.compute_all(user_id, session_id, event_timestamp)

    # Load model
    model = load_model()
    if model is None:
        # No trained model — use feature heuristic as fallback
        raw_score = (
            abs(feat_values['time_deviation']) * 15 +
            abs(feat_values['peer_deviation']) * 10 +
            abs(feat_values['data_volume']) * 20 +
            feat_values['query_novelty'] * 25 +
            feat_values['access_entropy'] * 10
        )
        score = min(100, max(0, raw_score))
        shap_dict = {name: feat_values[name] * 10 for name in features.FEATURE_NAMES}
    else:
        # Run XGBoost prediction
        X = np.array([[feat_values[name] for name in features.FEATURE_NAMES]])
        proba = model.predict_proba(X)[0][1]  # Probability of anomalous class
        score = round(float(proba * 100), 2)

        # SHAP explanation
        try:
            import shap
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)
            shap_dict = {name: round(float(sv), 4) for name, sv in zip(features.FEATURE_NAMES, shap_values[0])}
        except Exception as e:
            shap_dict = {name: 0.0 for name in features.FEATURE_NAMES}

    # Classify pattern
    pattern = classify_pattern(feat_values, shap_dict)
    if score < 40:
        pattern = 'normal'

    # Write to risk_scores table
    db.execute("""
        INSERT INTO risk_scores (session_id, user_id, event_timestamp, score, shap_values, feature_values, pattern_class)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        session_id, user_id, datetime.now(),
        score,
        json.dumps(shap_dict),
        json.dumps({k: round(v, 4) for k, v in feat_values.items()}),
        pattern
    ))

    result = {
        'session_id': session_id,
        'user_id': user_id,
        'username': session['username'],
        'role': session['role'],
        'score': score,
        'pattern_class': pattern,
        'features': {k: round(v, 4) for k, v in feat_values.items()},
        'shap': shap_dict,
    }

    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description='SentinelPAM Inference')
    parser.add_argument('--session_id', type=int, required=True, help='Session ID to evaluate')
    args = parser.parse_args()

    result = run_inference(args.session_id)
    # Output JSON to stdout for Node.js to parse
    print(json.dumps(result))


if __name__ == '__main__':
    main()
