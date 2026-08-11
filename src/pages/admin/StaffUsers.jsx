import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const emptyForm = { name: '', username: '', mobile: '', password: '', isActive: true };

export default function StaffUsers() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
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

  function startEdit(u) {
    setEditingId(u.id);
    setForm({ name: u.name, username: u.username || '', mobile: u.mobile, password: '', isActive: u.isActive });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        const payload = { name: form.name, username: form.username, mobile: form.mobile, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', { ...form, role: 'STAFF' });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save staff');
    } finally {
      setBusy(false);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Delete staff "${u.name}"?`)) return;
    setError('');
    try {
      await api.delete(`/users/${u.id}`);
      if (editingId === u.id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete staff');
    }
  }

  return (
    <div>
      <h1 className="page-title">Staff</h1>
      <p className="page-sub">Create, edit or remove staff accounts for mobile counting</p>
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
          Username
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="ashok"
            required={!editingId}
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
          Password {editingId ? '(leave blank to keep)' : ''}
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required={!editingId}
          />
        </label>
        {editingId && (
          <label>
            Active
            <select
              value={form.isActive ? 'yes' : 'no'}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'yes' }))}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        )}
        <div className="row-actions">
          <button className="btn" type="submit" disabled={busy}>
            {editingId ? 'Update Staff' : 'Add Staff'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
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
              <th>Username</th>
              <th>Mobile</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username || '—'}</td>
                <td>{u.mobile}</td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn secondary sm" type="button" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    <button className="btn danger sm" type="button" onClick={() => remove(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="empty">
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
