"""
Shared PostgreSQL connection for all Python modules.
Single source of truth — never create a second connection elsewhere.
"""

import os
import psycopg2
import psycopg2.extras

# Connection config from environment or defaults
DB_CONFIG = {
    'host': os.environ.get('PG_HOST', 'localhost'),
    'port': int(os.environ.get('PG_PORT', 5432)),
    'dbname': os.environ.get('PG_DATABASE', 'sentinelpam'),
    'user': os.environ.get('PG_USER', 'postgres'),
    'password': os.environ.get('PG_PASSWORD', '31052005'),
}

_conn = None


def get_connection():
    """Get or create a shared database connection."""
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(**DB_CONFIG)
        _conn.autocommit = True
    return _conn


def query(sql, params=None, fetch=True):
    """Execute a query and return results as list of dicts."""
    conn = get_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        if fetch and cur.description:
            return cur.fetchall()
        return []


def execute(sql, params=None):
    """Execute a statement without fetching results."""
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(sql, params)


def close():
    """Close the shared connection."""
    global _conn
    if _conn and not _conn.closed:
        _conn.close()
        _conn = None
