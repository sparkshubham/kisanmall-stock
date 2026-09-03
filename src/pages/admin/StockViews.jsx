import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';
import SortableTh from '../../components/common/SortableTh';
import ProductLedgerModal from '../../components/admin/ProductLedgerModal';
import { downloadCsv, downloadXlsx, fetchAllPages, fileStampName } from '../../utils/exportSheet';
import { nextSortState } from '../../utils/tableControls';

const titles = {
  all: 'All Products',
  physical: 'Physical Stock (Counted)',
  counted: 'Counted',
  pending: 'Pending',
  shortage: 'Shortage',
  excess: 'Excess',
  matched: 'Matched Stock',
  recount: 'Recount Required',
  verified: 'Verified',
  finalized: 'Finalized',
};

const apiStatus = {
  all: 'ALL',
  physical: 'PHYSICAL',
  counted: 'COUNTED',
  pending: 'PENDING',
  shortage: 'SHORTAGE',
  excess: 'EXCESS',
  matched: 'MATCHED',
  recount: 'RECOUNT',
  verified: 'VERIFIED',
  finalized: 'FINALIZED',
};

function formatStaffLocations(counts = []) {
  if (!counts.length) return '—';
  return counts
    .map((c) => {
      const loc = c.location?.name || 'Loc';
      const qty = Number(c.quantity) || 0;
      const staff = c.countedBy?.name ? ` (${c.countedBy.name})` : '';
      return `${loc}: ${qty}${staff}`;
    })
    .join(' · ');
}

