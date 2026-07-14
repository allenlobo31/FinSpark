"""
XGBoost Training Pipeline
Trains on real captured baseline sessions + labeled anomalous sessions.
No synthesized training data — all features computed from real Postgres data.
"""

import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db
import features

import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score


MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'sentinel_model.json')


def gather_training_data():
    """
    Gather feature vectors from all labeled sessions.
    Sessions labeled 'normal' are baseline, 'anomalous' are threats.
    """
    sessions = db.query("""
        SELECT s.id as session_id, s.user_id, s.started_at, s.label,
               u.username, u.role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.started_at IS NOT NULL
        ORDER BY s.started_at
    """)

    if not sessions:
        print('[ERROR] No sessions found. Run the activity generator first.')
        sys.exit(1)

    X = []
    y = []
    skipped = 0

    for s in sessions:
        try:
            feat = features.compute_all(
                user_id=s['user_id'],
                session_id=s['session_id'],
                event_timestamp=s['started_at']
            )
            feature_vector = [feat[name] for name in features.FEATURE_NAMES]
            X.append(feature_vector)
            y.append(1 if s['label'] == 'anomalous' else 0)
        except Exception as e:
            skipped += 1
            if skipped <= 3:
                print(f'  [WARN] Skipping session {s["session_id"]}: {e}')

    print(f'  Gathered {len(X)} sessions ({sum(y)} anomalous, {len(y) - sum(y)} normal)')
    if skipped > 0:
        print(f'  Skipped {skipped} sessions due to errors')

    return np.array(X), np.array(y)


def train_model(X, y):
    """
    Train XGBoost classifier. Calibrate output to 0-100 risk score.
    """
    # If we have no anomalous samples, we can still train but warn
    if sum(y) == 0:
        print('\n  [WARN] No anomalous sessions labeled yet.')
        print('  Training on normal data only — model will learn baseline patterns.')
        print('  After you perform anomalous activity, label those sessions and retrain.')
        print('  To label: UPDATE sessions SET label = \'anomalous\' WHERE id IN (...);')

    # Split data
    if len(X) > 10:
        strat = y if (sum(y) >= 2 and (len(y) - sum(y)) >= 2) else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=strat
        )
    else:
        X_train, y_train = X, y
        X_test, y_test = X, y

    print(f'  Train: {len(X_train)} samples, Test: {len(X_test)} samples')

    # Handle class imbalance
    n_pos = max(sum(y_train), 1)
    n_neg = max(len(y_train) - sum(y_train), 1)
    scale_pos_weight = n_neg / n_pos

    # Train XGBoost
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        eval_metric='logloss',
        random_state=42,
    )

    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    print(f'\n  Classification Report:')
    # Handle single-class case (only normal samples before anomalous labeling)
    present_labels = sorted(set(y_test) | set(y_pred))
    label_names = ['normal', 'anomalous']
    report_labels = [l for l in present_labels]
    report_names = [label_names[l] for l in report_labels]
    print(classification_report(y_test, y_pred, labels=report_labels, target_names=report_names, zero_division=0))

    if len(set(y_test)) > 1:
        auc = roc_auc_score(y_test, y_proba[:, 1])
        print(f'  AUC-ROC: {auc:.4f}')
    else:
        print('  AUC-ROC: N/A (single class — retrain after labeling anomalous sessions)')

    return model


def generate_shap_summary(model, X):
    """Generate SHAP summary and save plot."""
    try:
        import shap
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)

        plt.figure(figsize=(10, 6))
        shap.summary_plot(
            shap_values, X,
            feature_names=features.FEATURE_NAMES,
            show=False
        )
        plot_path = os.path.join(MODEL_DIR, 'shap_summary.png')
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f'  SHAP summary plot saved to {plot_path}')
    except ImportError:
        print('  [WARN] shap or matplotlib not installed — skipping SHAP summary plot')
    except Exception as e:
        print(f'  [WARN] SHAP summary generation failed: {e}')


def main():
    print('\n' + '=' * 60)
    print('  SentinelPAM — XGBoost Training Pipeline')
    print('=' * 60 + '\n')

    # Ensure model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Gather training data from real sessions
    print('[1/3] Gathering training data from real sessions...')
    X, y = gather_training_data()

    if len(X) < 5:
        print(f'\n  [ERROR] Only {len(X)} sessions found. Need at least 5.')
        print('  Run the activity generator first: python scripts/generate-activity.py 20')
        sys.exit(1)

    # Train model
    print('\n[2/3] Training XGBoost model...')
    model = train_model(X, y)

    # Save model
    model.save_model(MODEL_PATH)
    print(f'\n  Model saved to {MODEL_PATH}')

    # Save feature names for inference
    meta_path = os.path.join(MODEL_DIR, 'model_meta.json')
    with open(meta_path, 'w') as f:
        json.dump({
            'feature_names': features.FEATURE_NAMES,
            'training_samples': len(X),
            'anomalous_samples': int(sum(y)),
            'normal_samples': int(len(y) - sum(y)),
        }, f, indent=2)
    print(f'  Model metadata saved to {meta_path}')

    # SHAP summary
    print('\n[3/3] Generating SHAP summary...')
    generate_shap_summary(model, X)

    print('\n' + '=' * 60)
    print('  Training complete!')
    print('=' * 60 + '\n')


if __name__ == '__main__':
    main()
