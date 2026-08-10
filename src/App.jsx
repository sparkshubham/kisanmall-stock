import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import StaffLayout from './components/staff/StaffLayout';
import Dashboard from './pages/admin/Dashboard';
import Audits from './pages/admin/Audits';
import CreateAudit from './pages/admin/CreateAudit';
import AssignStaff from './pages/admin/AssignStaff';
import AuditHistory from './pages/admin/AuditHistory';
import AuditDetail from './pages/admin/AuditDetail';
import ImportStock from './pages/admin/ImportStock';
import ImportHistory from './pages/admin/ImportHistory';
import ImportedProducts from './pages/admin/ImportedProducts';
import StockViews from './pages/admin/StockViews';
import Locations from './pages/admin/Locations';
import Reports from './pages/admin/Reports';
import StaffUsers from './pages/admin/StaffUsers';
import StaffHome from './pages/staff/StaffHome';
import ScanBarcode from './pages/staff/ScanBarcode';
import ProductCount from './pages/staff/ProductCount';
import CountSaved from './pages/staff/CountSaved';
import MyCounts from './pages/staff/MyCounts';

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/staff'} replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="boot">Loading…</div>;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/staff'} replace /> : <LoginPage />
        }
      />

      <Route
        path="/admin"
        element={
          <Protected role="ADMIN">
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="audits" element={<Audits />} />
        <Route path="audits/create" element={<CreateAudit />} />
        <Route path="audits/assign" element={<AssignStaff />} />
        <Route path="audits/history" element={<AuditHistory />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="swil/import" element={<ImportStock />} />
        <Route path="swil/history" element={<ImportHistory />} />
        <Route path="swil/products" element={<ImportedProducts />} />
        <Route path="stock/:type" element={<StockViews />} />
        <Route path="locations" element={<Locations />} />
        <Route path="reports/:type" element={<Reports />} />
        <Route path="users/staff" element={<StaffUsers />} />
      </Route>

      <Route
        path="/staff"
        element={
          <Protected role="STAFF">
            <StaffLayout />
          </Protected>
        }
      >
        <Route index element={<StaffHome />} />
        <Route path="scan" element={<ScanBarcode />} />
        <Route path="count" element={<ProductCount />} />
        <Route path="saved" element={<CountSaved />} />
        <Route path="my-counts" element={<MyCounts />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : '/staff') : '/login'} replace />}
      />
    </Routes>
  );
}
