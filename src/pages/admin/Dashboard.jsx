import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="muted">Loading dashboard…</div>;

  const p = data.progress || {};

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        {data.activeAudit
          ? `Active: ${data.activeAudit.name} · ${data.activeAudit.status}`
          : 'No active audit yet'}
      </p>

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Total Products</div>
          <div className="value">{p.products ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Counted</div>
          <div className="value">{p.counted ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Pending</div>
          <div className="value">{p.pending ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Recount Required</div>
          <div className="value">{p.recountRequired ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Verified</div>
          <div className="value">{p.verified ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Finalized</div>
          <div className="value">{p.finalized ?? 0}</div>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Shortage</div>
          <div className="value">{p.shortage ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Excess</div>
          <div className="value">{p.excess ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Matched</div>
          <div className="value">{p.matched ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Staff</div>
          <div className="value">{data.totals.staffCount}</div>
        </div>
      </div>

      {p.assignments?.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem' }}>Assignments</h2>
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Staff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {p.assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.location.name}</td>
                    <td>{a.staff.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.status === 'COMPLETED' ? 'ok' : a.status === 'IN_PROGRESS' ? 'warn' : 'muted'
                        }`}
                      >
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        <Link className="btn" to="/admin/swil/import">
          Import SWIL
        </Link>
        <Link className="btn secondary" to="/admin/audits/create">
          Create Audit
        </Link>
        <Link className="btn secondary" to="/admin/reports/comparison">
          Stock Comparison
        </Link>
      </div>
    </div>
  );
}
