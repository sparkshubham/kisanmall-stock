import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function ProductLedgerModal({ auditId, productId, productName, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auditId || !productId) return;
    setError('');
    api
      .get(`/audits/${auditId}/products/${productId}/ledger`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load ledger'));
  }, [auditId, productId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.2rem' }}>
              Rolling Audit Ledger
            </h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {productName || data?.product?.name}
            </p>
          </div>
          <button className="btn secondary sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {!data && !error && <p className="muted">Loading…</p>}

        {data && (
          <>
            {data.previousAudit && (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Baseline from <strong>{data.previousAudit.name}</strong>
                {data.previousAudit.completedAt
                  ? ` (${new Date(data.previousAudit.completedAt).toLocaleDateString()})`
                  : ''}
              </p>
            )}
            <p style={{ marginTop: '0.75rem' }}>
              <strong>Formula:</strong> {data.formula}
            </p>
            <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.date}</td>
                      <td>{row.activity}</td>
                      <td>
                        {row.activity === 'Sale' ? `−${row.qty}` : row.signedQty ?? row.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid-stats" style={{ marginTop: '1rem' }}>
              <div className="stat">
                <div className="label">Expected</div>
                <div className="value">{data.expectedQty}</div>
              </div>
              <div className="stat">
                <div className="label">Physical</div>
                <div className="value">{data.physicalQty}</div>
              </div>
              <div className="stat">
                <div className="label">Difference</div>
                <div className="value">{data.difference}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
