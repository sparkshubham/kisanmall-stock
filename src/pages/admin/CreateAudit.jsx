import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function CreateAudit() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefImportId = location.state?.importId ? String(location.state.importId) : '';
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('Kisan Mall');
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState([]);
  const [imports, setImports] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [importId, setImportId] = useState(prefImportId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/locations', { params: { pageSize: 500 } }),
      api.get('/swil/history', { params: { pageSize: 200 } }),
    ])
      .then(([locRes, impRes]) => {
        setLocations(locRes.data.rows || locRes.data);
        setImports(impRes.data.rows || impRes.data);
        setImportId((prev) => prev || ((impRes.data.rows || impRes.data)[0] ? String((impRes.data.rows || impRes.data)[0].id) : ''));
        setSelectedLocations((locRes.data.rows || locRes.data).map((l) => l.id));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load form data'));
  }, []);

  function toggleLocation(id) {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(
        '/audits',
        {
          name,
          storeName,
          notes,
          locationIds: selectedLocations,
          importId: importId ? Number(importId) : undefined,
        },
        { timeout: 180000 }
      );
      navigate('/admin/audits/assign', { state: { auditId: data.id } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create audit');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Create Audit</h1>
      <p className="page-sub">
        Snapshot SWIL stock into a new audit, then assign staff to locations for blind counting.
      </p>
      {error && <div className="alert error">{error}</div>}
      <form className="card form-grid" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
        <label>
          Audit Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="August Physical Stock Audit"
            required
          />
        </label>
        <label>
          Store
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
        </label>
        <label>
          SWIL Import Source
          <select value={importId} onChange={(e) => setImportId(e.target.value)} required>
            <option value="">Select import</option>
            {imports.map((imp) => (
              <option key={imp.id} value={imp.id}>
                #{imp.id} · {imp.filename} · {imp.productCount} products
              </option>
            ))}
          </select>
        </label>
        <div>
          <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Locations</div>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {locations.map((loc) => (
              <label
                key={loc.id}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}
              >
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(loc.id)}
                  onChange={() => toggleLocation(loc.id)}
                />
                {loc.name} <span className="muted">({loc.type})</span>
              </label>
            ))}
          </div>
        </div>
        <label>
          Notes
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating audit snapshot…' : 'Create Audit'}
        </button>
      </form>
    </div>
  );
}