export default function StockViews() {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const prefAuditId = searchParams.get('auditId') || '';
  const [audits, setAudits] = useState([]);
  const [auditId, setAuditId] = useState(prefAuditId);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('difference');
  const [sortDir, setSortDir] = useState('asc');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [ledger, setLedger] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!auditId || !type) return;
    setError('');
    const { data } = await api.get(`/audits/${auditId}/stock/${apiStatus[type] || 'PHYSICAL'}`, {
      params: {
        page,
        pageSize,
        q: search || undefined,
        sortBy,
        sortDir,
      },
    });
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [auditId, type, page, pageSize, search, sortBy, sortDir]);

  useEffect(() => {
    api.get('/audits', { params: { pageSize: 200 } }).then((res) => {
      const list = res.data.rows || res.data;
      setAudits(list);
      if (prefAuditId && list.some((a) => String(a.id) === String(prefAuditId))) {
        setAuditId(String(prefAuditId));
      } else if (!auditId && list[0]) {
        setAuditId(String(list[0].id));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefAuditId]);

  useEffect(() => {
    if (prefAuditId) setAuditId(String(prefAuditId));
  }, [prefAuditId]);

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load stock'));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [type, auditId, search, pageSize, sortBy, sortDir]);

  useEffect(() => {
    setSelected(new Set());
  }, [type, auditId, page, pageSize, search, sortBy, sortDir]);

  const pageIds = rows.map((r) => r.productId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  function toggleOne(productId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!ids.length || !auditId) return;
    if (
      !window.confirm(
        `Delete ${ids.length} selected product(s) from this audit?\n\nPhysical counts for these products in this audit will also be removed.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/audits/${auditId}/products/bulk-delete`, {
        productIds: ids,
      });
      setSelected(new Set());
      setMessage(`Deleted ${data.productsDeleted || ids.length} product(s) from audit`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function onSort(key) {
    const next = nextSortState(sortBy, sortDir, key);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  }

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

  function toSheetRows(list) {
    return list.map((r) => ({
      Product: r.product?.name || '',
      Barcode: r.product?.barcode || '',
      Unit: r.product?.unit || '',
      Opening: Number(r.openingQty) || 0,
      Purchase: Number(r.purchaseQty) || 0,
      Sale: Number(r.salesQty) || 0,
      Expected: Number(r.expectedQty) || Number(r.swilQty) || 0,
      Physical: Number(r.physicalQty) || 0,
      Difference: Number(r.difference) || 0,
      BookClosing: Number(r.closingQty) || 0,
      LocationsStaff: formatStaffLocations(r.locationCounts || []),
      Status: r.status || '',
      Verified: r.isVerified ? 'Yes' : 'No',
    }));
  }

  async function loadAllRows() {
    const status = apiStatus[type] || 'PHYSICAL';
    return fetchAllPages(async (pageNum) => {
      const { data } = await api.get(`/audits/${auditId}/stock/${status}`, {
        params: {
          page: pageNum,
          pageSize: 100,
          q: search || undefined,
          sortBy,
          sortDir,
        },
        timeout: 120000,
      });
      return data;
    });
  }

  async function exportSheet(kind) {
    if (!auditId) return;
    setError('');
    setMessage('');
    setExporting(true);
    try {
      const list = await loadAllRows();
      const sheet = toSheetRows(list);
      if (!sheet.length) {
        setError('No rows to export');
        return;
      }
      const audit = audits.find((a) => String(a.id) === String(auditId));
      const prefix = `${titles[type] || 'stock'}_${audit?.name || `audit_${auditId}`}`;
      if (kind === 'csv') {
        downloadCsv(fileStampName(prefix, 'csv'), sheet);
      } else {
        downloadXlsx(fileStampName(prefix, 'xlsx'), sheet, titles[type] || 'Stock');
      }
      setMessage(`Exported ${sheet.length} rows`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
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
      <p className="page-sub">
        Expected = opening audit + purchase − sale. Showing {total} products with location and staff
        who counted.
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
        <button
          className="btn"
          type="button"
          disabled={!auditId || exporting}
          onClick={() => exportSheet('xlsx')}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={!auditId || exporting}
          onClick={() => exportSheet('csv')}
        >
          Export CSV
        </button>
        <button
          className="btn danger"
          type="button"
          disabled={!auditId || deleting || selected.size === 0}
          onClick={deleteSelected}
        >
          {deleting ? 'Deleting…' : `Delete selected (${selected.size})`}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 42 }}>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={togglePage}
                  aria-label="Select all on page"
                  disabled={!rows.length}
                />
              </th>
              <SortableTh label="Product" sortKey="product" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Barcode" sortKey="barcode" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Opening" sortKey="openingQty" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Purchase" sortKey="purchaseQty" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Sale" sortKey="salesQty" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Expected" sortKey="expectedQty" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Physical" sortKey="physicalQty" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh label="Diff" sortKey="difference" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th>Locations / Staff</th>
              <SortableTh label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`row-selectable${selected.has(r.productId) ? ' row-selected' : ''}`}
                onClick={(e) => {
                  if (e.target.closest('button, a, input, label')) return;
                  toggleOne(r.productId);
                }}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(r.productId)}
                    onChange={() => toggleOne(r.productId)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${r.product?.name || r.productId}`}
                  />
                </td>
                <td>{r.product.name}</td>
                <td>{r.product.barcode}</td>
                <td>{Number(r.openingQty)}</td>
                <td>{Number(r.purchaseQty)}</td>
                <td>{Number(r.salesQty)}</td>
                <td>{Number(r.expectedQty ?? r.swilQty)}</td>
                <td>{Number(r.physicalQty)}</td>
                <td>{Number(r.difference)}</td>
                <td>{formatStaffLocations(r.locationCounts)}</td>
                <td>
                  <span
                    className={`badge ${
                      r.status === 'MATCHED' ? 'ok' : r.status === 'SHORTAGE' ? 'bad' : 'warn'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td
                  style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn secondary sm"
                    type="button"
                    onClick={() =>
                      setLedger({ productId: r.productId, productName: r.product.name })
                    }
                  >
                    Ledger
                  </button>
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
                <td colSpan={12} className="empty">
                  No rows
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
      {ledger && (
        <ProductLedgerModal
          auditId={auditId}
          productId={ledger.productId}
          productName={ledger.productName}
          onClose={() => setLedger(null)}
        />
      )}
    </div>
  );
}
