import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const ACTION_LABELS = {
  LOGIN: 'Login',
  COUNT_SAVE: 'Count saved',
  STOCK_IMPORT: 'Stock import',
  AUDIT_CREATE: 'Audit created',
  AUDIT_ASSIGN: 'Staff assigned',
  AUDIT_START: 'Audit started',
  AUDIT_COMPLETE: 'Audit completed',
  AUDIT_FINALIZE: 'Audit finalized',
  ASSIGNMENT_COMPLETE: 'Assignment done',
  AUDIT_BACKUP: 'Audit backup',
};

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [auditId, setAuditId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/activity', {
      params: {
        page,
        pageSize,
        q: search || undefined,
        action: action || undefined,
        auditId: auditId ? Number(auditId) : undefined,
      },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, pageSize, search, action, auditId]);

  useEffect(() => {
    api
      .get('/activity/actions')
      .then(({ data }) => setActions(data.actions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load activity'));
  }, [load]);

  useEffect(() => setPage(1), [search, pageSize, action, auditId]);

  return (
    <div>
      <h1 className="page-title">Activity Log</h1>
      <p className="page-sub">Who did what — logins, stock feeds, imports, and audit actions</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="User or summary"
          />
        </label>
        <label>
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </label>
        <label>
          Audit ID
          <input
            value={auditId}
            onChange={(e) => setAuditId(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 12"
            inputMode="numeric"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
        <Link className="btn secondary" to="/admin/activity/staff">
          Staff last feed
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Summary</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                <td>
                  {r.user?.name || '—'}
                  <div className="muted" style={{ fontSize: '0.85em' }}>
                    {r.user?.role}
                    {r.user?.username ? ` · ${r.user.username}` : ''}
                  </div>
                </td>
                <td>
                  <span className="badge">{ACTION_LABELS[r.action] || r.action}</span>
                </td>
                <td>{r.summary}</td>
                <td>
                  {r.auditId ? (
                    <Link to={`/admin/audits/${r.auditId}`}>#{r.auditId}</Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="empty">
                  No activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
