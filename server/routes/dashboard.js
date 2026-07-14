// Alert and dashboard data routes — all data from real Postgres queries

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const policy = require('../lib/policy');

// GET /api/alerts — list alerts with risk scores and compliance tags
router.get('/alerts', async (req, res) => {
  const { severity, limit = 50, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT a.*, u.username, u.role,
             rs.score, rs.shap_values, rs.feature_values, rs.pattern_class
      FROM alerts a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN risk_scores rs ON a.risk_score_id = rs.id
    `;
    const params = [];
    if (severity) {
      sql += ` WHERE a.severity = $1`;
      params.push(severity);
    }
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(sql, params);
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('[Dashboard] Alerts error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/risk-scores — list risk scores with SHAP and features
router.get('/risk-scores', async (req, res) => {
  const { limit = 50 } = req.query;
  try {
    const result = await db.query(`
      SELECT rs.*, u.username, u.role
      FROM risk_scores rs
      JOIN users u ON rs.user_id = u.id
      ORDER BY rs.created_at DESC LIMIT $1
    `, [parseInt(limit, 10)]);
    res.json({ risk_scores: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/session-replay/:sessionId — get all events for a session
router.get('/session-replay/:sessionId', async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  try {
    const [authEvents, queryEvents, fileEvents, riskScore] = await Promise.all([
      db.query(`SELECT *, 'auth' as event_category FROM events_auth WHERE session_id = $1 ORDER BY event_timestamp`, [sessionId]),
      db.query(`SELECT *, 'query' as event_category FROM events_query WHERE session_id = $1 ORDER BY event_timestamp`, [sessionId]),
      db.query(`SELECT *, 'file_access' as event_category FROM events_file_access WHERE session_id = $1 ORDER BY event_timestamp`, [sessionId]),
      db.query(`SELECT * FROM risk_scores WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`, [sessionId]),
    ]);

    // Merge and sort all events by timestamp
    const events = [...authEvents.rows, ...queryEvents.rows, ...fileEvents.rows]
      .sort((a, b) => new Date(a.event_timestamp) - new Date(b.event_timestamp));

    // Mark anomalous events based on SHAP values
    const risk = riskScore.rows[0] || null;
    const anomalyFeatures = risk?.shap_values ? JSON.parse(typeof risk.shap_values === 'string' ? risk.shap_values : JSON.stringify(risk.shap_values)) : {};

    res.json({
      session_id: sessionId,
      events,
      risk_score: risk,
      anomaly_features: anomalyFeatures,
    });
  } catch (err) {
    console.error('[Dashboard] Session replay error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/lateral-movement — build graph from real access events
router.get('/lateral-movement', async (req, res) => {
  try {
    // Nodes: users + accessed resources (tables/files)
    const userNodes = await db.query(`SELECT id, username, role FROM users`);

    // Query access edges
    const queryEdges = await db.query(`
      SELECT u.username as source, eq.query_hash, 
             substring(eq.query_text from 'FROM\\s+(\\w+)') as target_table,
             count(*) as weight
      FROM events_query eq
      JOIN users u ON eq.user_id = u.id
      GROUP BY u.username, eq.query_hash, target_table
      ORDER BY weight DESC LIMIT 100
    `);

    // File access edges
    const fileEdges = await db.query(`
      SELECT u.username as source, efa.file_path as target, count(*) as weight
      FROM events_file_access efa
      JOIN users u ON efa.user_id = u.id
      GROUP BY u.username, efa.file_path
      ORDER BY weight DESC LIMIT 100
    `);

    // Build graph
    const nodeSet = new Set();
    const nodes = [];
    const edges = [];

    // Add user nodes
    for (const u of userNodes.rows) {
      nodeSet.add(u.username);
      nodes.push({ id: u.username, type: 'user', role: u.role });
    }

    // Add query target nodes and edges
    for (const e of queryEdges.rows) {
      const target = e.target_table || `query_${e.query_hash.substring(0, 8)}`;
      if (!nodeSet.has(target)) {
        nodeSet.add(target);
        nodes.push({ id: target, type: 'database' });
      }
      edges.push({ source: e.source, target, weight: parseInt(e.weight), type: 'query' });
    }

    // Add file access nodes and edges
    for (const e of fileEdges.rows) {
      const target = e.target.split('/').pop(); // Use filename as node label
      const fullTarget = e.target;
      if (!nodeSet.has(fullTarget)) {
        nodeSet.add(fullTarget);
        nodes.push({ id: fullTarget, label: target, type: 'file' });
      }
      edges.push({ source: e.source, target: fullTarget, weight: parseInt(e.weight), type: 'file_access' });
    }

    res.json({ nodes, edges });
  } catch (err) {
    console.error('[Dashboard] Lateral movement error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/metrics — time-to-detect and time-to-contain
router.get('/metrics', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pa.action_type,
        pa.details,
        pa.executed_at,
        pa.completed_at,
        EXTRACT(EPOCH FROM (pa.completed_at - pa.executed_at)) * 1000 as action_duration_ms,
        a.severity,
        a.detected_at
      FROM policy_actions pa
      JOIN alerts a ON pa.alert_id = a.id
      ORDER BY pa.created_at DESC LIMIT 100
    `);

    // Aggregate metrics
    const actions = result.rows;
    const ttd = actions
      .filter(a => a.details)
      .map(a => {
        const d = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
        return d.time_to_detect_ms || d.time_to_contain_ms || null;
      })
      .filter(Boolean);

    const avgTTD = ttd.length > 0 ? ttd.reduce((s, v) => s + v, 0) / ttd.length : null;

    // Count by type
    const counts = {};
    for (const a of actions) {
      counts[a.action_type] = (counts[a.action_type] || 0) + 1;
    }

    res.json({
      actions,
      summary: {
        total_actions: actions.length,
        action_counts: counts,
        avg_time_to_detect_ms: avgTTD ? Math.round(avgTTD) : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/evaluate — manually trigger evaluation for a session
router.post('/evaluate', async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    const result = await policy.evaluateSession(session_id);
    if (!result) return res.status(500).json({ error: 'Evaluation failed' });
    res.json(result);
  } catch (err) {
    console.error('[Dashboard] Evaluate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — overall system stats
router.get('/stats', async (req, res) => {
  try {
    const [users, sessions, authEvents, queryEvents, fileEvents, alerts, riskScores] = await Promise.all([
      db.query('SELECT count(*) as count FROM users'),
      db.query('SELECT count(*) as count FROM sessions'),
      db.query('SELECT count(*) as count FROM events_auth'),
      db.query('SELECT count(*) as count FROM events_query'),
      db.query('SELECT count(*) as count FROM events_file_access'),
      db.query('SELECT count(*) as count FROM alerts'),
      db.query('SELECT count(*) as count FROM risk_scores'),
    ]);

    res.json({
      users: parseInt(users.rows[0].count),
      sessions: parseInt(sessions.rows[0].count),
      events: {
        auth: parseInt(authEvents.rows[0].count),
        query: parseInt(queryEvents.rows[0].count),
        file_access: parseInt(fileEvents.rows[0].count),
        total: parseInt(authEvents.rows[0].count) + parseInt(queryEvents.rows[0].count) + parseInt(fileEvents.rows[0].count),
      },
      alerts: parseInt(alerts.rows[0].count),
      risk_scores: parseInt(riskScores.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
