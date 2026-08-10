import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function ImportHistory() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/swil/history', {
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

  return (
    <div>
      <h1 className="page-title">Import History</h1>
      <p className="page-sub">Past SWIL stock uploads</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Filename"
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
              <th>ID</th>
              <th>File</th>
              <th>Products</th>
              <th>Imported By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.filename}</td>
                <td>{r.productCount}</td>
                <td>{r.importedBy?.name}</td>
                <td>{new Date(r.importedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="empty">
                  No imports yet
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
