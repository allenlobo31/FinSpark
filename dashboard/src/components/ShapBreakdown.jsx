import React from 'react';

const FIXED_HEIGHT = 460;

export default function ShapBreakdown({ alert }) {
  if (!alert) {
    return (
      <div className="card" style={{ height: FIXED_HEIGHT }}>
        <div className="card-header">
          <h3 className="card-title">Risk Factors (SHAP)</h3>
        </div>
        <div className="empty-state">
          <div className="icon">📊</div>
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
        {features.map((feature, idx) => {
          const width = (feature.absShap / maxAbs) * 45;
          const isPositive = feature.shap > 0;
          
          return (
            <div key={idx} className="shap-bar">
              <div className="shap-label" title={`Raw: ${feature.value?.toFixed?.(4) ?? feature.value}`}>
                {featureLabels[feature.name] || feature.name}
              </div>
              <div className="shap-bar-container">
                <div className="shap-bar-center"></div>
                <div 
                  className={`shap-bar-fill ${isPositive ? 'positive' : 'negative'}`}
                  style={{ width: `${width}%` }}
                ></div>
              </div>
              <div className="shap-value" style={{ color: isPositive ? 'var(--color-critical)' : 'var(--color-low)' }}>
                {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ flexShrink: 0, paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>■</span> Higher risk&nbsp;&nbsp;
        <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>■</span> Lower risk
      </div>
    </div>
  );
}
