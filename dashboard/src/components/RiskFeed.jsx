import React from 'react';
import ComplianceTag from './ComplianceTag';

export default function RiskFeed({ alerts, selectedAlert, onSelectAlert }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">Live Risk Feed</h3>
        </div>
        <div className="empty-state">
          <div className="icon">✓</div>
          <div style={{ fontWeight: 600 }}>All Clear</div>
          <div>No active alerts. System is secure.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Live Risk Feed</h3>
          <div className="card-subtitle">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="badge badge-critical animate-in">
          <span style={{ marginRight: 5 }}>●</span> Live
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map((alert) => {
            const isSelected = selectedAlert?.id === alert.id;
            const isCritical = alert.severity === 'CRITICAL';

            return (
              <div 
                key={alert.id} 
                className={`alert-item animate-in ${isSelected ? 'selected' : ''} ${isCritical && !isSelected ? 'critical-pulse' : ''}`}
                onClick={() => onSelectAlert(alert)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>
                      {alert.username}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                      {alert.role}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className={`badge badge-${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(alert.event_timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ 
                    fontSize: '26px', 
                    fontWeight: 800, 
                    color: `var(--color-${alert.severity.toLowerCase()})`,
                    letterSpacing: '-0.5px',
                    lineHeight: 1
                  }}>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
