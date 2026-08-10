import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CountSaved() {
  const navigate = useNavigate();
  const saved = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('lastSaved') || 'null');
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="badge ok" style={{ marginBottom: '0.75rem' }}>
        ✓ Count Saved
      </div>
      <h2 style={{ fontFamily: 'var(--display)', margin: '0 0 0.35rem' }}>
        {saved?.product?.name || 'Product'}
      </h2>
      <p className="muted">
        Quantity: {saved?.quantity ?? '—'} {saved?.product?.unit || 'PCS'}
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {saved?.location} · {saved?.countedBy}
      </p>
      <button className="btn block" style={{ marginTop: '1.25rem' }} type="button" onClick={() => navigate('/staff/scan')}>
        SCAN NEXT
      </button>
      <button
        className="btn secondary block"
        style={{ marginTop: '0.65rem' }}
        type="button"
        onClick={() => navigate('/staff/my-counts')}
      >
        VIEW MY COUNTS
      </button>
    </div>
  );
}
