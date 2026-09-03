import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function StaffActivity() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/activity/staff-summary', {
      params: { page, pageSize, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, pageSize, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load staff activity'));
  }, [load]);

  useEffect(() => setPage(1), [search, pageSize]);

  return (
    <div>
      <h1 className="page-title">Staff Activity</h1>
      <p className="page-sub">Last count feed and last audit / assignment per staff</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Name, username, mobile"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
        <Link className="btn secondary" to="/admin/activity">
          Full activity log
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Total counts</th>
              <th>Last feed</th>
              <th>Last product / location</th>
              <th>Last audit worked</th>
              <th>Current / last assignment</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff.id}>
                <td>
                  {r.staff.name}
                  <div className="muted" style={{ fontSize: '0.85em' }}>
                    {r.staff.username || r.staff.mobile || ''}
                  </div>
                </td>
                <td>{r.totalCounts}</td>
                <td>{r.lastFeedAt ? new Date(r.lastFeedAt).toLocaleString() : '—'}</td>
                <td>
                  {r.lastFeedProduct ? (
                    <>
                      {r.lastFeedProduct.name}
                      {r.lastFeedQty != null ? ` · qty ${r.lastFeedQty}` : ''}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {r.lastFeedLocation?.name || '—'}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {r.lastFeedAudit ? (
                    <Link to={`/admin/audits/${r.lastFeedAudit.id}`}>{r.lastFeedAudit.name}</Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {r.lastAssignment ? (
                    <>
                      <Link to={`/admin/audits/${r.lastAssignment.audit?.id}`}>
                        {r.lastAssignment.audit?.name || `Audit #${r.lastAssignment.audit?.id}`}
                      </Link>
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {r.lastAssignment.location?.name} · {r.lastAssignment.status}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {r.lastActivity ? (
                    <>
                      {r.lastActivity.at ? new Date(r.lastActivity.at).toLocaleString() : '—'}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {r.lastActivity.summary}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="empty">
                  No staff activity yet
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
