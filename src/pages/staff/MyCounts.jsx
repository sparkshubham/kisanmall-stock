import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';
import { downloadCsv, downloadXlsx, fetchAllPages, fileStampName } from '../../utils/exportSheet';

export default function MyCounts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

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

  async function exportSheet(kind) {
    setError('');
    setMessage('');
    setExporting(true);
    try {
      const auditId = sessionStorage.getItem('auditId');
      const list = await fetchAllPages(async (pageNum) => {
        const { data } = await api.get('/counts/my-counts', {
          params: {
            page: pageNum,
            pageSize: 500,
            q: search || undefined,
            ...(auditId ? { auditId } : {}),
          },
          timeout: 120000,
        });
        return data;
      });
      const sheet = list.map((r) => ({
        Product: r.product?.name || '',
        Barcode: r.product?.barcode || '',
        Location: r.location?.name || '',
        Quantity: Number(r.quantity) || 0,
        Unit: r.product?.unit || '',
        CountedAt: r.countedAt ? new Date(r.countedAt).toLocaleString() : '',
        Audit: r.audit?.name || '',
      }));
      if (!sheet.length) {
        setError('No counts to export');
        return;
      }
      const prefix = 'my_physical_counts';
      if (kind === 'csv') {
        downloadCsv(fileStampName(prefix, 'csv'), sheet);
      } else {
        downloadXlsx(fileStampName(prefix, 'xlsx'), sheet, 'My Counts');
      }
      setMessage(`Exported ${sheet.length} rows`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

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
      {message && <div className="alert success">{message}</div>}
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
        <button className="btn" type="button" disabled={exporting} onClick={() => exportSheet('xlsx')}>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
        <button className="btn secondary" type="button" disabled={exporting} onClick={() => exportSheet('csv')}>
          Export CSV
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
