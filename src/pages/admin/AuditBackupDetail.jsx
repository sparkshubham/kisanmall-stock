import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const reasonLabels = {
  COMPLETED: 'Completed',
  FINALIZED: 'Finalized',
  ROLLING_NEW_AUDIT: 'Rolling (new audit started)',
  MANUAL: 'Manual',
};

export default function AuditBackupDetail() {
  const { snapshotId } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    const { data } = await api.get(`/audits/backups/${snapshotId}/rows`, {
      params: { page, pageSize: 50, q: search || undefined },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [snapshotId, page, search]);

  useEffect(() => {
    api
      .get(`/audits/backups/${snapshotId}`)
      .then((res) => setSnapshot(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load backup'));
  }, [snapshotId]);

  useEffect(() => {
    loadRows().catch((err) => setError(err.response?.data?.message || 'Failed to load rows'));
  }, [loadRows]);

  useEffect(() => setPage(1), [search]);

  async function exportExcel() {
    try {
      const res = await api.get(`/audits/backups/${snapshotId}/export`, {
        responseType: 'blob',
        timeout: 120000,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_backup_${snapshotId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    }
  }

  if (!snapshot && !error) return <div className="muted">Loading backup…</div>;

  return (
    <div>
      <Link className="btn secondary" to="/admin/audits/backups">
        ← All Backups
      </Link>
      <h1 className="page-title" style={{ marginTop: '1rem' }}>
        {snapshot?.label || 'Audit Backup'}
      </h1>
      {snapshot && (
        <p className="page-sub">
          {reasonLabels[snapshot.reason] || snapshot.reason} · {snapshot.productCount} products ·
          saved {new Date(snapshot.snapshotAt).toLocaleString()}
        </p>
      )}
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
        <button className="btn" type="button" onClick={exportExcel}>
          Export Excel
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Barcode</th>
              <th>Opening</th>
              <th>Purchase</th>
              <th>Sale</th>
              <th>Expected</th>
              <th>Physical</th>
              <th>Diff</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.productName}</td>
                <td>{r.barcode}</td>
                <td>{Number(r.openingQty)}</td>
                <td>{Number(r.purchaseQty)}</td>
                <td>{Number(r.salesQty)}</td>
                <td>{Number(r.expectedQty)}</td>
                <td>{Number(r.physicalQty)}</td>
                <td>{Number(r.difference)}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="empty">
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
