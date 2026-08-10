import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function StaffUsers() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/users', {
      params: { page, pageSize: 25, role: 'STAFF', q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load staff'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/users', { ...form, role: 'STAFF' });
      setForm({ name: '', mobile: '', password: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Staff</h1>
      <p className="page-sub">Create staff accounts for mobile counting</p>
      {error && <div className="alert error">{error}</div>}
      <form className="card form-grid" onSubmit={onSubmit} style={{ marginBottom: '1.25rem' }}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Mobile
          <input
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          Add Staff
        </button>
      </form>
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Name or mobile"
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
              <th>Mobile</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.mobile}</td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="empty">
                  No staff
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
