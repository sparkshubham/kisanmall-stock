import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/client';

export default function AssignStaff() {
  const location = useLocation();
  const [audits, setAudits] = useState([]);
  const [staff, setStaff] = useState([]);
  const [auditId, setAuditId] = useState(location.state?.auditId ? String(location.state.auditId) : '');
  const [detail, setDetail] = useState(null);
  const [map, setMap] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/audits', { params: { pageSize: 200 } }),
      api.get('/users/staff', { params: { pageSize: 500 } }),
    ])
      .then(([a, s]) => {
        const auditsList = a.data.rows || a.data;
        const staffList = s.data.rows || s.data;
        setAudits(auditsList);
        setStaff(staffList);
        if (!auditId && auditsList[0]) setAuditId(String(auditsList[0].id));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'));
  }, []);

  useEffect(() => {
    if (!auditId) return;
    api
      .get(`/audits/${auditId}`)
      .then((res) => {
        setDetail(res.data);
        const next = {};
        for (const link of res.data.locations || []) {
          const existing = res.data.assignments?.find((a) => a.locationId === link.locationId);
          next[link.locationId] = existing ? String(existing.staffId) : '';
        }
        setMap(next);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load audit'));
  }, [auditId]);

  const rows = useMemo(() => detail?.locations || [], [detail]);

  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const assignments = Object.entries(map)
        .filter(([, staffId]) => staffId)
        .map(([locationId, staffId]) => ({
          locationId: Number(locationId),
          staffId: Number(staffId),
        }));
      await api.post(`/audits/${auditId}/assign`, { assignments });
      if (detail?.status === 'DRAFT') {
        await api.post(`/audits/${auditId}/start`);
      }
      setMessage('Staff assigned. Audit is active for mobile counting.');
      const refreshed = await api.get(`/audits/${auditId}`);
      setDetail(refreshed.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign staff');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Assign Staff</h1>
      <p className="page-sub">Assign one staff member per location for blind physical counting</p>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <label style={{ maxWidth: 420, marginBottom: '1rem' }}>
        Audit
        <select value={auditId} onChange={(e) => setAuditId(e.target.value)}>
          {audits.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.status})
            </option>
          ))}
        </select>
      </label>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Staff</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((link) => {
              const assignment = detail?.assignments?.find((a) => a.locationId === link.locationId);
              return (
                <tr key={link.id}>
                  <td>{link.location.name}</td>
                  <td>
                    <select
                      value={map[link.locationId] || ''}
                      onChange={(e) =>
                        setMap((prev) => ({ ...prev, [link.locationId]: e.target.value }))
                      }
                    >
                      <option value="">Select staff</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.mobile})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="badge muted">{assignment?.status?.replace('_', ' ') || 'PENDING'}</span>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="empty">
                  No locations on this audit
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="btn" style={{ marginTop: '1rem' }} type="button" disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Save Assignments & Start'}
      </button>
    </div>
  );
}
