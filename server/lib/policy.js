// Policy Engine — enforces risk-based actions against the real test environment.
// Every action is a real state change, not a UI-only animation.

const { execFile } = require('child_process');
const path = require('path');
const db = require('./db');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const INFER_SCRIPT = path.resolve(__dirname, '..', '..', 'ml', 'infer.py');

// Compliance mapping — maps severity to real framework controls
const COMPLIANCE_MAP = {
  LOW: {
    rbi: ['CFC-3.1: Continuous monitoring of privileged access'],
    pci_dss: ['Req 10.2: Implement automated audit trails'],
    soc2: ['CC7.2: System monitoring activities'],
  },
  MEDIUM: {
    rbi: ['CFC-3.1: Continuous monitoring', 'CFC-4.2: Multi-factor authentication for privileged users'],
    pci_dss: ['Req 7.1: Restrict access to need-to-know', 'Req 8.3: Multi-factor authentication'],
    soc2: ['CC6.1: Logical access security', 'CC7.2: System monitoring'],
  },
  CRITICAL: {
    rbi: ['CFC-3.1: Continuous monitoring', 'CFC-5.1: Incident response activation', 'CFC-4.3: Immediate access revocation'],
    pci_dss: ['Req 7.1: Restrict access', 'Req 10.6: Review logs for anomalies', 'Req 12.10: Incident response plan'],
    soc2: ['CC6.1: Logical access security', 'CC7.3: Incident response', 'CC7.4: Incident containment'],
  },
};

/**
 * Run inference on a session via the Python ML pipeline.
 * @param {number} sessionId
 * @returns {Promise<object>} Inference result with score, features, SHAP
 */
function runInference(sessionId) {
  return new Promise((resolve, reject) => {
    execFile(PYTHON_PATH, [INFER_SCRIPT, '--session_id', String(sessionId)], {
      cwd: path.resolve(__dirname, '..', '..'),
      timeout: 30000,
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Policy] Inference error:', err.message);
        if (stderr) console.error('[Policy] stderr:', stderr);
        return reject(err);
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        console.error('[Policy] Failed to parse inference output:', stdout);
        reject(parseErr);
      }
    });
  });
}

/**
 * Evaluate a session and enforce policy based on risk score.
 * All actions are real state changes against the database.
 */
async function evaluateSession(sessionId) {
  const detectStart = new Date();

  // Run inference
  let inference;
  try {
    inference = await runInference(sessionId);
  } catch (err) {
    console.error(`[Policy] Inference failed for session ${sessionId}:`, err.message);
    return null;
  }

  if (inference.error) {
    console.error(`[Policy] ${inference.error}`);
    return null;
  }

  const score = inference.score;
  const detectEnd = new Date();
  const timeToDetectMs = detectEnd - detectStart;

  // Determine severity
  let severity;
  if (score >= 75) severity = 'CRITICAL';
  else if (score >= 40) severity = 'MEDIUM';
  else severity = 'LOW';

  const compliance = COMPLIANCE_MAP[severity];

  // Create alert (real DB insert)
  const alertResult = await db.query(
    `INSERT INTO alerts (risk_score_id, user_id, severity, compliance_tags, event_timestamp, detected_at)
     SELECT rs.id, rs.user_id, $1, $2, rs.event_timestamp, NOW()
     FROM risk_scores rs WHERE rs.session_id = $3
     ORDER BY rs.created_at DESC LIMIT 1
     RETURNING id, detected_at`,
    [severity, JSON.stringify(compliance), sessionId]
  );

  if (alertResult.rows.length === 0) {
    console.warn(`[Policy] No risk score found for session ${sessionId}`);
    return inference;
  }

  const alertId = alertResult.rows[0].id;
  const detectedAt = alertResult.rows[0].detected_at;
  let containedAt = null;

  // Enforce policy actions (real state changes)
  if (score < 40) {
    // Log only
    await db.query(
      `INSERT INTO policy_actions (alert_id, action_type, executed_at, completed_at, details)
       VALUES ($1, 'log', NOW(), NOW(), $2)`,
      [alertId, JSON.stringify({ score, time_to_detect_ms: timeToDetectMs })]
    );
    console.log(`[Policy] Session ${sessionId}: score=${score} → LOG ONLY`);

  } else if (score < 75) {
    // MFA step-up — set mfa_required flag (real DB change)
    await db.query(
      `UPDATE users SET mfa_required = true WHERE id = $1`,
      [inference.user_id]
    );
    await db.query(
      `INSERT INTO policy_actions (alert_id, action_type, executed_at, completed_at, details)
       VALUES ($1, 'mfa_challenge', NOW(), NULL, $2)`,
      [alertId, JSON.stringify({ score, user_id: inference.user_id, time_to_detect_ms: timeToDetectMs })]
    );
    console.log(`[Policy] Session ${sessionId}: score=${score} → MFA STEP-UP for user ${inference.username}`);

  } else {
    // CRITICAL — kill session + lock account (real state changes)
    const containStart = new Date();

    // 1. Terminate the real DB session if it has a backend PID
    const sessionRow = await db.query(
      `SELECT pg_backend_pid FROM sessions WHERE id = $1`, [sessionId]
    );
    if (sessionRow.rows.length > 0 && sessionRow.rows[0].pg_backend_pid) {
      try {
        await db.query(
          `SELECT pg_terminate_backend($1)`, [sessionRow.rows[0].pg_backend_pid]
        );
        console.log(`[Policy] Terminated DB backend PID ${sessionRow.rows[0].pg_backend_pid}`);
      } catch (e) {
        console.warn(`[Policy] Could not terminate backend: ${e.message}`);
      }
    }

    // 2. End the session
    await db.query(
      `UPDATE sessions SET ended_at = NOW() WHERE id = $1`, [sessionId]
    );

    // 3. Lock the account (real state change)
    await db.query(
      `UPDATE users SET account_locked = true, mfa_required = true WHERE id = $1`,
      [inference.user_id]
    );

    containedAt = new Date();
    const timeToContainMs = containedAt - containStart;

    // Record both actions
    await db.query(
      `INSERT INTO policy_actions (alert_id, action_type, executed_at, completed_at, details)
       VALUES ($1, 'session_kill', $2, $3, $4)`,
      [alertId, containStart, containedAt,
       JSON.stringify({ session_id: sessionId, time_to_contain_ms: timeToContainMs })]
    );
    await db.query(
      `INSERT INTO policy_actions (alert_id, action_type, executed_at, completed_at, details)
       VALUES ($1, 'account_lock', $2, $3, $4)`,
      [alertId, containStart, containedAt,
       JSON.stringify({ user_id: inference.user_id, username: inference.username })]
    );

    console.log(`[Policy] Session ${sessionId}: score=${score} → SESSION KILLED + ACCOUNT LOCKED (${inference.username})`);
    console.log(`[Policy]   Time-to-detect: ${timeToDetectMs}ms, Time-to-contain: ${timeToContainMs}ms`);
  }

  return {
    ...inference,
    severity,
    alert_id: alertId,
    compliance,
    detected_at: detectedAt,
    contained_at: containedAt,
    time_to_detect_ms: timeToDetectMs,
  };
}

module.exports = { evaluateSession, runInference };
