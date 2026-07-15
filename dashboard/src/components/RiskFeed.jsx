import React from 'react';
import ComplianceTag from './ComplianceTag';
import { CheckCircle } from '@phosphor-icons/react';

const FIXED_HEIGHT = 460;

export default function RiskFeed({ alerts, selectedAlert, onSelectAlert }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card" style={{ height: FIXED_HEIGHT }}>
        <div className="card-header">
          <h3 className="card-title">Live Risk Feed</h3>
        </div>
        <div className="empty-state">
          <CheckCircle size={36} weight="regular" />
          <div>No active alerts. System is secure.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: FIXED_HEIGHT, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Live Risk Feed</h3>
          <div className="card-subtitle">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="badge badge-critical" style={{ color: 'var(--color-critical)', backgroundColor: 'var(--color-critical-bg)', borderColor: 'var(--color-critical-border)' }}>LIVE</div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map((alert) => {
            const isSelected = selectedAlert?.id === alert.id;

            return (
              <div 
                key={alert.id} 
                className={`alert-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectAlert(alert)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>{alert.username}</div>
                  <div className={`badge badge-${alert.pattern_class && alert.pattern_class !== 'normal' ? alert.pattern_class : alert.severity.toLowerCase()}`}>
                    {alert.pattern_class && alert.pattern_class !== 'normal' ? alert.pattern_class.toUpperCase() : alert.severity.toUpperCase()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{alert.severity.toUpperCase()}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{alert.score}</div>
                </div>
                
                <div className="risk-bar" style={{ marginBottom: '12px' }}>
                  <div className={`risk-bar-fill ${alert.severity.toLowerCase()}`} style={{ width: `${alert.score}%` }}></div>
                </div>

                <ComplianceTag severity={alert.severity} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
