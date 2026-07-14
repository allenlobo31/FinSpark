import React from 'react';

export default function MFASettings() {
  const users = [
    { id: 'u1', username: 'ravi_dba', role: 'dba_senior', mfa_enabled: true },
    { id: 'u2', username: 'priya_dba', role: 'dba_junior', mfa_enabled: true },
    { id: 'u3', username: 'vendor_alex', role: 'vendor_support', mfa_enabled: false },
    { id: 'u4', username: 'admin_sara', role: 'general_admin', mfa_enabled: true },
  ];

  return (
    <div className="card" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title">TOTP Enrollment</h3>
        <div className="card-subtitle">{users.filter(u => u.mfa_enabled).length}/{users.length} users enrolled</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>MFA Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`badge ${user.mfa_enabled ? 'badge-low' : 'badge-critical'}`}>
                    {user.mfa_enabled ? 'Enrolled' : 'Not Enrolled'}
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
