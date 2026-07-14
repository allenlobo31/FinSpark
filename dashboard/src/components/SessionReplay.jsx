import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function SessionReplay({ sessionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    
    api.sessionReplay(sessionId)
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header"><h3 className="card-title">Session Replay</h3></div>
        <div className="empty-state">
          <div className="icon">🔍</div>
          <div style={{ fontWeight: 600 }}>No Session Selected</div>
          <div>Select an alert to view its session timeline.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header"><h3 className="card-title">Session Replay</h3></div>
        <div className="loading-container"><div className="spinner"></div>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header"><h3 className="card-title">Session Replay</h3></div>
        <div style={{ 
          color: 'var(--color-critical)', 
          padding: '20px', 
          fontSize: '13px',
          background: 'var(--color-critical-bg)',
          borderRadius: 'var(--radius-sm)',
          margin: '8px 0'
        }}>
          ⚠ Error: {error}
        </div>
      </div>
    );
  }

  if (!data || !data.events) return null;

  // Category icon mapping
  const categoryIcons = {
    auth: '🔑',
    query: '💾',
    file_access: '📁',
  };

  return (
    <div className="card animate-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Session Replay</h3>
          <div className="card-subtitle">
            Session #{sessionId} — {data.events.length} event{data.events.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      <div className="command-log" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {data.events.map((ev, idx) => {
          let content = '';
          let isAnomaly = false;
          
          if (ev.event_category === 'auth') {
            content = `${ev.event_type.toUpperCase()} from ${ev.ip_address} (${ev.success ? '✓ Success' : '✗ Failed'})`;
          } else if (ev.event_category === 'query') {
            content = ev.query_text;
            // Highlight as anomaly if query novelty was high in this session
            isAnomaly = data.anomaly_features?.query_novelty > 0.5;
          } else if (ev.event_category === 'file_access') {
            content = `${ev.operation.toUpperCase()} ${ev.file_path} (${ev.bytes_transferred?.toLocaleString() || 0} bytes)`;
            isAnomaly = data.anomaly_features?.access_entropy > 1.5 || data.anomaly_features?.data_volume > 1.5;
          }

          return (
            <div key={idx} className={`command-entry ${isAnomaly ? 'anomaly' : ''}`}>
              <span className="timestamp">{new Date(ev.event_timestamp).toLocaleTimeString()}</span>
              <span className="category">
                {categoryIcons[ev.event_category] || '•'} [{ev.event_category}]
              </span>
              <span style={{ color: isAnomaly ? 'var(--color-critical)' : 'var(--text-primary)' }}>{content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
