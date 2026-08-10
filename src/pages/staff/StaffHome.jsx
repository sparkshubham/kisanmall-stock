import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function StaffHome() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/counts/my-assignment')
      .then((res) => {
        setData(res.data);
        if (res.data.assignment) {
          sessionStorage.setItem('auditId', String(res.data.assignment.auditId));
          sessionStorage.setItem('locationId', String(res.data.assignment.locationId));
          sessionStorage.setItem('locationName', res.data.assignment.location.name);
          sessionStorage.setItem('auditName', res.data.assignment.audit.name);
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load assignment'));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="muted">Loading…</div>;

  if (!data.assignment) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>No Active Assignment</h2>
        <p className="muted">Ask admin to assign you to an active audit location.</p>
      </div>
    );
  }

  const { assignment, stats } = data;

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div className="muted" style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
          Assigned Location
        </div>
        <h1 className="page-title" style={{ margin: '0.4rem 0 0.2rem' }}>
          {assignment.audit.name}
        </h1>
        <div
          style={{
            fontFamily: 'var(--display)',
            fontSize: '2rem',
            color: 'var(--green-800)',
            margin: '0.8rem 0 1.1rem',
          }}
        >
          {assignment.location.name}
        </div>
        <button className="btn block" type="button" onClick={() => navigate('/staff/scan')}>
          SCAN BARCODE
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Progress</strong>
          <span>{stats.progress}%</span>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${stats.progress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span>
            Counted <strong>{stats.counted}</strong>
          </span>
          <span>
            Pending <strong>{stats.pending}</strong>
          </span>
        </div>
        <button
          className="btn secondary block"
          style={{ marginTop: '1rem' }}
          type="button"
          onClick={() => navigate('/staff/my-counts')}
        >
          VIEW MY COUNTS
        </button>
      </div>
    </div>
  );
}
