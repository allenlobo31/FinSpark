import React from 'react';
import { ChartBar } from '@phosphor-icons/react';

const FIXED_HEIGHT = 460;

export default function ShapBreakdown({ alert }) {
  if (!alert) {
    return (
      <div className="card" style={{ height: FIXED_HEIGHT }}>
        <div className="card-header">
          <h3 className="card-title">Risk Factors (SHAP)</h3>
        </div>
        <div className="empty-state">
          <ChartBar size={36} weight="regular" />
          <div>Select an alert to view risk factors.</div>
        </div>
      </div>
    );
  }

  const shapValues = typeof alert.shap_values === 'string' 
    ? JSON.parse(alert.shap_values) 
    : alert.shap_values || {};
    
  const featureValues = typeof alert.feature_values === 'string'
    ? JSON.parse(alert.feature_values)
    : alert.feature_values || {};

  const features = Object.keys(shapValues).map(key => ({
    name: key,
    shap: shapValues[key],
    absShap: Math.abs(shapValues[key]),
    value: featureValues[key]
  })).sort((a, b) => b.absShap - a.absShap);

  const maxAbs = Math.max(...features.map(f => f.absShap), 0.1);

  const featureLabels = {
    time_deviation: 'Time Deviation',
    peer_deviation: 'Peer Deviation',
    data_volume: 'Data Volume',
    query_novelty: 'Query Novelty',
    access_entropy: 'Access Entropy',
  };

  return (
    <div className="card" style={{ height: FIXED_HEIGHT, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Risk Factors</h3>
          <div className="card-subtitle">
            {alert.username} — Score: {alert.score}
          </div>
        </div>
        {alert.pattern_class && (
          <div className={`badge badge-${alert.pattern_class}`}>{alert.pattern_class}</div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 500, color: 'var(--text-heading)' }}>
          {alert.username} - Score: {alert.score}
        </div>
        {features.map((feature, idx) => {
          const width = (feature.absShap / maxAbs) * 100;
          const isPositive = feature.shap > 0;
          
          return (
            <div key={idx} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {featureLabels[feature.name] || feature.name}
                </div>
                <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>
                  {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '3px', height: '6px' }}>
                {[0, 1, 2, 3].map(i => {
                   const isFilled = width > (i * 25);
                   const bgColor = isFilled 
                     ? (isPositive ? '#cd5c5c' : '#16a34a') 
                     : '#e5e9f0';
                   return <div key={i} style={{ flex: 1, backgroundColor: bgColor, borderRadius: '2px', opacity: isFilled ? 0.9 : 1 }}></div>
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
