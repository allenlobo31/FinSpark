-- SentinelPAM Database Schema
-- PostgreSQL 16 with pg_stat_statements

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create dedicated database
SELECT 'CREATE DATABASE sentinelpam'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sentinelpam')\gexec

\c sentinelpam

-- Enable extensions in sentinelpam database
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-----------------------------------------------------------
-- Users table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(64) UNIQUE NOT NULL,
    role            VARCHAR(32) NOT NULL CHECK (role IN ('dba_senior', 'dba_junior', 'vendor_support', 'general_admin')),
    password_hash   TEXT NOT NULL,
    totp_secret     VARCHAR(64),
    account_locked  BOOLEAN DEFAULT FALSE,
    mfa_required    BOOLEAN DEFAULT FALSE,
    typical_hours_start INTEGER NOT NULL CHECK (typical_hours_start BETWEEN 0 AND 23),
    typical_hours_end   INTEGER NOT NULL CHECK (typical_hours_end BETWEEN 0 AND 23),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------------------
-- Sessions table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    pg_backend_pid  INTEGER,
    is_anomalous    BOOLEAN DEFAULT FALSE,  -- labeled after the fact for training
    label           VARCHAR(16) DEFAULT 'normal' CHECK (label IN ('normal', 'anomalous'))
);

CREATE INDEX idx_sessions_user_time ON sessions(user_id, started_at);

-----------------------------------------------------------
-- Auth events
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS events_auth (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    session_id      INTEGER REFERENCES sessions(id),
    event_timestamp TIMESTAMPTZ NOT NULL,
    event_type      VARCHAR(16) NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login')),
    ip_address      VARCHAR(45),
    success         BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_user_time ON events_auth(user_id, event_timestamp);

-----------------------------------------------------------
-- Query events
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS events_query (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    session_id      INTEGER REFERENCES sessions(id),
    event_timestamp TIMESTAMPTZ NOT NULL,
    query_text      TEXT NOT NULL,
    query_hash      VARCHAR(64) NOT NULL,  -- SHA-256 of normalized query
    rows_affected   INTEGER DEFAULT 0,
    duration_ms     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_user_time ON events_query(user_id, event_timestamp);
CREATE INDEX idx_query_hash ON events_query(query_hash);

-----------------------------------------------------------
-- File access events
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS events_file_access (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    session_id      INTEGER REFERENCES sessions(id),
    event_timestamp TIMESTAMPTZ NOT NULL,
    file_path       TEXT NOT NULL,
    operation       VARCHAR(16) NOT NULL CHECK (operation IN ('read', 'write', 'delete', 'list')),
    bytes_transferred BIGINT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_user_time ON events_file_access(user_id, event_timestamp);

-----------------------------------------------------------
-- Risk scores (written by Python inference, read by Node policy engine)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_scores (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER REFERENCES sessions(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    event_timestamp TIMESTAMPTZ NOT NULL,
    score           NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    shap_values     JSONB,          -- per-feature SHAP contributions
    feature_values  JSONB,          -- raw feature values used
    pattern_class   VARCHAR(16) DEFAULT 'normal' CHECK (pattern_class IN ('normal', 'negligent', 'malicious')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_user_time ON risk_scores(user_id, event_timestamp);
CREATE INDEX idx_risk_score ON risk_scores(score);

-----------------------------------------------------------
-- Alerts
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    risk_score_id   INTEGER REFERENCES risk_scores(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    severity        VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'CRITICAL')),
    compliance_tags JSONB,          -- mapped RBI/PCI-DSS/SOC2 controls
    event_timestamp TIMESTAMPTZ NOT NULL,
    detected_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-----------------------------------------------------------
-- Policy actions
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_actions (
    id              SERIAL PRIMARY KEY,
    alert_id        INTEGER NOT NULL REFERENCES alerts(id),
    action_type     VARCHAR(32) NOT NULL CHECK (action_type IN ('log', 'mfa_challenge', 'session_kill', 'account_lock')),
    executed_at     TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    details         JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------------------
-- Quantum-safe audit log
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id              SERIAL PRIMARY KEY,
    event_type      VARCHAR(32) NOT NULL,   -- 'risk_score', 'alert', 'policy_action'
    event_id        INTEGER NOT NULL,       -- FK to the source table
    original_payload TEXT,                  -- plaintext JSON (for dev/debug; omit in production)
    signed_payload  TEXT NOT NULL,          -- Dilithium-signed JSON
    signature       TEXT NOT NULL,          -- Dilithium signature (base64)
    encrypted_payload TEXT,                 -- Kyber-encrypted ciphertext (base64)
    encapsulated_key TEXT,                  -- Kyber encapsulated key (base64)
    algorithm_sign  VARCHAR(32) DEFAULT 'Dilithium3',
    algorithm_enc   VARCHAR(32) DEFAULT 'Kyber768',
    event_timestamp TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_type ON audit_log(event_type, event_id);
