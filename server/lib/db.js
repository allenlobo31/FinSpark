// Shared PostgreSQL connection pool — single instance used by all server modules.
// Never create a second pool elsewhere.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  database: process.env.PG_DATABASE || 'sentinelpam',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection errors but don't crash
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a query against the shared pool.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80));
  }
  return result;
}

/**
 * Get a client from the pool for transactions.
 * Caller MUST call client.release() when done.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
