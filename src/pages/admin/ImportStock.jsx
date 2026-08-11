import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { parseSwilFile } from '../../utils/parseSwil';

const CHUNK = 800;

export default function ImportStock() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Choose an Excel file');
    setBusy(true);
    setError('');
    setResult(null);
    setProgress('Reading Excel…');
    try {
      const parsed = await parseSwilFile(file);
      if (!parsed.items.length) {
        setError(
          parsed.errors[0] ||
            `No valid product rows. Expected NameToDisplay (or Product), plus Stock / PurchaseQty / SalesQty / Cl.Stock As On. Found: ${parsed.detectedHeaders.join(', ') || 'none'}`
        );
        return;
      }

      let importId = null;
      let last = null;
      for (let i = 0; i < parsed.items.length; i += CHUNK) {
        const batch = parsed.items.slice(i, i + CHUNK);
        const done = Math.min(i + CHUNK, parsed.items.length);
        setProgress(`Saving ${done} / ${parsed.items.length} products…`);
        const { data } = await api.post(
          '/swil/import',
          {
            filename: file.name,
            importId,
            items: batch,
          },
          { timeout: 120000 }
        );
        importId = data.import.id;
        last = data;
      }

      setResult({
        ...last,
        imported: last.imported,
        warnings: parsed.errors.slice(0, 50),
      });
      setProgress('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import failed';
      const details = err.response?.data?.details;
      setError(details?.length ? `${msg}: ${details.slice(0, 3).join('; ')}` : msg);
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Import Stock</h1>
      <p className="page-sub">
        Upload SWIL export (.xls / .xlsx). File is parsed in the browser, then saved in fast batches.
        Columns: NameToDisplay, Barcode (optional), Stock or Cl.Stock As On, PurchaseQty, SalesQty, MRP.
        Rows without barcode are matched to existing products by name. Duplicate barcodes/names are summed.
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
            <Link className="btn" to="/admin/audits/create" state={{ importId: result.import.id }}>
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
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {busy && progress && <p className="muted">{progress}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? progress || 'Importing…' : 'Validate & Import'}
        </button>
      </form>
    </div>
  );
}
