import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const sections = [
  {
    title: null,
    items: [{ to: '/admin', label: 'Dashboard', end: true }],
  },
  {
    title: 'Audit Management',
    items: [
      { to: '/admin/audits', label: 'Audits' },
      { to: '/admin/audits/create', label: 'Create Audit' },
      { to: '/admin/audits/assign', label: 'Assign Staff' },
      { to: '/admin/audits/history', label: 'Audit History' },
    ],
  },
  {
    title: 'SWIL Import',
    items: [
      { to: '/admin/swil/import', label: 'Import Stock' },
      { to: '/admin/swil/history', label: 'Import History' },
      { to: '/admin/swil/products', label: 'Imported Products' },
    ],
  },
  {
    title: 'Stock Audit',
    items: [
      { to: '/admin/stock/physical', label: 'Physical Stock' },
      { to: '/admin/stock/shortage', label: 'Shortage' },
      { to: '/admin/stock/excess', label: 'Excess' },
      { to: '/admin/stock/matched', label: 'Matched Stock' },
      { to: '/admin/stock/recount', label: 'Recount Required' },
    ],
  },
  {
    title: 'Locations',
    items: [{ to: '/admin/locations', label: 'Racks / Warehouse' }],
  },
  {
    title: 'Reports',
    items: [
      { to: '/admin/reports/comparison', label: 'Stock Comparison' },
      { to: '/admin/reports/movement', label: 'Purchase / Sale / Closing' },
      { to: '/admin/reports/audit', label: 'Audit Report' },
      { to: '/admin/reports/shortage', label: 'Shortage Report' },
      { to: '/admin/reports/excess', label: 'Excess Report' },
      { to: '/admin/reports/location', label: 'Location Wise Report' },
      { to: '/admin/reports/export', label: 'Export Excel' },
    ],
  },
  {
    title: 'Users',
    items: [{ to: '/admin/users/staff', label: 'Staff' }],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>KISAN MALL</h1>
          <p>Stock Audit System</p>
        </div>
        {sections.map((section) => (
          <div className="nav-section" key={section.title || 'top'}>
            {section.title && <h3>{section.title}</h3>}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <div className="muted">Signed in as {user?.name}</div>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
