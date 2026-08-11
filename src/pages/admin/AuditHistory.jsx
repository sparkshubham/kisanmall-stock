import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function AuditHistory() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/audits/history', {
      params: { page, pageSize: 25, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load history'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  async function remove(a) {
    if (!window.confirm(`Delete audit "${a.name}"?`)) return;
    setBusyId(a.id);
    setError('');
    try {
      await api.delete(`/audits/${a.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete audit');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Audit History</h1>
      <p className="page-sub">Completed and finalized audits</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Audit name"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Store</th>
              <th>Status</th>
              <th>Products</th>
              <th>Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.storeName}</td>
                <td>
                  <span className="badge ok">{a.status}</span>
                </td>
                <td>{a._count?.products ?? '—'}</td>
                <td>{a.completedAt ? new Date(a.completedAt).toLocaleString() : '—'}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn secondary sm" to={`/admin/audits/${a.id}`}>
                      View
                    </Link>
                    <button className="btn danger sm" type="button" disabled={busyId === a.id} onClick={() => remove(a)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="empty">
                  No completed audits yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
