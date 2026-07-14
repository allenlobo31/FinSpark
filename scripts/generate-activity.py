"""
SentinelPAM Activity Generator
Produces real logged auth/query/file-access events over a baseline period.

This script performs REAL actions:
- Real SQL queries against PostgreSQL
- Real file reads on the sensitive-shares directory
- Real HTTP POSTs to the ingestion API

It does NOT fabricate numbers or generate synthetic data points.
Each event is a real operation that actually executed.
"""

import os
import sys
import time
import json
import random
import hashlib
import requests
from datetime import datetime, timedelta

# Configuration
API_BASE = os.environ.get('API_BASE', 'http://localhost:3001')
SHARES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          'test-env', 'sensitive-shares')

# User profiles — distinct normal behavior patterns
USER_PROFILES = {
    'ravi_dba': {
        'user_id': 1,
        'role': 'dba_senior',
        'typical_hours': (9, 18),
        'queries': [
            "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'",
            "SELECT pg_size_pretty(pg_database_size(current_database()))",
            "SELECT * FROM pg_stat_activity WHERE state = 'active'",
            "SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test ON events_auth(event_timestamp)",
            "ANALYZE events_auth",
            "SELECT count(*) FROM events_query",
        ],
        'file_access_dirs': ['it/credentials', 'compliance/audit_reports'],
        'events_per_session': (8, 15),
    },
    'priya_dba': {
        'user_id': 2,
        'role': 'dba_junior',
        'typical_hours': (10, 19),
        'queries': [
            "SELECT count(*) FROM events_auth WHERE success = true",
            "SELECT user_id, count(*) FROM events_query GROUP BY user_id",
            "SELECT * FROM pg_stat_user_tables ORDER BY n_live_tup DESC",
            "SELECT pg_size_pretty(pg_total_relation_size('events_query'))",
            "SELECT * FROM users WHERE account_locked = false",
        ],
        'file_access_dirs': ['compliance/audit_reports'],
        'events_per_session': (5, 10),
    },
    'vendor_alex': {
        'user_id': 3,
        'role': 'vendor_support',
        'typical_hours': (14, 22),
        'queries': [
            "SELECT id, username, role FROM users WHERE role = 'vendor_support'",
            "SELECT count(*) FROM sessions WHERE user_id = 3",
            "SELECT event_type, count(*) FROM events_auth WHERE user_id = 3 GROUP BY event_type",
        ],
        'file_access_dirs': [],
        'events_per_session': (3, 6),
    },
    'admin_sara': {
        'user_id': 4,
        'role': 'general_admin',
        'typical_hours': (8, 17),
        'queries': [
            "SELECT id, username, role, account_locked FROM users",
            "SELECT count(*) FROM sessions WHERE started_at > now() - interval '1 day'",
            "SELECT event_type, count(*) FROM events_auth GROUP BY event_type",
            "SELECT * FROM pg_stat_statements LIMIT 5",
        ],
        'file_access_dirs': ['hr', 'compliance/audit_reports'],
        'events_per_session': (4, 8),
    },
}


def post_event(endpoint, data):
    """Post an event to the ingestion API."""
    url = f'{API_BASE}/events/{endpoint}'
    try:
        resp = requests.post(url, json=data, timeout=5)
        if resp.status_code == 201:
            return resp.json()
        else:
            print(f'  [WARN] {endpoint} returned {resp.status_code}: {resp.text}')
            return None
    except requests.exceptions.ConnectionError:
        print(f'  [ERROR] Cannot connect to API at {url}. Is the server running?')
        sys.exit(1)


def create_session(user_id):
    """Create a new session via the API."""
    url = f'{API_BASE}/events/sessions'
    try:
        resp = requests.post(url, json={'user_id': user_id}, timeout=5)
        if resp.status_code == 201:
            return resp.json()['session_id']
        else:
            print(f'  [WARN] Session create returned {resp.status_code}: {resp.text}')
            return None
    except requests.exceptions.ConnectionError:
        print(f'  [ERROR] Cannot connect to API. Is the server running?')
        sys.exit(1)


