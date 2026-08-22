import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const [preview, setPreview] = useState(null);
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

  useEffect(() => {
    if (!importId) {
      setPreview(null);
      return;
    }
    api
      .get('/audits/rolling-preview', {
        params: { storeName, importId: Number(importId) },
      })
      .then((res) => setPreview(res.data))
      .catch(() => setPreview(null));
  }, [storeName, importId]);

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
        Rolling stock audit: expected stock = last physical audit + purchases − sales. Upload period
        purchase/sale data, then count physically without stopping mall operations.
      </p>
      {error && <div className="alert error">{error}</div>}
      {preview && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(36,122,60,0.35)' }}>
          <strong>Rolling audit preview</strong>
          <p className="muted" style={{ margin: '0.5rem 0' }}>
            {preview.formula}
          </p>
          {preview.previousAudit ? (
            <p style={{ margin: 0 }}>
              Previous audit: <strong>{preview.previousAudit.name}</strong>
              {preview.previousAudit.completedAt
                ? ` · ${new Date(preview.previousAudit.completedAt).toLocaleDateString()}`
                : ''}
              · {preview.baselineProducts} products with physical baseline
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              No previous completed audit for this store — first audit will use uploaded closing stock
              where period purchase/sale is missing.
            </p>
          )}
          {preview.latestBackup ? (
            <p style={{ margin: '0.5rem 0 0' }}>
              Existing backup:{' '}
              <Link to={`/admin/audits/backups/${preview.latestBackup.id}`}>
                {preview.latestBackup.label}
              </Link>
            </p>
          ) : preview.previousAudit ? (
            <p className="muted" style={{ margin: '0.5rem 0 0' }}>
              A backup of the previous audit will be saved automatically when you create this audit.
            </p>
          ) : null}
          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
            Selected import: {preview.importRowCount} products
          </p>
        </div>
      )}
      <form className="card form-grid" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
        <label>
          Audit Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="22 Sep Physical Stock Audit"
            required
          />
        </label>
        <label>
          Store
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
        </label>
        <label>
          Period Import (Purchase / Sale / Closing)
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
          {busy ? 'Creating rolling audit snapshot…' : 'Create Audit'}
        </button>
      </form>
    </div>
  );
}
