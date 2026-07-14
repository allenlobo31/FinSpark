import React from 'react';
import ComplianceTag from './ComplianceTag';

export default function RiskFeed({ alerts, onSelectAlert }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Live Risk Feed</h3>
        </div>
        <div className="empty-state">
          <div className="icon">✓</div>
          <div>No active alerts. System is secure.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <h3 className="card-title">Live Risk Feed ({alerts.length})</h3>
        <div className="badge badge-critical animate-in">Monitoring Active</div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`card ${alert.severity === 'CRITICAL' ? 'pulse-border' : ''} animate-in`}
              style={{ cursor: 'pointer', padding: '16px', margin: 0 }}
              onClick={() => onSelectAlert(alert)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{alert.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alert.role}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className={`badge badge-${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(alert.event_timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: `var(--color-${alert.severity.toLowerCase()})` }}>
                  {alert.score}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="risk-bar">
                    <div 
                      className={`risk-bar-fill ${alert.severity.toLowerCase()}`} 
                      style={{ width: `${alert.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {alert.pattern_class && alert.pattern_class !== 'normal' && (
                <div className={`badge badge-${alert.pattern_class}`} style={{ marginBottom: '8px' }}>
                  {alert.pattern_class.toUpperCase()} PATTERN
                </div>
              )}

              <ComplianceTag severity={alert.severity} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
