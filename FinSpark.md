# FinSpark (SentinelPAM) - Running Guide

FinSpark integrates **SentinelPAM**, a real-time insider threat detection engine using XGBoost, Quantum-Safe Cryptography (Kyber/Dilithium), and a React monitoring dashboard. 

Follow these steps to run the application locally from scratch.

---

## 1. Prerequisites
Before starting, ensure you have the following installed on your machine:
* **Node.js** (v18+)
* **Python** (v3.10+)
* **PostgreSQL** (v14+)

### Enable pg_stat_statements
The ML Risk Engine requires the `pg_stat_statements` extension to track query duration and rows affected.
1. Open your `postgresql.conf` file (usually located in `C:\Program Files\PostgreSQL\<version>\data\postgresql.conf` on Windows).
2. Find or add the `shared_preload_libraries` line:
   ```conf
   shared_preload_libraries = 'pg_stat_statements'
   ```
3. Restart the PostgreSQL service.

---

## 2. Database Setup
1. Create the database:
   ```sql
   CREATE DATABASE sentinelpam;
   ```
2. Connect to `sentinelpam` and enable the extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```
3. Run the schema and seed files located in the `db/` folder to create tables and mock users:
   ```bash
   psql -U postgres -d sentinelpam -f db/schema.sql
   psql -U postgres -d sentinelpam -f db/seed.sql
   ```

---

## 3. Backend (Node.js API) Setup
The backend serves the event ingestion API and policy enforcement logic.

1. Open a terminal and navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and update your database password:
   ```bash
   cp .env.example .env
   ```
   *(Edit `.env` and set `PG_PASSWORD` to your PostgreSQL password).*
4. Start the server:
   ```bash
   npm start
   ```
   *The server will run on `http://localhost:3001`.*

---

## 4. ML Risk Engine (Python) Setup
The Python pipeline provides real-time XGBoost inference, SHAP explanations, and Quantum-Safe cryptography.

1. Open a new terminal in the root folder.
2. Navigate to the ML directory:
   ```bash
   cd ml
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: The `liboqs-python` package provides the Quantum-Safe algorithms. If the C-library is missing on Windows, the pipeline gracefully falls back to AES/HMAC).*
4. Ensure the model is trained by running:
   ```bash
   python train.py
   ```

---

## 5. Frontend (React Dashboard) Setup
The dashboard provides a real-time view into the system's compliance state, risk feed, and session replays.

1. Open a new terminal and navigate to the dashboard folder:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The dashboard will run on `http://localhost:5173`.*

---

## 6. Running Attack Simulations
To see SentinelPAM in action, you can generate activity or simulate a malicious insider attack.

1. **Generate Baseline Activity:**
   *(Runs normal user queries and file access patterns to train the ML model).*
   ```bash
   python scripts/generate-activity.py
   ```

2. **Simulate a Malicious Attack:**
   *(Logs an anomalous session, queries sensitive tables, and triggers the automated Policy Engine to kill the database connection).*
   ```bash
   python scripts/simulate-attack.py
   ```
   *Watch the React Dashboard immediately flag the session as **CRITICAL**!*

3. **View Quantum-Safe Audit Log comparison:**
   ```bash
   python scripts/rsa_vs_kyber_demo.py
   ```

---

## 7. Deployment Overview
When deploying FinSpark to production:
* **Frontend:** Configure your host (e.g., Vercel) with the `VITE_API_BASE_URL` environment variable pointing to your deployed Node.js backend.
* **Backend:** Deploy the `server/` directory on a platform that supports **both Node.js and Python** (e.g., using a custom Docker container on AWS or Render). Make sure to inject the `PG_*` database credentials securely.
