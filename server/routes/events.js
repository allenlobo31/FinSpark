// Event ingestion routes — POST /events/auth, /events/query, /events/file-access
// Validates and persists real event records to Postgres.

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { validateAuthEvent, validateQueryEvent, validateFileAccessEvent } = require('../lib/validate');

// POST /events/auth
router.post('/auth', async (req, res) => {
  const result = validateAuthEvent(req.body);
  if (!result.valid) return res.status(400).json({ error: result.error });

  try {
    const { data } = result;
    const row = await db.query(
      `INSERT INTO events_auth (user_id, session_id, event_timestamp, event_type, ip_address, success)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.user_id, data.session_id, data.event_timestamp, data.event_type, data.ip_address, data.success]
    );
    res.status(201).json({ id: row.rows[0].id, type: 'auth', timestamp: data.event_timestamp });
  } catch (err) {
    console.error('[Events] Auth insert error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /events/query
router.post('/query', async (req, res) => {
  const result = validateQueryEvent(req.body);
  if (!result.valid) return res.status(400).json({ error: result.error });

  try {
    const { data } = result;
    const row = await db.query(
      `INSERT INTO events_query (user_id, session_id, event_timestamp, query_text, query_hash, rows_affected, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [data.user_id, data.session_id, data.event_timestamp, data.query_text, data.query_hash, data.rows_affected, data.duration_ms]
    );
    res.status(201).json({ id: row.rows[0].id, type: 'query', timestamp: data.event_timestamp });
  } catch (err) {
    console.error('[Events] Query insert error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /events/file-access
router.post('/file-access', async (req, res) => {
  const result = validateFileAccessEvent(req.body);
  if (!result.valid) return res.status(400).json({ error: result.error });

  try {
    const { data } = result;
    const row = await db.query(
      `INSERT INTO events_file_access (user_id, session_id, event_timestamp, file_path, operation, bytes_transferred)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.user_id, data.session_id, data.event_timestamp, data.file_path, data.operation, data.bytes_transferred]
    );
    res.status(201).json({ id: row.rows[0].id, type: 'file_access', timestamp: data.event_timestamp });
  } catch (err) {
    console.error('[Events] File access insert error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /events — retrieve events for dashboard (with optional filters)
router.get('/', async (req, res) => {
  const { user_id, type, limit = 100, offset = 0 } = req.query;

  try {
    const events = [];

    // Fetch from all event tables and merge
    const filters = [];
    const params = [];
    if (user_id) {
      filters.push(`user_id = $${params.length + 1}`);
      params.push(parseInt(user_id, 10));
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    if (!type || type === 'auth') {
      const authRows = await db.query(
        `SELECT id, user_id, session_id, event_timestamp, event_type, ip_address, success, 'auth' as event_category
         FROM events_auth ${where} ORDER BY event_timestamp DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );
      events.push(...authRows.rows);
    }

    if (!type || type === 'query') {
      const queryRows = await db.query(
        `SELECT id, user_id, session_id, event_timestamp, query_text, query_hash, rows_affected, duration_ms, 'query' as event_category
         FROM events_query ${where} ORDER BY event_timestamp DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );
      events.push(...queryRows.rows);
    }

    if (!type || type === 'file_access') {
      const fileRows = await db.query(
        `SELECT id, user_id, session_id, event_timestamp, file_path, operation, bytes_transferred, 'file_access' as event_category
         FROM events_file_access ${where} ORDER BY event_timestamp DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );
      events.push(...fileRows.rows);
    }

    // Sort merged events by timestamp descending
    events.sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp));

    res.json({ count: events.length, events });
  } catch (err) {
    console.error('[Events] Fetch error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /events/sessions — list sessions
router.get('/sessions', async (req, res) => {
  const { user_id, limit = 50 } = req.query;
  try {
    let sql = `SELECT s.*, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id`;
    const params = [];
    if (user_id) {
      sql += ` WHERE s.user_id = $1`;
      params.push(parseInt(user_id, 10));
    }
    sql += ` ORDER BY s.started_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const result = await db.query(sql, params);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('[Events] Sessions fetch error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /events/sessions — create a new session
router.post('/sessions', async (req, res) => {
  const { user_id, pg_backend_pid } = req.body;
  if (!user_id || !Number.isInteger(user_id))
    return res.status(400).json({ error: 'user_id must be a positive integer' });

  try {
    const row = await db.query(
      `INSERT INTO sessions (user_id, pg_backend_pid) VALUES ($1, $2) RETURNING id, started_at`,
      [user_id, pg_backend_pid || null]
    );
    res.status(201).json({ session_id: row.rows[0].id, started_at: row.rows[0].started_at });
  } catch (err) {
    console.error('[Events] Session create error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
