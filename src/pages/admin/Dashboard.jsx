import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

function StatLink({ to, label, value, disabled }) {
  if (disabled || !to) {
    return (
      <div className="stat">
        <div className="label">{label}</div>
        <div className="value">{value ?? 0}</div>
      </div>
    );
  }
  return (
    <Link className="stat stat-link" to={to}>
      <div className="label">{label}</div>
      <div className="value">{value ?? 0}</div>
      <div className="stat-hint">View list →</div>
    </Link>
  );
}

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
  const auditId = data.activeAudit?.id;
  const q = auditId ? `?auditId=${auditId}` : '';

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        {data.activeAudit
          ? `Active: ${data.activeAudit.name} · ${data.activeAudit.status}`
          : 'No active audit yet'}
        {auditId ? ' — click a card to open that product list' : ''}
      </p>

      <div className="grid-stats">
        <StatLink to={auditId ? `/admin/stock/all${q}` : null} label="Total Products" value={p.products} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/counted${q}` : null} label="Counted" value={p.counted} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/pending${q}` : null} label="Pending" value={p.pending} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/recount${q}` : null} label="Recount Required" value={p.recountRequired} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/verified${q}` : null} label="Verified" value={p.verified} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/finalized${q}` : null} label="Finalized" value={p.finalized} disabled={!auditId} />
      </div>

      <div className="grid-stats">
        <StatLink to={auditId ? `/admin/stock/shortage${q}` : null} label="Shortage" value={p.shortage} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/excess${q}` : null} label="Excess" value={p.excess} disabled={!auditId} />
        <StatLink to={auditId ? `/admin/stock/matched${q}` : null} label="Matched" value={p.matched} disabled={!auditId} />
        <StatLink to="/admin/activity/staff" label="Staff" value={data.totals?.staffCount} />
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
        {auditId && (
          <Link className="btn secondary" to={`/admin/stock/all?auditId=${auditId}`}>
            All products
          </Link>
        )}
      </div>
    </div>
  );
}
