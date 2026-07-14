-- SentinelPAM Seed Data
-- 4 test users with distinct behavior profiles

\c sentinelpam

-- Passwords are bcrypt hashes of simple test passwords (username + '123')
-- In real deployment these would be proper secrets
INSERT INTO users (username, role, password_hash, typical_hours_start, typical_hours_end) VALUES
    ('ravi_dba',     'dba_senior',      crypt('ravi123',     gen_salt('bf')),  9,  18),
    ('priya_dba',    'dba_junior',      crypt('priya123',    gen_salt('bf')), 10,  19),
    ('vendor_alex',  'vendor_support',  crypt('alex123',     gen_salt('bf')), 14,  22),
    ('admin_sara',   'general_admin',   crypt('sara123',     gen_salt('bf')),  8,  17)
ON CONFLICT (username) DO NOTHING;
