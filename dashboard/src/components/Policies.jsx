import React from 'react';

export default function Policies() {
  const policies = [
    {
      id: 'pol_1',
      name: 'Low Risk Threshold',
      condition: 'Risk Score < 40',
      action: 'Log Only',
      description: 'Standard access logging. No user interruption.',
      status: 'Active',
      color: 'var(--color-low)'
    },
    {
      id: 'pol_2',
      name: 'Medium Risk Step-up',
      condition: 'Risk Score 40–75',
      action: 'MFA Step-up',
      description: 'Require immediate TOTP multi-factor authentication to continue session.',
      status: 'Active',
      color: 'var(--color-medium)'
    },
    {
      id: 'pol_3',
      name: 'Critical Risk Kill',
      condition: 'Risk Score > 75',
      action: 'Session Kill & Lock',
      description: 'Immediately terminate database backend connection (pg_terminate_backend) and lock account.',
      status: 'Active',
      color: 'var(--color-critical)'
    },
    {
      id: 'pol_4',
      name: 'After-Hours Admin',
      condition: 'Role == Admin AND Hour > 22',
      action: 'MFA Step-up',
      description: 'Require MFA for all admin queries outside of normal business hours.',
      status: 'Inactive',
      color: 'var(--text-muted)'
    }
  ];

  return (
    <div className="card animate-in" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Automated Response Policies</h3>
          <div className="card-subtitle">Manage automated actions taken by the Policy Engine based on ML inference.</div>
        </div>
        <button className="badge badge-medium" style={{ cursor: 'pointer', border: 'none' }}>+ New Policy</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy Name</th>
              <th>Condition</th>
              <th>Automated Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(policy => (
              <tr key={policy.id}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ color: 'var(--text-heading)' }}>{policy.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>
                    {policy.description}
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{policy.condition}</td>
                <td>
                  <span style={{ 
                    color: policy.color, 
                    fontWeight: 600,
                    background: policy.color === 'var(--text-muted)' ? 'var(--bg-card-hover)' : `${policy.color}15`,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {policy.action}
                  </span>
                </td>
                <td>
                  <span className={`badge ${policy.status === 'Active' ? 'badge-low' : ''}`} style={policy.status === 'Inactive' ? { background: 'var(--bg-card-hover)', color: 'var(--text-muted)' } : {}}>
                    {policy.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
