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

  const statCards = [
    {
      label: 'Total Events',
      value: stats.events.total.toLocaleString(),
      icon: '⚡',
      iconBg: '#dbeafe',
      color: 'var(--color-accent)',
    },
    {
      label: 'Total Sessions',
      value: stats.sessions.toLocaleString(),
      icon: '🔗',
      iconBg: 'var(--color-teal-bg)',
      color: 'var(--color-teal)',
    },
    {
      label: 'Active Alerts',
      value: stats.alerts.toLocaleString(),
      icon: '🚨',
      iconBg: 'var(--color-critical-bg)',
      color: 'var(--color-critical)',
    },
    {
      label: 'Avg Detect Time',
      value: metrics.summary.avg_time_to_detect_ms ? `${metrics.summary.avg_time_to_detect_ms}ms` : 'N/A',
      icon: '⏱️',
      iconBg: 'var(--color-purple-bg)',
      color: 'var(--color-purple)',
    },
  ];

  return (
    <div className="grid-4" style={{ marginBottom: '24px' }}>
      {statCards.map((stat, idx) => (
        <div
          key={idx}
          className="card animate-in"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <div className="stat-card">
            <div className="stat-icon" style={{ background: stat.iconBg }}>
              {stat.icon}
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
