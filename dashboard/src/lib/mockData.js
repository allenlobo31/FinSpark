// High-fidelity mock datasets for SentinelPAM dashboard development

export const mockStats = {
  users: 4,
  sessions: 128,
  events: {
    auth: 256,
    query: 1842,
    file_access: 620,
    total: 2718
  },
  alerts: 5,
  risk_scores: 128
};

export const mockMetrics = {
  actions: [
    {
      id: 1,
      action_type: "session_kill",
      details: { time_to_detect_ms: 280, time_to_contain_ms: 450 },
      executed_at: new Date(Date.now() - 600000).toISOString(),
      completed_at: new Date(Date.now() - 599000).toISOString(),
      severity: "CRITICAL",
      detected_at: new Date(Date.now() - 600280).toISOString(),
      username: "vendor_alex"
    },
    {
      id: 2,
      action_type: "mfa_challenge",
      details: { time_to_detect_ms: 310 },
      executed_at: new Date(Date.now() - 1800000).toISOString(),
      completed_at: new Date(Date.now() - 1798500).toISOString(),
      severity: "MEDIUM",
      detected_at: new Date(Date.now() - 1800310).toISOString(),
      username: "priya_dba"
    },
    {
      id: 3,
      action_type: "log",
      details: { time_to_detect_ms: 150 },
      executed_at: new Date(Date.now() - 7200000).toISOString(),
      completed_at: new Date(Date.now() - 7199500).toISOString(),
      severity: "LOW",
      detected_at: new Date(Date.now() - 7200150).toISOString(),
      username: "ravi_dba"
    }
  ],
  summary: {
    total_actions: 12,
    action_counts: {
      log: 5,
      mfa_challenge: 4,
      session_kill: 2,
      account_lock: 1
    },
    avg_time_to_detect_ms: 320
  }
};

export const mockAlerts = [
  {
    id: 1,
    risk_score_id: 101,
    user_id: 3,
    username: "vendor_alex",
    role: "vendor_support",
    severity: "CRITICAL",
    score: 92.4,
    pattern_class: "malicious",
    event_timestamp: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    detected_at: new Date(Date.now() - 580000).toISOString(),
    resolved_at: null,
    shap_values: {
      time_deviation: 1.45,
      peer_deviation: 0.95,
      data_volume: 4.85,
      query_novelty: 3.20,
      access_entropy: 2.90
    },
    feature_values: {
      time_deviation: 12.2,
      peer_deviation: 3.8,
      data_volume: 24500000,
      query_novelty: 0.94,
      access_entropy: 3.1
    },
    session_id: 1001
  },
  {
    id: 2,
    risk_score_id: 102,
    user_id: 2,
    username: "priya_dba",
    role: "dba_junior",
    severity: "MEDIUM",
    score: 62.1,
    pattern_class: "negligent",
    event_timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    detected_at: new Date(Date.now() - 1780000).toISOString(),
    resolved_at: null,
    shap_values: {
      time_deviation: 0.12,
      peer_deviation: 2.15,
      data_volume: 2.90,
      query_novelty: 0.45,
      access_entropy: 1.10
    },
    feature_values: {
      time_deviation: 1.1,
      peer_deviation: 2.4,
      data_volume: 12400000,
      query_novelty: 0.21,
      access_entropy: 1.4
    },
    session_id: 1002
  },
  {
    id: 3,
    risk_score_id: 103,
    user_id: 1,
    username: "ravi_dba",
    role: "dba_senior",
    severity: "LOW",
    score: 28.5,
    pattern_class: "normal",
    event_timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    detected_at: new Date(Date.now() - 7180000).toISOString(),
    resolved_at: null,
    shap_values: {
      time_deviation: 0.85,
      peer_deviation: 0.10,
      data_volume: 0.20,
      query_novelty: 0.35,
      access_entropy: 0.40
    },
    feature_values: {
      time_deviation: 5.4,
      peer_deviation: 0.2,
      data_volume: 540000,
      query_novelty: 0.15,
      access_entropy: 0.6
    },
    session_id: 1003
  },
  {
    id: 4,
    risk_score_id: 104,
    user_id: 3,
    username: "vendor_alex",
    role: "vendor_support",
    severity: "MEDIUM",
    score: 54.0,
    pattern_class: "negligent",
    event_timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    detected_at: new Date(Date.now() - 14380000).toISOString(),
    resolved_at: null,
    shap_values: {
      time_deviation: 2.10,
      peer_deviation: 1.20,
      data_volume: 0.10,
      query_novelty: 0.20,
      access_entropy: 0.50
    },
    feature_values: {
      time_deviation: 18.2,
      peer_deviation: 1.8,
      data_volume: 120000,
      query_novelty: 0.08,
      access_entropy: 0.8
    },
    session_id: 1004
  },
  {
    id: 5,
    risk_score_id: 105,
    user_id: 4,
    username: "admin_sara",
    role: "general_admin",
    severity: "LOW",
    score: 12.0,
    pattern_class: "normal",
    event_timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    detected_at: new Date(Date.now() - 86380000).toISOString(),
    resolved_at: null,
    shap_values: {
      time_deviation: 0.10,
      peer_deviation: 0.10,
      data_volume: 0.10,
      query_novelty: 0.10,
      access_entropy: 0.10
    },
    feature_values: {
      time_deviation: 0.8,
      peer_deviation: 0.1,
      data_volume: 45000,
      query_novelty: 0.02,
      access_entropy: 0.2
    },
    session_id: 1005
  }
];

