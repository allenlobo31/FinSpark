import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Lightning, Link, Alarm, Timer } from '@phosphor-icons/react';

function AnimatedNumber({ value, suffix = '', duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(Math.floor(value * easeProgress));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count.toLocaleString()}{suffix}</>;
}

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
      value: <AnimatedNumber value={stats.events.total} />,
      icon: <Lightning weight="fill" />,
      iconBg: '#dbeafe',
      color: 'var(--color-accent)',
    },
    {
      label: 'Total Sessions',
      value: <AnimatedNumber value={stats.sessions} />,
      icon: <Link weight="bold" />,
      iconBg: '#e0f2fe',
      color: '#0284c7', // Darker blue to match image
    },
    {
      label: 'Active Alerts',
      value: <AnimatedNumber value={stats.alerts} />,
      icon: <Alarm weight="fill" />,
      iconBg: 'var(--color-critical-bg)',
      color: 'var(--color-critical)',
    },
    {
      label: 'Avg Detect Time',
      value: metrics.summary.avg_time_to_detect_ms ? <AnimatedNumber value={metrics.summary.avg_time_to_detect_ms} suffix="ms" /> : 'N/A',
      icon: <Timer weight="fill" />,
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
          style={{ animationDelay: `${idx * 60}ms`, padding: '22px' }}
        >
          <div className="stat-card">
            <div className="stat-icon" style={{ background: stat.iconBg }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
