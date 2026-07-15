// Shared API client — all fetch calls in one place. Never duplicate API logic.

// In development, this is empty (uses Vite proxy). 
// In production, it uses the environment variable if set.
const BASE = import.meta.env?.VITE_API_BASE_URL || '';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => fetchJSON('/health'),

  // Stats
  stats: () => fetchJSON('/api/stats'),

  // Users
  users: () => fetchJSON('/users'),

  // Events
  events: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/events?${qs}`);
  },

  // Sessions
  sessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/events/sessions?${qs}`);
  },

  // Risk Scores
  riskScores: (limit = 50) => fetchJSON(`/api/risk-scores?limit=${limit}`),

  // Alerts
  alerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/api/alerts?${qs}`);
  },

  // Session Replay
  sessionReplay: (sessionId) => fetchJSON(`/api/session-replay/${sessionId}`),

  // Lateral Movement
  lateralMovement: () => fetchJSON('/api/lateral-movement'),

  // Metrics
  metrics: () => fetchJSON('/api/metrics'),

  // Evaluate session
  evaluate: (sessionId) => fetchJSON('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  }),

  // MFA
  mfaSetup: (userId) => fetchJSON('/mfa/setup', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),
  mfaVerify: (userId, code) => fetchJSON('/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, code }),
  }),
  mfaStatus: (userId) => fetchJSON(`/mfa/status/${userId}`),
};
