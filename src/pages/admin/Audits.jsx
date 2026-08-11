import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function Audits() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/audits', { params: { page, pageSize: 25, q: search || undefined } });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load audits'));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function start(id) {
    setBusyId(id);
    try {
      await api.post(`/audits/${id}/start`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start audit');
    } finally {
      setBusyId(null);
    }
  }

  async function complete(id) {
    setBusyId(id);
    try {
      await api.post(`/audits/${id}/complete`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete audit');
    } finally {
      setBusyId(null);
    }
  }

  async function rename(a) {
    const name = window.prompt('Audit name', a.name);
    if (name == null || !name.trim() || name.trim() === a.name) return;
    setBusyId(a.id);
    setError('');
    try {
      await api.patch(`/audits/${a.id}`, { name: name.trim() });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update audit');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(a) {
    if (!window.confirm(`Delete audit "${a.name}" and all its counts?`)) return;
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
      <h1 className="page-title">Audits</h1>
      <p className="page-sub">Manage physical stock audits</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Audit name or store"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
        <Link className="btn" to="/admin/audits/create">
          Create Audit
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Store</th>
              <th>Status</th>
              <th>Products</th>
              <th>Assignments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.storeName}</td>
                <td>
                  <span className={`badge ${a.status === 'ACTIVE' ? 'ok' : 'muted'}`}>{a.status}</span>
                </td>
                <td>{a._count?.products ?? '—'}</td>
                <td>{a._count?.assignments ?? '—'}</td>
                <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {a.status === 'DRAFT' && (
                    <button className="btn" type="button" disabled={busyId === a.id} onClick={() => start(a.id)}>
                      Start
                    </button>
                  )}
                  {a.status === 'ACTIVE' && (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => complete(a.id)}
                    >
                      Complete
                    </button>
                  )}
                  <Link className="btn secondary" to={`/admin/audits/${a.id}`}>
                    Monitor
                  </Link>
                  <Link className="btn secondary" to="/admin/audits/assign" state={{ auditId: a.id }}>
                    Assign
                  </Link>
                  <button className="btn secondary" type="button" disabled={busyId === a.id} onClick={() => rename(a)}>
                    Edit
                  </button>
                  <button className="btn danger" type="button" disabled={busyId === a.id} onClick={() => remove(a)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="empty">
                  No audits yet
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
