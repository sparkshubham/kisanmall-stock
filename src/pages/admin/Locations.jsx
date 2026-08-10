import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function Locations() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('RACK');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/locations', {
      params: { page, pageSize: 25, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/locations', { name, type });
      setName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create location');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Locations</h1>
      <p className="page-sub">Racks, warehouse and other count locations</p>
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
        <button className="btn" type="submit" disabled={busy}>
          Add Location
        </button>
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
              <th>Name</th>
              <th>Type</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.type}</td>
                <td>{l.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="empty">
                  No locations
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
