# SentinelPAM

Privileged Access Misuse & Insider Threat Detection for Banking Environments.

> **This is NOT a simulation, demo, or mockup.** Every component operates on real data flowing through real code. No hardcoded fake results, no placeholder logic, no randomly generated output dressed up as detection.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Test Environment                             │
│  Activity Generator (Python) → Real SQL + File Ops → HTTP POST     │
│  PostgreSQL 16.14 (pg_stat_statements) │ Sensitive File Shares     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    Ingestion Layer — Node.js Express                │
│  POST /events/auth  │  POST /events/query  │  POST /events/file    │
│  ↓ persist to Postgres                                              │
│  ↓ trigger inference (child_process → Python)                       │
│  Policy Engine: <40 log │ 40-75 MFA step-up │ >75 session kill     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      ML Pipeline — Python                           │
│  Feature Engineering (shared module) → XGBoost + SHAP              │
│  Negligent vs Malicious classifier │ Quantum-Safe Audit (Dilithium │
│  + Kyber signing/encryption)                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      Dashboard — React + Vite                       │
│  Live Risk Feed │ SHAP Breakdown │ Session Replay │ Lateral Graph  │
│  TTD/TTC Metrics │ Compliance Tags │ Pattern Classification        │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| API + Policy Engine | Node.js + Express | v22.18.0 / Express 4.x |
| ML Pipeline | Python + XGBoost + SHAP | 3.12.6 / XGBoost 3.3.0 |
| Database | PostgreSQL (pg_stat_statements) | 16.14 |
| Quantum-Safe Crypto | liboqs-python (Dilithium + Kyber) | 0.11.x |
| Dashboard | React + Vite | React 18.x / Vite 6.x |
| MFA | TOTP (RFC 6238) via pyotp | — |

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Node ↔ Python | Shared Postgres table + child_process | No 2nd HTTP server; simpler to deploy and debug |
| PQC Binding | Python liboqs-python | C-wrapper, better perf than WASM JS binding; in existing Python pipeline |
| MFA | Real TOTP (RFC 6238) | Real cryptographic challenge, self-contained for test env |
| Negligent vs Malicious | Feature-threshold classifier on SHAP | Deterministic rules on real features, no over-engineering |

## Directory Structure

```
FinSpark/
├── server/                     # Express backend
│   ├── package.json
│   ├── .env                    # DB credentials (not committed)
│   ├── index.js
│   ├── lib/
│   │   ├── db.js               # Shared Postgres pool
│   │   ├── validate.js         # Shared event validation
│   │   └── policy.js           # Policy engine
│   └── routes/
│       ├── events.js           # Ingestion endpoints
│       ├── mfa.js              # MFA challenge/verify
│       ├── alerts.js           # Alert queries
│       └── dashboard.js        # Dashboard data API
├── ml/                         # Python ML pipeline
│   ├── requirements.txt
│   ├── db.py                   # Shared Postgres connection
│   ├── features.py             # Shared feature engineering
│   ├── train.py                # XGBoost training
│   ├── infer.py                # Inference + SHAP + classification
│   ├── audit_crypto.py         # Dilithium + Kyber
│   └── model/                  # Saved model artifacts
├── dashboard/                  # React Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── lib/
│       │   ├── api.js          # Shared API client
│       │   └── compliance.js   # RBI/PCI-DSS/SOC2 mappings
│       └── components/         # 7 components (no sprawl)
├── db/
│   ├── schema.sql
│   └── seed.sql
├── scripts/
│   ├── generate-activity.py    # Real activity generator
│   └── rsa_vs_kyber_demo.py    # RSA vs Kyber comparison
├── test-env/
│   └── sensitive-shares/       # Simulated sensitive file shares
└── README.md
```

## Test Users

| Username | Role | Typical Hours | Behavior Pattern |
|----------|------|---------------|------------------|
| ravi_dba | dba_senior | 09:00–18:00 | DDL, schema changes, bulk exports |
| priya_dba | dba_junior | 10:00–19:00 | SELECT-heavy, monitoring queries |
| vendor_alex | vendor_support | 14:00–22:00 | App-specific tables only |
| admin_sara | general_admin | 08:00–17:00 | User mgmt, config queries |

## Policy Thresholds

| Risk Score | Action | What Happens |
|------------|--------|--------------|
| < 40 | Log only | Alert inserted, severity LOW |
| 40–75 | MFA step-up | Real TOTP challenge required |
| > 75 | Session kill + lock | `pg_terminate_backend()` + account disabled |

## Feature Engineering

All features computed from real data in PostgreSQL:

1. **Time-of-day deviation** — z-score vs user's historical hour distribution
2. **Peer-group deviation** — z-score vs same-role peers (cold-start fallback)
3. **Data volume z-score** — bytes transferred vs 7-day rolling mean
4. **Query novelty** — has this user run this exact pattern before?
5. **Access-path entropy** — Shannon entropy of distinct systems/files per session

## Compliance Mapping

Each alert maps to real framework controls:
- **RBI Cybersecurity Framework**: Access control, monitoring, incident response
- **PCI-DSS**: Req 7 (restrict access), Req 10 (track access), Req 12 (security policy)
- **SOC 2**: CC6.1 (logical access), CC7.2 (system monitoring), CC7.3 (incident response)

## Quantum-Safe Audit

- Every event/alert signed with **Dilithium** (ML-DSA) before persistence
- Encrypted with **Kyber** (ML-KEM) derived symmetric key + AES-256-GCM
- Standalone comparison script demonstrates RSA vs Kyber encryption of the same log entry

## Honesty Notes

- **No live bank feed** — operates against local PostgreSQL, not a production banking DB
- **TOTP MFA** instead of Duo/Okta — real crypto, self-contained
- **liboqs-python is experimental** — not FIPS-validated; real banking would use audited modules
- **Everything else is real** — real queries, real model training, real session kills, real SHAP, real crypto

## Setup & Run

```bash
# 1. Database
psql -U postgres -f db/schema.sql
psql -U postgres -f db/seed.sql

# 2. Server
cd server && npm install && node index.js

# 3. ML Pipeline
cd ml && pip install -r requirements.txt

# 4. Generate baseline activity
python scripts/generate-activity.py

# 5. Train model
python ml/train.py

# 6. Dashboard
cd dashboard && npm install && npm run dev
```




# 1. Setup Postgres Database
>> psql -U postgres -f db\schema.sql
>> psql -U postgres -f db\seed.sql
>>      
>> # 2. Start the Backend API (keep this running!)
>> cd server
>> npm install
>> node index.js
>> 


 # 1. Install ML dependencies (using python -m pip to fix your error)
>> cd ml
>> python -m pip install -r requirements.txt
>> cd ..
>> 
>> # 2. Generate activity (this will now work because Terminal 1 is running)
>> python scripts\generate-activity.py
>> 
>> # 3. Train model (this saves the model permanently)
>> python ml\train.py
>> 
>> # 4. Start the Dashboard
>> cd dashboard
>> npm install
>> npm run dev