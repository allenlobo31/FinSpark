// Shared event validation — used by all ingestion endpoints.
// Single source of truth for what constitutes a valid event.

const VALID_AUTH_TYPES = new Set(['login', 'logout', 'failed_login']);
const VALID_FILE_OPS = new Set(['read', 'write', 'delete', 'list']);

/**
 * Validate auth event payload.
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
function validateAuthEvent(body) {
  const { user_id, event_type, ip_address, success, session_id } = body;

  if (!user_id || !Number.isInteger(user_id))
    return { valid: false, error: 'user_id must be a positive integer' };
  if (!event_type || !VALID_AUTH_TYPES.has(event_type))
    return { valid: false, error: `event_type must be one of: ${[...VALID_AUTH_TYPES].join(', ')}` };
  if (typeof success !== 'boolean')
    return { valid: false, error: 'success must be a boolean' };

  return {
    valid: true,
    data: {
      user_id,
      session_id: session_id || null,
      event_type,
      ip_address: ip_address || '127.0.0.1',
      success,
      event_timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate query event payload.
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
function validateQueryEvent(body) {
  const { user_id, query_text, rows_affected, duration_ms, session_id } = body;

  if (!user_id || !Number.isInteger(user_id))
    return { valid: false, error: 'user_id must be a positive integer' };
  if (!query_text || typeof query_text !== 'string' || query_text.trim().length === 0)
    return { valid: false, error: 'query_text must be a non-empty string' };

  // Compute query hash (SHA-256 of normalized query)
  const crypto = require('crypto');
  const normalized = query_text.trim().toLowerCase().replace(/\s+/g, ' ');
  const query_hash = crypto.createHash('sha256').update(normalized).digest('hex');

  return {
    valid: true,
    data: {
      user_id,
      session_id: session_id || null,
      query_text: query_text.trim(),
      query_hash,
      rows_affected: Number.isInteger(rows_affected) ? rows_affected : 0,
      duration_ms: Number.isInteger(duration_ms) ? duration_ms : 0,
      event_timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate file access event payload.
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
function validateFileAccessEvent(body) {
  const { user_id, file_path, operation, bytes_transferred, session_id } = body;

  if (!user_id || !Number.isInteger(user_id))
    return { valid: false, error: 'user_id must be a positive integer' };
  if (!file_path || typeof file_path !== 'string')
    return { valid: false, error: 'file_path must be a non-empty string' };
  if (!operation || !VALID_FILE_OPS.has(operation))
    return { valid: false, error: `operation must be one of: ${[...VALID_FILE_OPS].join(', ')}` };

  return {
    valid: true,
    data: {
      user_id,
      session_id: session_id || null,
      file_path,
      operation,
      bytes_transferred: typeof bytes_transferred === 'number' ? bytes_transferred : 0,
      event_timestamp: new Date().toISOString(),
    },
  };
}

module.exports = { validateAuthEvent, validateQueryEvent, validateFileAccessEvent };
