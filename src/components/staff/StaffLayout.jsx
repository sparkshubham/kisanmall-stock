import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="staff-shell">
      <header className="staff-top">
        <strong>Kisan Mall</strong>
        <button
          type="button"
          className="btn secondary"
          style={{ padding: '0.4rem 0.7rem' }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          ☰
        </button>
        {menuOpen && (
          <div className="menu-panel">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate('/staff');
              }}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate('/staff/my-counts');
              }}
            >
              My Counts
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
                navigate('/login');
              }}
            >
              Logout ({user?.name})
            </button>
          </div>
        )}
      </header>
      <div className="staff-body">
        <Outlet />
      </div>
    </div>
  );
}
