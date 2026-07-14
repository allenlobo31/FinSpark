import React from 'react';

export default function AuditLogs() {
  const logs = [
    { id: 'evt_9942', type: 'Session Kill', user: 'vendor_alex', target: 'pg_terminate_backend(10442)', time: '10:42:15 AM', verified: true },
    { id: 'evt_9941', type: 'Alert', user: 'vendor_alex', target: 'Score: 89.4 — Malicious', time: '10:42:14 AM', verified: true },
    { id: 'evt_9940', type: 'Data Exfil', user: 'vendor_alex', target: 'COPY customer_pii TO STDOUT', time: '10:42:12 AM', verified: true },
    { id: 'evt_9939', type: 'MFA OK', user: 'priya_dba', target: 'TOTP Validated', time: '10:35:00 AM', verified: true },
    { id: 'evt_9938', type: 'Alert', user: 'priya_dba', target: 'Score: 62.1 — Negligent', time: '10:34:45 AM', verified: true },
    { id: 'evt_9937', type: 'Login', user: 'ravi_dba', target: '192.168.1.105', time: '09:00:12 AM', verified: true },
  ];

  const getBadgeClass = (type) => {
    if (type.includes('Kill') || type.includes('Exfil')) return 'badge-critical';
    if (type.includes('Alert')) return 'badge-medium';
    return 'badge-low';
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title">Quantum-Safe Audit Trail</h3>
        <div className="badge badge-low">🔒 PQC Verified</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Event</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{log.time}</td>
                <td style={{ fontWeight: 600 }}>{log.user}</td>
                <td><span className={`badge ${getBadgeClass(log.type)}`}>{log.type}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{log.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
