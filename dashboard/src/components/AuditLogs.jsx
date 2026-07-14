import React from 'react';

export default function AuditLogs() {
  const logs = [
    { id: 'evt_9942', type: 'Session Kill', user: 'vendor_alex', target: 'pg_terminate_backend(10442)', time: '10:42:15 AM', pqc_status: 'Verified (Dilithium)' },
    { id: 'evt_9941', type: 'Alert Trigger', user: 'vendor_alex', target: 'Risk Score: 89.4 (Malicious)', time: '10:42:14 AM', pqc_status: 'Verified (Dilithium)' },
    { id: 'evt_9940', type: 'Data Exfil', user: 'vendor_alex', target: 'COPY customer_pii TO STDOUT', time: '10:42:12 AM', pqc_status: 'Verified (Dilithium)' },
    { id: 'evt_9939', type: 'MFA Success', user: 'priya_dba', target: 'TOTP Validated', time: '10:35:00 AM', pqc_status: 'Verified (Dilithium)' },
    { id: 'evt_9938', type: 'Alert Trigger', user: 'priya_dba', target: 'Risk Score: 62.1 (Negligent)', time: '10:34:45 AM', pqc_status: 'Verified (Dilithium)' },
    { id: 'evt_9937', type: 'Login', user: 'ravi_dba', target: '192.168.1.105', time: '09:00:12 AM', pqc_status: 'Verified (Dilithium)' },
  ];

  return (
    <div className="card animate-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Quantum-Safe Audit Trail</h3>
          <div className="card-subtitle">Immutable log of security events, signed with ML-DSA (Dilithium) and encrypted via ML-KEM (Kyber).</div>
        </div>
        <div className="badge badge-low">
          <span style={{ marginRight: 5 }}>🔒</span> PQC Active
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Timestamp</th>
              <th>User</th>
              <th>Event Type</th>
              <th>Target / Details</th>
              <th>Cryptographic Proof</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{log.id}</td>
                <td style={{ fontSize: '12px' }}>{log.time}</td>
                <td style={{ fontWeight: 600 }}>{log.user}</td>
                <td>
                  <span className={`badge ${
                    log.type.includes('Kill') || log.type.includes('Exfil') ? 'badge-critical' : 
                    log.type.includes('Alert') ? 'badge-medium' : 'badge-low'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{log.target}</td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-teal)', fontSize: '11px', fontWeight: 600, background: 'var(--color-teal-bg)', padding: '4px 8px', borderRadius: '4px' }}>
                    <span>✓</span> {log.pqc_status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '12px', 
        color: 'var(--text-muted)'
      }}>
        <strong>Note:</strong> In this demo, these logs simulate the output of the Python <code>audit_crypto.py</code> module which uses <code>liboqs-python</code> to perform real Post-Quantum Cryptography operations before persisting to PostgreSQL.
      </div>
    </div>
  );
}
