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
import { SquaresFour, Shield, LockKey, ListDashes } from '@phosphor-icons/react';

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
    { id: 'dashboard', icon: <SquaresFour weight="fill" />, label: 'Dashboard' },
    { id: 'policies', icon: <Shield />, label: 'Policies' },
    { id: 'mfa', icon: <LockKey />, label: 'MFA Settings' },
    { id: 'audit', icon: <ListDashes />, label: 'Audit Logs' },
  ];

  const pageTitle = {
    dashboard: 'Dashboard',
    policies: 'Policies',
    mfa: 'MFA Settings',
    audit: 'Audit Logs',
  };

  const pageSubtitle = {
    dashboard: '',
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
            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '24px 0' }}></div>
            <div className="grid-dashboard-bottom" style={{ marginBottom: '24px' }}>
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
            <img src="/logoicon.svg" alt="SentinelPAM Logo" style={{ width: '28px', height: '28px', marginRight: '8px' }} />
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
          <div className="sidebar-status" style={{ marginBottom: '12px' }}>
            <span className="status-dot"></span>
            Monitoring Active
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1>{pageTitle[activeNav]}</h1>
          {pageSubtitle[activeNav] && <div className="page-subtitle">{pageSubtitle[activeNav]}</div>}
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
