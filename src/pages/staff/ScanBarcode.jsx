import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import BarcodeCameraScanner from '../../components/staff/BarcodeCameraScanner';

export default function ScanBarcode() {
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [scannerActive, setScannerActive] = useState(true);

  const lookupBarcode = useCallback(
    async (barcode) => {
      const code = String(barcode || '').trim();
      if (!code || busy) return;

      setBusy(true);
      setError('');
      setScannerActive(false); // unmount/stop camera before navigate

      const auditId = sessionStorage.getItem('auditId');
      try {
        const { data } = await api.get(`/counts/lookup/${encodeURIComponent(code)}`, {
          params: { auditId },
        });
        sessionStorage.setItem('countProduct', JSON.stringify(data));
        navigate('/staff/count');
      } catch (err) {
        setError(err.response?.data?.message || 'Product not found');
        setBusy(false);
        setScannerActive(true);
        setScannerKey((k) => k + 1); // remount fresh scanner
      }
    },
    [busy, navigate]
  );

  return (
    <div>
      <button className="btn secondary" type="button" onClick={() => navigate('/staff')}>
        ← Back
      </button>
      <h1 className="page-title" style={{ marginTop: '1rem' }}>
        Scan Barcode
      </h1>
      <p className="page-sub">
        Pick barcode type (try <strong>EAN-13</strong> for SWIL), hold the code in the box, then zoom in.
        If live camera misses it, tap <strong>Scan photo</strong>.
      </p>

      {error && <div className="alert error">{error}</div>}

      {scannerActive ? (
        <BarcodeCameraScanner key={scannerKey} active onDetected={lookupBarcode} />
      ) : (
        <div className="scan-frame">
          <div className="scan-overlay-msg">{busy ? 'Looking up product…' : 'Camera paused'}</div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) lookupBarcode(manual.trim());
        }}
        className="form-grid"
        style={{ marginTop: '1rem' }}
      >
        <label>
          Or enter barcode manually
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="8901030823456"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <button className="btn block" type="submit" disabled={busy || !manual.trim()}>
          {busy ? 'Please wait…' : 'Find Product'}
        </button>
      </form>
    </div>
  );
}
