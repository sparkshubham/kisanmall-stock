import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function ImportedProducts() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/swil/products', {
      params: { page, pageSize: 25, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load products'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  return (
    <div>
      <h1 className="page-title">Imported Products</h1>
      <p className="page-sub">Products loaded from SWIL imports</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Name or barcode"
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
              <th>Product</th>
              <th>Barcode</th>
              <th>MRP</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.barcode}</td>
                <td>₹{Number(p.mrp).toFixed(2)}</td>
                <td>{p.unit}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="empty">
                  No products found
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
