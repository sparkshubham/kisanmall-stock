import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const titles = {
  physical: 'Physical Stock',
  shortage: 'Shortage',
  excess: 'Excess',
  matched: 'Matched Stock',
  recount: 'Recount Required',
};

const apiStatus = {
  physical: 'PHYSICAL',
  shortage: 'SHORTAGE',
  excess: 'EXCESS',
  matched: 'MATCHED',
  recount: 'RECOUNT',
};

export default function StockViews() {
  const { type } = useParams();
  const [audits, setAudits] = useState([]);
  const [auditId, setAuditId] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!auditId || !type) return;
    setError('');
    const { data } = await api.get(`/audits/${auditId}/stock/${apiStatus[type] || 'PHYSICAL'}`, {
      params: { page, pageSize: 25, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [auditId, type, page, search]);

  useEffect(() => {
    api.get('/audits', { params: { pageSize: 200 } }).then((res) => {
      const list = res.data.rows || res.data;
      setAudits(list);
      if (list[0]) setAuditId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load stock'));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [type, auditId, search]);

  async function markRecount(productId) {
    setBusy(productId);
    try {
      await api.post(`/audits/${auditId}/products/${productId}/recount`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function verify(productId) {
    setBusy(productId);
    try {
      await api.post(`/audits/${auditId}/products/${productId}/verify`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">{titles[type] || 'Stock'}</h1>
      <p className="page-sub">Admin view of SWIL vs physical results ({total} products)</p>
      {error && <div className="alert error">{error}</div>}
      <div className="list-toolbar">
        <label style={{ minWidth: 240 }}>
          Audit
          <select value={auditId} onChange={(e) => setAuditId(e.target.value)}>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(q.trim());
            }}
            placeholder="Product or barcode"
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
              <th>SWIL</th>
              <th>Physical</th>
              <th>Difference</th>
              <th>Locations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.product.name}</td>
                <td>{r.product.barcode}</td>
                <td>{Number(r.swilQty)}</td>
                <td>{Number(r.physicalQty)}</td>
                <td>{Number(r.difference)}</td>
                <td>
                  {(r.locationCounts || [])
                    .map((c) => `${c.location.name}: ${Number(c.quantity)}`)
                    .join(' · ') || '—'}
                </td>
                <td>
                  <span
                    className={`badge ${
                      r.status === 'MATCHED' ? 'ok' : r.status === 'SHORTAGE' ? 'bad' : 'warn'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={busy === r.productId}
                    onClick={() => markRecount(r.productId)}
                  >
                    Recount
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={busy === r.productId}
                    onClick={() => verify(r.productId)}
                  >
                    Verify
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="empty">
                  No rows
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
