import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

export default function MyCounts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const auditId = sessionStorage.getItem('auditId');
    const { data } = await api.get('/counts/my-counts', {
      params: {
        page,
        pageSize: 25,
        q: search || undefined,
        ...(auditId ? { auditId } : {}),
      },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load counts'));
  }, [load]);

  useEffect(() => setPage(1), [search]);

  return (
    <div>
      <button className="btn secondary" type="button" onClick={() => navigate('/staff')}>
        ← Back
      </button>
      <h1 className="page-title" style={{ marginTop: '1rem' }}>
        My Counts
      </h1>
      <p className="page-sub">Only your counting records — no SWIL or shortage data</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
            placeholder="Product or barcode"
          />
        </label>
        <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
          Search
        </button>
      </div>
      <div className="count-list">
        {rows.map((r) => (
          <div className="count-item" key={r.id}>
            <strong>✓ {r.product.name}</strong>
            <div className="muted" style={{ marginTop: '0.25rem' }}>
              {r.location.name} · {r.quantity} {r.product.unit}
            </div>
          </div>
        ))}
        {!rows.length && <div className="empty">No counts yet. Start scanning.</div>}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
