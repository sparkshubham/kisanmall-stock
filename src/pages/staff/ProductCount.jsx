import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function ProductCount() {
  const navigate = useNavigate();
  const productData = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('countProduct') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [qty, setQty] = useState(
    productData?.existingQty !== null && productData?.existingQty !== undefined
      ? Number(productData.existingQty)
      : 0
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!productData?.product) {
    return (
      <div>
        <div className="alert error">No product selected</div>
        <button className="btn" type="button" onClick={() => navigate('/staff/scan')}>
          Scan Barcode
        </button>
      </div>
    );
  }

  const { product, locationName } = productData;

  async function save() {
    setBusy(true);
    setError('');
    try {
      const auditId = Number(sessionStorage.getItem('auditId'));
      const { data } = await api.post('/counts/save', {
        auditId,
        productId: product.id,
        quantity: qty,
      });
      sessionStorage.setItem('lastSaved', JSON.stringify(data));
      navigate('/staff/saved');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save count');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn secondary" type="button" onClick={() => navigate('/staff/scan')}>
        ← Product
      </button>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h1 className="page-title">{product.name}</h1>
        <div className="muted" style={{ marginBottom: '1rem' }}>
          Blind physical count — SWIL quantity is hidden
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div>
            <div className="muted">Barcode</div>
            <strong>{product.barcode}</strong>
          </div>
          <div>
            <div className="muted">MRP</div>
            <strong>₹{Number(product.mrp).toFixed(0)}</strong>
          </div>
          <div>
            <div className="muted">Location</div>
            <strong>{locationName || sessionStorage.getItem('locationName')}</strong>
          </div>
        </div>
        <div className="muted" style={{ marginTop: '1rem' }}>
          Physical Quantity
        </div>
        <div className="qty-control">
          <button type="button" onClick={() => setQty((q) => Math.max(0, q - 1))}>
            −
          </button>
          <span>{qty}</span>
          <button type="button" onClick={() => setQty((q) => q + 1)}>
            +
          </button>
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="btn block" type="button" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'SAVE COUNT'}
        </button>
      </div>
    </div>
  );
}
