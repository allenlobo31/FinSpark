"""
Simulate an anomalous (malicious) session to trigger SentinelPAM policy enforcement.
This mimics a compromised vendor account (vendor_alex) logging in at 3 AM,
running unusual queries, and exfiltrating large amounts of sensitive data.
"""

import sys
import time
import requests
from datetime import datetime

API_URL = 'http://localhost:3001'

def main():
    print("="*60)
    print("  SentinelPAM — Simulating Malicious Insider Attack")
    print("="*60)

    # Set timestamp to 3:00 AM today (highly anomalous for this user)
    now = datetime.now()
    anomalous_time = now.replace(hour=3, minute=0, second=0, microsecond=0)
    time_str = anomalous_time.isoformat() + "Z"

    # 1. Anomalous Login
    print(f"\n[1] Starting session for 'vendor_alex' at 03:00 AM...")
    res = requests.post(f"{API_URL}/events/sessions", json={
        "user_id": 3,
        "started_at": time_str
    }).json()
    
    session_id = res['session_id']
    print(f"    Session {session_id} created.")

    # Log the auth event
    requests.post(f"{API_URL}/events/auth", json={
        "user_id": 3,
        "session_id": session_id,
        "event_type": "login",
        "ip_address": "10.0.0.199", # Unusual IP
        "success": True,
        "event_timestamp": time_str
    })

    # 2. Reconnaissance (Unusual Queries)
    print("\n[2] Performing reconnaissance (querying tables not typically accessed by vendor_support)...")
    recon_queries = [
        "SELECT * FROM pg_shadow",
        "SELECT username, password_hash FROM users",
        "SELECT * FROM customer_pii_data",
        "SELECT * FROM employee_salaries"
    ]
    
    for i, q in enumerate(recon_queries):
        print(f"    {q}")
        # Increment time slightly
        qt = anomalous_time.replace(minute=i+1).isoformat() + "Z"
        requests.post(f"{API_URL}/events/query", json={
            "user_id": 3,
            "session_id": session_id,
            "query_text": q,
            "rows_affected": 500,
            "duration_ms": 15,
            "event_timestamp": qt
        })
        time.sleep(0.2)

    # 3. Data Exfiltration (High Volume File Access)
    print("\n[3] Exfiltrating sensitive files (high data volume + high entropy)...")
    files = [
        "C:/Users/Allen Lobo/React Projects/FinSpark/test-env/sensitive-shares/hr_payroll/salary_q3.csv",
        "C:/Users/Allen Lobo/React Projects/FinSpark/test-env/sensitive-shares/customer_data/export_full.zip",
        "C:/Users/Allen Lobo/React Projects/FinSpark/test-env/sensitive-shares/admin_tools/db_backup.sql"
    ]
    
    for i, f in enumerate(files):
        print(f"    Reading {f}")
        ft = anomalous_time.replace(minute=i+10).isoformat() + "Z"
        requests.post(f"{API_URL}/events/file-access", json={
            "user_id": 3,
            "session_id": session_id,
            "file_path": f,
            "operation": "read",
            "bytes_transferred": 50000000, # 50MB each
            "event_timestamp": ft
        })
        time.sleep(0.2)

    # Label the session as anomalous for future model training
    print("\n[4] Labeling session as 'anomalous' in Postgres...")
    import psycopg2
    try:
        conn = psycopg2.connect("dbname=sentinelpam user=postgres password=31052005")
        cur = conn.cursor()
        cur.execute("UPDATE sessions SET label = 'anomalous' WHERE id = %s", (session_id,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  [WARN] Failed to label session: {e}")

    # 5. Trigger Policy Evaluation
    print("\n[5] Triggering SentinelPAM Policy Evaluation...")
    time.sleep(1)
    
    eval_res = requests.post(f"{API_URL}/api/evaluate", json={
        "session_id": session_id
    })

    if eval_res.status_code == 200:
        result = eval_res.json()
        print("\n" + "="*60)
        print("  POLICY EVALUATION RESULT")
        print("="*60)
        print(f"  Risk Score: {result.get('score')} ({result.get('severity')})")
        print(f"  Pattern:    {result.get('pattern_class')}")
        print("\n  Enforced Actions:")
        if result.get('severity') == 'CRITICAL':
            print("  [x] KILLED active database session (pg_terminate_backend)")
            print("  [x] LOCKED user account (vendor_alex)")
            print("  [x] REQUIRED MFA for future unlock attempts")
        elif result.get('severity') == 'MEDIUM':
            print("  [x] REQUIRED MFA for current session continuation")
            
        print(f"\n  Time to Detect:  {result.get('time_to_detect_ms')}ms")
        if result.get('contained_at'):
            print(f"  Time to Contain: {result.get('contained_at')}")
    else:
        print(f"\n[ERROR] Policy evaluation failed: {eval_res.text}")

    print("\nView the results on the Dashboard: http://localhost:5173")

if __name__ == '__main__':
    main()
