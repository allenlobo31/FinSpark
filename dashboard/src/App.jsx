import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import RiskFeed from './components/RiskFeed';
import ShapBreakdown from './components/ShapBreakdown';
import SessionReplay from './components/SessionReplay';
import LateralMovementGraph from './components/LateralMovementGraph';
import Metrics from './components/Metrics';

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    api.alerts()
      .then(res => {
        setAlerts(res.alerts || []);
        if (loading) setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch alerts:', err);
        if (loading) setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>SentinelPAM</h1>
          <div className="subtitle">Privileged Access Monitor</div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active"><span className="icon">👁️</span> Dashboard</button>
          <button className="nav-item"><span className="icon">🛡️</span> Policies</button>
          <button className="nav-item"><span className="icon">🔒</span> MFA Settings</button>
          <button className="nav-item"><span className="icon">📜</span> Audit Logs</button>
        </nav>
      </aside>
      
      <main className="main-content">
        <div className="page-header">
          <h2>Risk Operations Center</h2>
          <div className="page-subtitle">Real-time anomalous access detection and automated response</div>
        </div>

        <Metrics />

        <div className="grid-3" style={{ height: '500px', marginBottom: '20px' }}>
          <div style={{ height: '100%' }}>
            <RiskFeed alerts={alerts} onSelectAlert={setSelectedAlert} />
          </div>
          <div style={{ height: '100%' }}>
            <ShapBreakdown alert={selectedAlert} />
          </div>
          <div style={{ height: '100%' }}>
            <SessionReplay sessionId={selectedAlert?.session_id} />
          </div>
        </div>

        <LateralMovementGraph />

      </main>
    </div>
  );
}