export const mockSessionReplay = (sessionId) => {
  const sId = parseInt(sessionId, 10);
  
  if (sId === 1001) {
    return {
      session_id: 1001,
      risk_score: {
        score: 92.4,
        pattern_class: "malicious"
      },
      anomaly_features: {
        query_novelty: 0.94,
        access_entropy: 3.1,
        data_volume: 4.85
      },
      events: [
        {
          event_category: "auth",
          event_type: "login",
          ip_address: "192.168.12.87",
          event_timestamp: new Date(Date.now() - 650000).toISOString()
        },
        {
          event_category: "query",
          query_text: "SELECT * FROM customer_pii LIMIT 10;",
          event_timestamp: new Date(Date.now() - 640000).toISOString()
        },
        {
          event_category: "file_access",
          operation: "read",
          file_path: "/var/lib/postgresql/exports/customer_pii.csv",
          event_timestamp: new Date(Date.now() - 630000).toISOString()
        },
        {
          event_category: "query",
          query_text: "COPY customer_pii TO STDOUT;",
          event_timestamp: new Date(Date.now() - 620000).toISOString()
        },
        {
          event_category: "file_access",
          operation: "write",
          file_path: "/var/log/postgresql/temp_exfil.log",
          event_timestamp: new Date(Date.now() - 610000).toISOString()
        },
        {
          event_category: "auth",
          event_type: "logout",
          ip_address: "192.168.12.87",
          event_timestamp: new Date(Date.now() - 600000).toISOString()
        }
      ]
    };
  }

  if (sId === 1002) {
    return {
      session_id: 1002,
      risk_score: {
        score: 62.1,
        pattern_class: "negligent"
      },
      anomaly_features: {
        data_volume: 2.90,
        access_entropy: 1.4
      },
      events: [
        {
          event_category: "auth",
          event_type: "login",
          ip_address: "192.168.1.102",
          event_timestamp: new Date(Date.now() - 1850000).toISOString()
        },
        {
          event_category: "query",
          query_text: "SELECT count(*) FROM orders;",
          event_timestamp: new Date(Date.now() - 1840000).toISOString()
        },
        {
          event_category: "file_access",
          operation: "read",
          file_path: "/shared/reports/quarterly_sales.xlsx",
          event_timestamp: new Date(Date.now() - 1820000).toISOString()
        },
        {
          event_category: "auth",
          event_type: "logout",
          ip_address: "192.168.1.102",
          event_timestamp: new Date(Date.now() - 1800000).toISOString()
        }
      ]
    };
  }

  if (sId === 1003) {
    return {
      session_id: 1003,
      risk_score: {
        score: 28.5,
        pattern_class: "normal"
      },
      anomaly_features: {},
      events: [
        {
          event_category: "auth",
          event_type: "login",
          ip_address: "192.168.1.105",
          event_timestamp: new Date(Date.now() - 7250000).toISOString()
        },
        {
          event_category: "query",
          query_text: "SELECT * FROM transactions WHERE amount > 10000;",
          event_timestamp: new Date(Date.now() - 7230000).toISOString()
        },
        {
          event_category: "query",
          query_text: "SELECT username, email FROM users;",
          event_timestamp: new Date(Date.now() - 7210000).toISOString()
        },
        {
          event_category: "auth",
          event_type: "logout",
          ip_address: "192.168.1.105",
          event_timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    };
  }

  return {
    session_id: sId,
    risk_score: {
      score: 10.0,
      pattern_class: "normal"
    },
    anomaly_features: {},
    events: [
      {
        event_category: "auth",
        event_type: "login",
        ip_address: "127.0.0.1",
        event_timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        event_category: "query",
        query_text: "SELECT 1;",
        event_timestamp: new Date(Date.now() - 30000).toISOString()
      },
      {
        event_category: "auth",
        event_type: "logout",
        ip_address: "127.0.0.1",
        event_timestamp: new Date(Date.now()).toISOString()
      }
    ]
  };
};

export const mockLateralMovement = {
  nodes: [
    { id: "ravi_dba", type: "user", role: "dba_senior" },
    { id: "priya_dba", type: "user", role: "dba_junior" },
    { id: "vendor_alex", type: "user", role: "vendor_support" },
    { id: "admin_sara", type: "user", role: "general_admin" },
    { id: "customer_pii", type: "database" },
    { id: "transactions", type: "database" },
    { id: "billing_info", type: "database" },
    { id: "audit_trail", type: "database" },
    { id: "quarterly_sales.xlsx", label: "quarterly_sales.xlsx", type: "file" },
    { id: "customer_pii.csv", label: "customer_pii.csv", type: "file" },
    { id: "id_rsa", label: "id_rsa", type: "file" },
    { id: "config.json", label: "config.json", type: "file" }
  ],
  edges: [
    { source: "vendor_alex", target: "customer_pii", weight: 15, type: "query" },
    { source: "vendor_alex", target: "customer_pii.csv", weight: 8, type: "file_access" },
    { source: "vendor_alex", target: "id_rsa", weight: 1, type: "file_access" },
    { source: "priya_dba", target: "transactions", weight: 45, type: "query" },
    { source: "priya_dba", target: "quarterly_sales.xlsx", weight: 5, type: "file_access" },
    { source: "ravi_dba", target: "transactions", weight: 120, type: "query" },
    { source: "ravi_dba", target: "billing_info", weight: 80, type: "query" },
    { source: "ravi_dba", target: "audit_trail", weight: 30, type: "query" },
    { source: "admin_sara", target: "config.json", weight: 12, type: "file_access" }
  ]
};
