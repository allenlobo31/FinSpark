import React from 'react';

export default function ShapBreakdown({ alert }) {
  if (!alert) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">Risk Factors (SHAP)</h3>
        </div>
        <div className="empty-state">
          <div className="icon">📊</div>
          <div style={{ fontWeight: 600 }}>No Alert Selected</div>
          <div>Select an alert to view its risk factor breakdown.</div>
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

  // Sort by absolute SHAP value descending
  const features = Object.keys(shapValues).map(key => ({
    name: key,
    shap: shapValues[key],
    absShap: Math.abs(shapValues[key]),
    value: featureValues[key]
  })).sort((a, b) => b.absShap - a.absShap);

  // Find max absolute value for scaling
  const maxAbs = Math.max(...features.map(f => f.absShap), 0.1);

  // Friendly feature name mapping
  const featureLabels = {
    time_deviation: 'Time Deviation',
    peer_deviation: 'Peer Deviation',
    data_volume: 'Data Volume',
    query_novelty: 'Query Novelty',
    access_entropy: 'Access Entropy',
  };

  return (
    <div className="card animate-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Risk Factors</h3>
          <div className="card-subtitle">
            SHAP analysis for <strong>{alert.username}</strong> — Score: <strong>{alert.score}</strong>
          </div>
        </div>
        {alert.pattern_class && (
          <div className={`badge badge-${alert.pattern_class}`}>
            {alert.pattern_class}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 0', flex: 1 }}>
        {features.map((feature, idx) => {
          const width = (feature.absShap / maxAbs) * 45; // max 45% width from center
          const isPositive = feature.shap > 0;
          
          return (
            <div key={idx} className="shap-bar" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="shap-label" title={`Raw value: ${feature.value?.toFixed?.(4) ?? feature.value}`}>
                {featureLabels[feature.name] || feature.name}
              </div>
              <div className="shap-bar-container">
                <div className="shap-bar-center"></div>
                <div 
                  className={`shap-bar-fill ${isPositive ? 'positive' : 'negative'}`}
                  style={{ width: `${width}%` }}
                ></div>
              </div>
              <div className="shap-value" style={{ 
                color: isPositive ? 'var(--color-critical)' : 'var(--color-low)'
              }}>
                {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ 
        marginTop: 'auto', 
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '11px', 
        color: 'var(--text-muted)', 
        lineHeight: 1.6 
      }}>
        <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>■</span> Red pushes risk higher&nbsp;&nbsp;
        <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>■</span> Green pushes risk lower&nbsp;&nbsp;
        <span style={{ color: 'var(--text-muted)' }}>• Hover labels for raw values</span>
      </div>
    </div>
  );
}
