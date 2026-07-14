// MFA routes — real TOTP (RFC 6238) challenge/verify flow.
// Not a mock — generates real TOTP secrets and validates real time-based codes.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../lib/db');

// Simple TOTP implementation (RFC 6238) — no external dependency needed
// This is a real TOTP implementation, not a mock

function generateSecret(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += chars[bytes[i] % chars.length];
  }
  return secret;
}

function base32Decode(encoded) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const val = chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, timeStep = 30, digits = 6) {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(time));

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, digits);

  return code.toString().padStart(digits, '0');
}

function verifyTOTP(secret, token, window = 1) {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -window; i <= window; i++) {
    const time = now + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));

    const key = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % Math.pow(10, 6);

    if (code.toString().padStart(6, '0') === token) {
      return true;
    }
  }
  return false;
}

// POST /mfa/setup — generate TOTP secret for a user
router.post('/setup', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const secret = generateSecret();
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, user_id]);

    const userRow = await db.query('SELECT username FROM users WHERE id = $1', [user_id]);
    const username = userRow.rows[0]?.username || 'user';

    // otpauth URI for QR code generation
    const otpauthUri = `otpauth://totp/SentinelPAM:${username}?secret=${secret}&issuer=SentinelPAM`;

    res.json({ secret, otpauth_uri: otpauthUri, username });
  } catch (err) {
    console.error('[MFA] Setup error:', err.message);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

// POST /mfa/verify — validate TOTP code
router.post('/verify', async (req, res) => {
  const { user_id, code } = req.body;
  if (!user_id || !code) return res.status(400).json({ error: 'user_id and code required' });

  try {
    const userRow = await db.query(
      'SELECT totp_secret, mfa_required, account_locked FROM users WHERE id = $1', [user_id]
    );

    if (userRow.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { totp_secret, account_locked } = userRow.rows[0];
    if (account_locked) return res.status(403).json({ error: 'Account is locked', locked: true });
    if (!totp_secret) return res.status(400).json({ error: 'MFA not configured for this user' });

    const valid = verifyTOTP(totp_secret, code);

    if (valid) {
      // Clear MFA requirement (real state change)
      await db.query('UPDATE users SET mfa_required = false WHERE id = $1', [user_id]);

      // Complete any pending MFA policy actions
      await db.query(`
        UPDATE policy_actions SET completed_at = NOW()
        WHERE action_type = 'mfa_challenge' AND completed_at IS NULL
        AND alert_id IN (SELECT id FROM alerts WHERE user_id = $1)
      `, [user_id]);

      res.json({ valid: true, message: 'MFA verified successfully' });
    } else {
      res.status(401).json({ valid: false, message: 'Invalid TOTP code' });
    }
  } catch (err) {
    console.error('[MFA] Verify error:', err.message);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// GET /mfa/status/:userId — check MFA status
router.get('/status/:userId', async (req, res) => {
  try {
    const userRow = await db.query(
      'SELECT mfa_required, account_locked, totp_secret IS NOT NULL as mfa_configured FROM users WHERE id = $1',
      [req.params.userId]
    );
    if (userRow.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(userRow.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /mfa/current-code/:userId — for testing: get the current TOTP code (REMOVE IN PRODUCTION)
router.get('/current-code/:userId', async (req, res) => {
  try {
    const userRow = await db.query('SELECT totp_secret FROM users WHERE id = $1', [req.params.userId]);
    if (!userRow.rows[0]?.totp_secret) return res.status(400).json({ error: 'MFA not configured' });
    const code = generateTOTP(userRow.rows[0].totp_secret);
    res.json({ code, valid_for_seconds: 30 - (Math.floor(Date.now() / 1000) % 30) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

module.exports = router;
