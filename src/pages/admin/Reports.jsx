import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';

const titles = {
  comparison: 'Stock Comparison',
  movement: 'Rolling Movement (Opening + Purchase − Sale)',
  audit: 'Audit Report',
  shortage: 'Shortage Report',
  excess: 'Excess Report',
  location: 'Location Wise Report',
  export: 'Export Excel',
};

export default function Reports() {
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
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/audits', { params: { pageSize: 200 } }).then((res) => {
      const list = res.data.rows || res.data;
      setAudits(list);
      if (list[0]) setAuditId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [type, auditId, search]);

  useEffect(() => {
    if (!auditId || type === 'export') return;
    setError('');

    const endpoint =
      type === 'shortage'
        ? `/reports/shortage/${auditId}`
        : type === 'excess'
          ? `/reports/excess/${auditId}`
          : type === 'location'
            ? `/reports/location-wise/${auditId}`
            : type === 'movement'
              ? `/reports/movement/${auditId}`
              : type === 'audit'
                ? `/reports/audit-summary/${auditId}`
                : `/reports/comparison/${auditId}`;

    api
      .get(endpoint, { params: { page, pageSize: 25, q: search || undefined } })
      .then((res) => {
        if (type === 'audit') {
          const paged = res.data.comparison || { rows: [], total: 0, totalPages: 1 };
          setRows(paged.rows || []);
          setTotal(paged.total || 0);
          setTotalPages(paged.totalPages || 1);
        } else {
          setRows(res.data.rows || []);
          setTotal(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load report'));
  }, [auditId, type, page, search]);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    if (type === 'location') {
      return ['location', 'product', 'barcode', 'quantity', 'countedBy', 'countedAt'];
    }
    if (type === 'movement') {
      return [
        'product',
        'barcode',
        'unit',
        'opening',
        'purchase',
        'sales',
        'expected',
        'bookClosing',
        'physical',
        'variance',
        'status',
      ];
    }
    if (type === 'comparison') {
      return [
        'product',
        'barcode',
        'unit',
        'opening',
        'purchase',
        'sales',
        'expected',
        'bookClosing',
        'physical',
        'difference',
        'status',
      ];
    }
    return Object.keys(rows[0]).filter(
      (k) => !['productId', 'needsRecount', 'isVerified', 'isFinalized'].includes(k)
    );
  }, [rows, type]);

  async function exportExcel() {
    setError('');
    setMessage('');
    try {
      const res = await api.get(`/reports/export/${auditId}`, {
        responseType: 'blob',
        timeout: 120000,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_${auditId}_comparison.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('Excel downloaded');
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    }
  }

  return (
    <div>
      <h1 className="page-title">{titles[type] || 'Reports'}</h1>
      <p className="page-sub">
        Expected stock = opening audit + purchase − sale. Physical variance shows shortage/excess.
        {total ? ` (${total})` : ''}
      </p>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

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
        {type !== 'export' && (
          <>
            <label>
              Search
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearch(q.trim());
                }}
                placeholder="Search rows"
              />
            </label>
            <button className="btn secondary" type="button" onClick={() => setSearch(q.trim())}>
              Search
            </button>
          </>
        )}
      </div>

      {type === 'export' ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <p>Download full expected vs physical comparison as Excel.</p>
          <button className="btn" type="button" onClick={exportExcel}>
            Export Excel
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    {columns.map((c) => (
                      <td key={c}>
                        {c === 'countedAt' && r[c]
                          ? new Date(r[c]).toLocaleString()
                          : typeof r[c] === 'number'
                            ? r[c]
                            : String(r[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="empty">
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
