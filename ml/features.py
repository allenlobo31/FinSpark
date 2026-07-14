"""
Shared Feature Engineering Module
Used by BOTH training (train.py) and inference (infer.py) — never duplicated.

All features are computed from real data in PostgreSQL.
No synthetic or hardcoded feature values.
"""

import math
import sys
import os

# Add parent directory to path so we can import db
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db


def time_deviation_zscore(user_id, event_timestamp):
    """
    Z-score of event hour vs the user's own historical hour distribution.
    
    Measures: Is this user logging in / running queries at an unusual time?
    A z-score > 2 means the event hour is >2 standard deviations from their norm.
    """
    # Get the user's historical hour distribution
    rows = db.query("""
        SELECT EXTRACT(HOUR FROM event_timestamp) as hour
        FROM (
            SELECT event_timestamp FROM events_auth WHERE user_id = %s
            UNION ALL
            SELECT event_timestamp FROM events_query WHERE user_id = %s
        ) combined
    """, (user_id, user_id))

    if len(rows) < 3:
        # Not enough history — return 0 (no deviation measurable)
        return 0.0

    hours = [float(r['hour']) for r in rows]
    event_hour = event_timestamp.hour if hasattr(event_timestamp, 'hour') else float(event_timestamp)

    mean_hour = sum(hours) / len(hours)
    variance = sum((h - mean_hour) ** 2 for h in hours) / len(hours)
    std_dev = math.sqrt(variance) if variance > 0 else 1.0

    return (event_hour - mean_hour) / std_dev


def peer_group_deviation(user_id, event_timestamp):
    """
    Z-score of event hour vs the user's role-peer group.
    
    Cold-start fallback: when a user has little personal history,
    compare against peers with the same role.
    """
    # Get the user's role
    user_rows = db.query("SELECT role FROM users WHERE id = %s", (user_id,))
    if not user_rows:
        return 0.0

    role = user_rows[0]['role']

    # Get all peer activity hours (excluding this user)
    rows = db.query("""
        SELECT EXTRACT(HOUR FROM event_timestamp) as hour
        FROM (
            SELECT ea.event_timestamp FROM events_auth ea
            JOIN users u ON ea.user_id = u.id
            WHERE u.role = %s AND ea.user_id != %s
            UNION ALL
            SELECT eq.event_timestamp FROM events_query eq
            JOIN users u ON eq.user_id = u.id
            WHERE u.role = %s AND eq.user_id != %s
        ) combined
    """, (role, user_id, role, user_id))

    if len(rows) < 3:
        return 0.0

    hours = [float(r['hour']) for r in rows]
    event_hour = event_timestamp.hour if hasattr(event_timestamp, 'hour') else float(event_timestamp)

    mean_hour = sum(hours) / len(hours)
    variance = sum((h - mean_hour) ** 2 for h in hours) / len(hours)
    std_dev = math.sqrt(variance) if variance > 0 else 1.0

    return (event_hour - mean_hour) / std_dev


def data_volume_zscore(user_id, session_id):
    """
    Z-score of session's data volume vs the user's rolling average.
    
    Measures: Is this session transferring an unusually large amount of data?
    High values suggest potential data exfiltration.
    """
    # Current session's total bytes
    session_rows = db.query("""
        SELECT COALESCE(SUM(bytes_transferred), 0) as session_bytes
        FROM events_file_access WHERE user_id = %s AND session_id = %s
    """, (user_id, session_id))

    session_bytes = float(session_rows[0]['session_bytes']) if session_rows else 0

    # Historical per-session averages (last 30 sessions)
    history_rows = db.query("""
        SELECT session_id, COALESCE(SUM(bytes_transferred), 0) as total_bytes
        FROM events_file_access
        WHERE user_id = %s AND session_id != %s AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY session_id DESC LIMIT 30
    """, (user_id, session_id))

    if len(history_rows) < 2:
        # Not enough history — if session has lots of data, flag it mildly
        return min(session_bytes / 10000, 3.0) if session_bytes > 0 else 0.0

    volumes = [float(r['total_bytes']) for r in history_rows]
    mean_vol = sum(volumes) / len(volumes)
    variance = sum((v - mean_vol) ** 2 for v in volumes) / len(volumes)
    std_dev = math.sqrt(variance) if variance > 0 else 1.0

    return (session_bytes - mean_vol) / std_dev


