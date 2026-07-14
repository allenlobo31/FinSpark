import React from 'react';

export default function ShapBreakdown({ alert }) {
  if (!alert) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Risk Factors (SHAP)</h3>
        </div>
        <div className="empty-state">Select an alert to view risk factors.</div>
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

  return (
    <div className="card animate-in" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Risk Factors</h3>
          <div className="card-subtitle">SHAP waterfall for {alert.username} (Score: {alert.score})</div>
        </div>
        {alert.pattern_class && (
          <div className={`badge badge-${alert.pattern_class}`}>
            {alert.pattern_class}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 0' }}>
        {features.map((feature, idx) => {
          const width = (feature.absShap / maxAbs) * 50; // max 50% width from center
          const isPositive = feature.shap > 0;
          
          return (
            <div key={idx} className="shap-bar">
              <div className="shap-label" title={`Raw value: ${feature.value}`}>
                {feature.name}
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
      
      <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        <strong>Interpretation:</strong> Red bars push the risk score higher (more anomalous). 
        Green bars push the risk score lower (more normal).
        Hover over feature names to see raw values.
      </div>
    </div>
  );
}
