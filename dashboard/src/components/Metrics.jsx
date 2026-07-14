import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([api.metrics(), api.stats()])
      .then(([metricsData, statsData]) => {
        setMetrics(metricsData);
        setStats(statsData);
      })
      .catch(console.error);
  }, []);

  if (!metrics || !stats) return null;

  return (
    <div className="grid-4" style={{ marginBottom: '20px' }}>
      <div className="card animate-in" style={{ animationDelay: '0ms' }}>
        <div className="stat-card">
          <div className="stat-label">Total Events Processed</div>
          <div className="stat-value">{stats.events.total.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="card animate-in" style={{ animationDelay: '50ms' }}>
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{stats.sessions.toLocaleString()}</div>
        </div>
      </div>

      <div className="card animate-in" style={{ animationDelay: '100ms' }}>
        <div className="stat-card">
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value" style={{ color: 'var(--color-critical)' }}>
            {stats.alerts.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ animationDelay: '150ms' }}>
        <div className="stat-card">
          <div className="stat-label">Avg Time to Detect</div>
          <div className="stat-value" style={{ color: 'var(--color-accent)' }}>
            {metrics.summary.avg_time_to_detect_ms ? `${metrics.summary.avg_time_to_detect_ms}ms` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
