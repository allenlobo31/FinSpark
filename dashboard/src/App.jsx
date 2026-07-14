import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import RiskFeed from './components/RiskFeed';
import ShapBreakdown from './components/ShapBreakdown';
import SessionReplay from './components/SessionReplay';
import LateralMovementGraph from './components/LateralMovementGraph';
import Metrics from './components/Metrics';
import Policies from './components/Policies';
import MFASettings from './components/MFASettings';
import AuditLogs from './components/AuditLogs';

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');

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
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'policies', icon: '🛡️', label: 'Policies' },
    { id: 'mfa', icon: '🔐', label: 'MFA Settings' },
    { id: 'audit', icon: '📋', label: 'Audit Logs' },
  ];

  const pageTitle = {
    dashboard: 'Risk Operations Center',
    policies: 'Policy Management',
    mfa: 'MFA Settings',
    audit: 'Audit Logs',
  };

  const pageSubtitle = {
    dashboard: 'Real-time anomalous access detection and automated response',
    policies: 'Automated response rules based on ML inference',
    mfa: 'TOTP multi-factor authentication per user',
    audit: 'Quantum-safe cryptographic audit trail',
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'policies':
        return <Policies />;
      case 'mfa':
        return <MFASettings />;
      case 'audit':
        return <AuditLogs />;
      case 'dashboard':
      default:
        return (
          <>
            <Metrics />
            <div className="grid-3" style={{ marginBottom: '24px' }}>
              <RiskFeed alerts={alerts} selectedAlert={selectedAlert} onSelectAlert={setSelectedAlert} />
              <ShapBreakdown alert={selectedAlert} />
              <SessionReplay sessionId={selectedAlert?.session_id} />
            </div>
            <LateralMovementGraph />
          </>
        );
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>
            <span className="brand-icon">🔒</span>
            SentinelPAM
          </h1>
          <div className="subtitle">Privileged Access Monitor</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot"></span>
            Monitoring Active
          </div>
        </div>
      </aside>
      
      <main className="main-content">
        <div className="page-header">
          <h1>{pageTitle[activeNav]}</h1>
          <div className="page-subtitle">{pageSubtitle[activeNav]}</div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
