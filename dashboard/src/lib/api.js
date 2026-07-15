// Shared API client — all fetch calls in one place. Never duplicate API logic.
import { mockStats, mockMetrics, mockAlerts, mockSessionReplay, mockLateralMovement } from './mockData';

// In development, this is empty (uses Vite proxy). 
// In production, it uses the environment variable if set.
const BASE = import.meta.env?.VITE_API_BASE_URL || '';

export const getMockMode = () => {
  const mode = localStorage.getItem('useMockData');
  return mode === null ? true : mode === 'true';
};

export const setMockMode = (value) => {
  localStorage.setItem('useMockData', String(value));
};

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
  health: () => getMockMode()
    ? Promise.resolve({ status: 'ok' })
    : fetchJSON('/health'),

  // Stats
  stats: () => getMockMode()
    ? Promise.resolve(mockStats)
    : fetchJSON('/api/stats'),

  // Users
  users: () => getMockMode()
    ? Promise.resolve({ users: mockAlerts.map(a => ({ id: a.user_id, username: a.username, role: a.role })) })
    : fetchJSON('/users'),

  // Events
  events: (params = {}) => {
    if (getMockMode()) {
      return Promise.resolve({ events: [] });
    }
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/events?${qs}`);
  },

  // Sessions
  sessions: (params = {}) => {
    if (getMockMode()) {
      return Promise.resolve({ sessions: [] });
    }
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/events/sessions?${qs}`);
  },

  // Risk Scores
  riskScores: (limit = 50) => getMockMode()
    ? Promise.resolve({ risk_scores: mockAlerts })
    : fetchJSON(`/api/risk-scores?limit=${limit}`),

  // Alerts
  alerts: (params = {}) => {
    if (getMockMode()) {
      return Promise.resolve({ alerts: mockAlerts });
    }
    const qs = new URLSearchParams(params).toString();
    return fetchJSON(`/api/alerts?${qs}`);
  },

  // Session Replay
  sessionReplay: (sessionId) => getMockMode()
    ? Promise.resolve(mockSessionReplay(sessionId))
    : fetchJSON(`/api/session-replay/${sessionId}`),

  // Lateral Movement
  lateralMovement: () => getMockMode()
    ? Promise.resolve(mockLateralMovement)
    : fetchJSON('/api/lateral-movement'),

  // Metrics
  metrics: () => getMockMode()
    ? Promise.resolve(mockMetrics)
    : fetchJSON('/api/metrics'),

  // Evaluate session
  evaluate: (sessionId) => getMockMode()
    ? Promise.resolve({ success: true, evaluated: true })
    : fetchJSON('/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      }),

  // MFA
  mfaSetup: (userId) => getMockMode()
    ? Promise.resolve({ success: true })
    : fetchJSON('/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
  mfaVerify: (userId, code) => getMockMode()
    ? Promise.resolve({ success: true })
    : fetchJSON('/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, code }),
      }),
  mfaStatus: (userId) => getMockMode()
    ? Promise.resolve({ mfa_enabled: true })
    : fetchJSON(`/mfa/status/${userId}`),
};
