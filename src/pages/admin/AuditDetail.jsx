import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';

export default function AuditDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    const res = await api.get(`/audits/${id}`);
    setData(res.data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load audit'));
    const t = setInterval(() => {
      load().catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [id]);

  async function action(path, key) {
    setBusy(key);
    setError('');
    try {
      await api.post(`/audits/${id}/${path}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (!data && !error) return <div className="muted">Loading audit…</div>;
  if (error && !data) return <div className="alert error">{error}</div>;

  const p = data.progress || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{data.name}</h1>
          <p className="page-sub">
            {data.storeName} · <span className="badge ok">{data.status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'start' }}>
          {data.status === 'DRAFT' && (
            <button className="btn" type="button" disabled={!!busy} onClick={() => action('start', 'start')}>
              Start Audit
            </button>
          )}
          {data.status === 'ACTIVE' && (
            <button
              className="btn secondary"
              type="button"
              disabled={!!busy}
              onClick={() => action('complete', 'complete')}
            >
              Complete
            </button>
          )}
          {(data.status === 'ACTIVE' || data.status === 'COMPLETED') && (
            <button className="btn" type="button" disabled={!!busy} onClick={() => action('finalize', 'finalize')}>
              Finalize Verified
            </button>
          )}
          <Link className="btn secondary" to="/admin/audits/assign" state={{ auditId: Number(id) }}>
            Assign Staff
          </Link>
          <Link className="btn secondary" to="/admin/reports/comparison">
            Comparison
          </Link>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Products</div>
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
      </div>

      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem' }}>Staff Assignments</h2>
      <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Staff</th>
              <th>Mobile</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(p.assignments || data.assignments || []).map((a) => (
              <tr key={a.id}>
                <td>{a.location?.name}</td>
                <td>{a.staff?.name}</td>
                <td>{a.staff?.mobile}</td>
                <td>
                  <span
                    className={`badge ${
                      a.status === 'COMPLETED' ? 'ok' : a.status === 'IN_PROGRESS' ? 'warn' : 'muted'
                    }`}
                  >
                    {String(a.status || '').replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {!(p.assignments || data.assignments || []).length && (
              <tr>
                <td colSpan={4} className="empty">
                  No staff assigned yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