def query_novelty(user_id, query_hash):
    """
    Has this user ever run this exact query pattern before?
    
    Returns a 0-1 score:
    - 0.0 = user runs this query frequently (very familiar)
    - 1.0 = user has NEVER run this query before (completely novel)
    
    Based on real query_hash lookups against events_query.
    """
    # Count how many times this user has run this exact query hash before
    rows = db.query("""
        SELECT count(*) as cnt FROM events_query
        WHERE user_id = %s AND query_hash = %s
    """, (user_id, query_hash))

    count = int(rows[0]['cnt']) if rows else 0

    # Also get total query count for this user
    total_rows = db.query("""
        SELECT count(*) as total FROM events_query WHERE user_id = %s
    """, (user_id,))

    total = int(total_rows[0]['total']) if total_rows else 0

    if total == 0:
        return 1.0  # No history at all — everything is novel

    if count == 0:
        return 1.0  # Never seen this query — maximum novelty

    # Frequency-based novelty: rare queries score higher
    frequency = count / total
    return max(0.0, 1.0 - frequency * 10)  # Scale so >10% frequency = 0 novelty


def access_path_entropy(session_id):
    """
    Shannon entropy of distinct systems/files/tables accessed in a session.
    
    High entropy = user is accessing many different resources (lateral movement indicator).
    Low entropy = user is focused on one or two resources (normal behavior).
    """
    # Get all distinct resources accessed in this session
    query_rows = db.query("""
        SELECT query_hash FROM events_query WHERE session_id = %s
    """, (session_id,))

    file_rows = db.query("""
        SELECT file_path FROM events_file_access WHERE session_id = %s
    """, (session_id,))

    # Combine all access paths
    paths = [r['query_hash'] for r in query_rows] + [r['file_path'] for r in file_rows]

    if len(paths) <= 1:
        return 0.0

    # Count frequency of each distinct path
    freq = {}
    for p in paths:
        freq[p] = freq.get(p, 0) + 1

    # Shannon entropy
    total = len(paths)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)

    return entropy


def compute_all(user_id, session_id, event_timestamp, query_hash=None):
    """
    Compute all features for a given user/session/event.
    Returns a dict of feature names to values.
    
    This is the ONLY function that training and inference should call.
    """
    # If no query_hash provided, use the most recent query in this session
    if query_hash is None:
        recent = db.query("""
            SELECT query_hash FROM events_query
            WHERE user_id = %s AND session_id = %s
            ORDER BY event_timestamp DESC LIMIT 1
        """, (user_id, session_id))
        query_hash = recent[0]['query_hash'] if recent else ''

    features = {
        'time_deviation': time_deviation_zscore(user_id, event_timestamp),
        'peer_deviation': peer_group_deviation(user_id, event_timestamp),
        'data_volume': data_volume_zscore(user_id, session_id),
        'query_novelty': query_novelty(user_id, query_hash),
        'access_entropy': access_path_entropy(session_id),
    }

    return features


# Feature names in consistent order (used by training + inference)
FEATURE_NAMES = ['time_deviation', 'peer_deviation', 'data_volume', 'query_novelty', 'access_entropy']


if __name__ == '__main__':
    # Quick test: compute features for a user/session from command line
    import argparse
    from datetime import datetime

    parser = argparse.ArgumentParser(description='Compute features for a user/session')
    parser.add_argument('--user_id', type=int, required=True)
    parser.add_argument('--session_id', type=int, required=True)
    args = parser.parse_args()

    features = compute_all(args.user_id, args.session_id, datetime.now())
    print('\nComputed features:')
    for name, value in features.items():
        print(f'  {name}: {value:.4f}')