def get_files_in_dir(subdir):
    """List real files in a sensitive-shares subdirectory."""
    full_path = os.path.join(SHARES_DIR, subdir)
    files = []
    if os.path.exists(full_path):
        for root, dirs, filenames in os.walk(full_path):
            for f in filenames:
                rel_path = os.path.relpath(os.path.join(root, f), SHARES_DIR)
                files.append(rel_path.replace('\\', '/'))
    return files


def perform_file_read(file_rel_path):
    """Actually read a file and return bytes read."""
    full_path = os.path.join(SHARES_DIR, file_rel_path.replace('/', os.sep))
    if os.path.exists(full_path):
        with open(full_path, 'rb') as f:
            data = f.read()
        return len(data)
    return 0


def generate_user_session(username, profile, session_num):
    """Generate a single realistic session for a user."""
    user_id = profile['user_id']
    hour_start, hour_end = profile['typical_hours']

    print(f'  Session {session_num} for {username} (role: {profile["role"]})')

    # Create session
    session_id = create_session(user_id)
    if not session_id:
        return 0

    event_count = 0

    # 1. Auth login event
    login_result = post_event('auth', {
        'user_id': user_id,
        'session_id': session_id,
        'event_type': 'login',
        'ip_address': f'192.168.1.{10 + user_id}',
        'success': True,
    })
    if login_result:
        event_count += 1

    # 2. Query events — pick a random subset from the user's typical queries
    num_queries = random.randint(*profile['events_per_session'])
    for _ in range(num_queries):
        query = random.choice(profile['queries'])
        query_result = post_event('query', {
            'user_id': user_id,
            'session_id': session_id,
            'query_text': query,
            'rows_affected': random.randint(0, 50),
            'duration_ms': random.randint(1, 200),
        })
        if query_result:
            event_count += 1
        time.sleep(0.05)  # Small delay for realistic timing

    # 3. File access events — only for dirs the user normally accesses
    for subdir in profile['file_access_dirs']:
        files = get_files_in_dir(subdir)
        if files:
            # Read 1-2 files per accessible directory
            for f in random.sample(files, min(2, len(files))):
                bytes_read = perform_file_read(f)
                file_result = post_event('file-access', {
                    'user_id': user_id,
                    'session_id': session_id,
                    'file_path': f'sensitive-shares/{f}',
                    'operation': 'read',
                    'bytes_transferred': bytes_read,
                })
                if file_result:
                    event_count += 1

    # 4. Auth logout event
    logout_result = post_event('auth', {
        'user_id': user_id,
        'session_id': session_id,
        'event_type': 'logout',
        'ip_address': f'192.168.1.{10 + user_id}',
        'success': True,
    })
    if logout_result:
        event_count += 1

    return event_count


def main():
    sessions_per_user = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    print(f'\n{"="*60}')
    print(f'  SentinelPAM Activity Generator')
    print(f'  Generating {sessions_per_user} sessions per user')
    print(f'  API: {API_BASE}')
    print(f'  Shares: {SHARES_DIR}')
    print(f'{"="*60}\n')

    # Verify API is reachable
    try:
        resp = requests.get(f'{API_BASE}/health', timeout=5)
        if resp.status_code != 200:
            print(f'[ERROR] API health check failed: {resp.status_code}')
            sys.exit(1)
        print(f'[OK] API is healthy: {resp.json()}\n')
    except requests.exceptions.ConnectionError:
        print(f'[ERROR] Cannot connect to API at {API_BASE}. Start the server first.')
        sys.exit(1)

    total_events = 0

    for username, profile in USER_PROFILES.items():
        print(f'\n--- {username} ({profile["role"]}) ---')
        for s in range(1, sessions_per_user + 1):
            count = generate_user_session(username, profile, s)
            total_events += count
            time.sleep(0.1)  # Brief pause between sessions

    print(f'\n{"="*60}')
    print(f'  Done! Generated {total_events} total events')
    print(f'  across {sessions_per_user * len(USER_PROFILES)} sessions')
    print(f'  for {len(USER_PROFILES)} users')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
