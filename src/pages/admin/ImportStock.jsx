import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function ImportStock() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Choose an Excel file');
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/swil/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Import failed';
      const details = err.response?.data?.details;
      setError(details?.length ? `${msg}: ${details.slice(0, 3).join('; ')}` : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Import Stock</h1>
      <p className="page-sub">
        Upload SWIL export (.xls / .xlsx). Supported columns: Barcode, NameToDisplay (or Product), Stock,
        MRP, StockUnit. Duplicate barcodes (lots) are summed.
      </p>
      {error && <div className="alert error">{error}</div>}
      {result && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(36,122,60,0.35)' }}>
          <div className="alert success" style={{ marginBottom: '0.75rem' }}>
            Imported <strong>{result.imported}</strong> unique products from {result.import.filename}
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Next step: create an audit from this SWIL snapshot, assign staff to racks, then start counting.
          </p>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              className="btn"
              to="/admin/audits/create"
              state={{ importId: result.import.id }}
            >
              Create Audit
            </Link>
            <Link className="btn secondary" to="/admin/swil/products">
              View Products
            </Link>
            <Link className="btn secondary" to="/admin/swil/history">
              Import History
            </Link>
          </div>
          {!!result.warnings?.length && (
            <p className="muted" style={{ marginBottom: 0, marginTop: '0.75rem', fontSize: '0.85rem' }}>
              {result.warnings.length} warning(s) — e.g. {result.warnings[0]}
            </p>
          )}
        </div>
      )}
      <form className="card form-grid" onSubmit={onSubmit}>
        <label>
          SWIL Excel File
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Importing large file… please wait' : 'Validate & Import'}
        </button>
      </form>
    </div>
  );
}
