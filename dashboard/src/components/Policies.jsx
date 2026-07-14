import React from 'react';

const ROW_HEIGHT = 56;
const VISIBLE_ROWS = 3;
const TABLE_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS + 42; // 42px for header row

export default function Policies() {
  const policies = [
    {
      id: 'pol_1',
      name: 'Low Risk — Log Only',
      condition: 'Score < 40',
      action: 'Log',
      severity: 'low',
    },
    {
      id: 'pol_2',
      name: 'Medium Risk — MFA Step-up',
      condition: 'Score 40–75',
      action: 'MFA Challenge',
      severity: 'medium',
    },
    {
      id: 'pol_3',
      name: 'Critical Risk — Session Kill',
      condition: 'Score > 75',
      action: 'Kill & Lock',
      severity: 'critical',
    },
    {
      id: 'pol_4',
      name: 'After-Hours Admin Access',
      condition: 'Admin AND Hour > 22',
      action: 'MFA Challenge',
      severity: 'medium',
    },
    {
      id: 'pol_5',
      name: 'Vendor Bulk Export',
      condition: 'Vendor AND rows > 10k',
      action: 'Kill & Lock',
      severity: 'critical',
    },
  ];

  return (
    <div className="card" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <div className="card-header">
        <h3 className="card-title">Automated Response Policies</h3>
        <div className="card-subtitle">{policies.length} rules active</div>
      </div>

      <div style={{ maxHeight: TABLE_HEIGHT, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy Name</th>
              <th>Condition</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(policy => (
              <tr key={policy.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{policy.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{policy.condition}</td>
                <td>
                  <span className={`badge badge-${policy.severity}`}>{policy.action}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
