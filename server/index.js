// SentinelPAM Express Server — Entry Point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./lib/db');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.method !== 'OPTIONS') {
      console.log(`[${req.method}] ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Routes
app.use('/events', require('./routes/events'));

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as time, current_database() as db');
    res.json({
      status: 'ok',
      database: result.rows[0].db,
      time: result.rows[0].time,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Users endpoint (for dashboard + generator)
app.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, role, account_locked, mfa_required, typical_hours_start, typical_hours_end, created_at
       FROM users ORDER BY id`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   SentinelPAM API Server             ║`);
  console.log(`  ║   Port: ${PORT}                         ║`);
  console.log(`  ║   Database: ${process.env.PG_DATABASE || 'sentinelpam'}            ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});

module.exports = app;
