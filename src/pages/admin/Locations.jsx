import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';
import SortableTh from '../../components/common/SortableTh';
import { nextSortState } from '../../utils/tableControls';

export default function Locations() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [name, setName] = useState('');
  const [type, setType] = useState('RACK');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/locations', {
      params: { page, pageSize, q: search || undefined, sortBy, sortDir },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, pageSize, search, sortBy, sortDir]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load'));
  }, [load]);

  useEffect(() => setPage(1), [search, pageSize, sortBy, sortDir]);

  function onSort(key) {
    const next = nextSortState(sortBy, sortDir, key);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setType('RACK');
    setDescription('');
    setIsActive(true);
  }

  function startEdit(l) {
    setEditingId(l.id);
    setName(l.name);
    setType(l.type);
    setDescription(l.description || '');
    setIsActive(l.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/locations/${editingId}`, { name, type, description, isActive });
      } else {
        await api.post('/locations', { name, type, description });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save location');
    } finally {
      setBusy(false);
    }
  }

  async function remove(l) {
    if (!window.confirm(`Delete location "${l.name}"?`)) return;
    setError('');
    try {
      await api.delete(`/locations/${l.id}`);
      if (editingId === l.id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete location');
    }
  }

  return (
    <div>
      <h1 className="page-title">Locations</h1>
      <p className="page-sub">Create, edit or remove racks, warehouse and other count locations</p>
      {error && <div className="alert error">{error}</div>}
      <form className="card form-grid" onSubmit={onSubmit} style={{ marginBottom: '1.25rem' }}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rack 6" required />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="RACK">Rack</option>
            <option value="WAREHOUSE">Warehouse</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </label>
        {editingId && (
          <label>
            Active
            <select value={isActive ? 'yes' : 'no'} onChange={(e) => setIsActive(e.target.value === 'yes')}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        )}
        <div className="row-actions">
          <button className="btn" type="submit" disabled={busy}>
            {editingId ? 'Update Location' : 'Add Location'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={resetForm}>
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
            placeholder="Location name"
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
              <SortableTh label="Name" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Type" sortKey="type" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Active" sortKey="isActive" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.type}</td>
                <td>{l.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn secondary sm" type="button" onClick={() => startEdit(l)}>
                      Edit
                    </button>
                    <button className="btn danger sm" type="button" onClick={() => remove(l)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="empty">
                  No locations
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
