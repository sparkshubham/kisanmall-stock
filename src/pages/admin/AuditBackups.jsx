import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const reasonLabels = {
  COMPLETED: 'Completed',
  FINALIZED: 'Finalized',
  ROLLING_NEW_AUDIT: 'Rolling (new audit started)',
  MANUAL: 'Manual',
};

export default function AuditBackups() {
  const [searchParams] = useSearchParams();
  const auditFilter = searchParams.get('auditId') || '';
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/audits/backups', {
      params: {
        page,
        pageSize,
        q: search || undefined,
        ...(auditFilter ? { auditId: Number(auditFilter) } : {}),
      },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, pageSize, search, auditFilter]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load backups'));
  }, [load]);

  useEffect(() => setPage(1), [search, pageSize, auditFilter]);

  async function exportBackup(id, name) {
    setError('');
    setMessage('');
    try {
      const res = await api.get(`/audits/backups/${id}/export`, {
        responseType: 'blob',
        timeout: 120000,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${String(name).replace(/\s+/g, '_')}_backup.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('Backup Excel downloaded');
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    }
  }

  return (
    <div>
      <h1 className="page-title">Audit Backups</h1>
      <p className="page-sub">
        Frozen snapshots of completed audits — saved when you complete an audit or start the next
        rolling audit after uploading a new stock list.
      </p>
      {auditFilter && (
        <p className="muted">
          Filtered to audit #{auditFilter}.{' '}
          <Link to="/admin/audits/backups">Show all backups</Link>
        </p>
      )}
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}
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
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Backup</th>
              <th>Audit</th>
              <th>Reason</th>
              <th>Products</th>
              <th>Counted</th>
              <th>Next Import</th>
              <th>Saved At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.label}</td>
                <td>
                  <Link to={`/admin/audits/${b.auditId}`}>{b.auditName}</Link>
                </td>
                <td>{reasonLabels[b.reason] || b.reason}</td>
                <td>{b.productCount}</td>
                <td>{b.countedProducts}</td>
                <td>
                  {b.nextImport
                    ? `#${b.nextImport.id} · ${b.nextImport.filename}`
                    : '—'}
                </td>
                <td>{new Date(b.snapshotAt).toLocaleString()}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn secondary sm" to={`/admin/audits/backups/${b.id}`}>
                      View
                    </Link>
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => exportBackup(b.id, b.auditName)}
                    >
                      Excel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="empty">
                  No backups yet. Complete an audit or create the next rolling audit to save one.
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
