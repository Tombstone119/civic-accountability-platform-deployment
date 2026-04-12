import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ContractsListPage from './pages/contracts/ContractsListPage';
import ContractDetailPage from './pages/contracts/ContractDetailPage';
import VendorsListPage from './pages/vendors/VendorsListPage';
import VendorDetailPage from './pages/vendors/VendorDetailPage';
import PaymentsListPage from './pages/payments/PaymentsListPage';
import AuditsListPage from './pages/audits/AuditsListPage';
import AuditDetailPage from './pages/audits/AuditDetailPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import SpendingSummaryPage from './pages/spending/SpendingSummaryPage';
import UserManagementPage from './pages/users/UserManagementPage';
import CommentModerationPage from './pages/users/CommentModerationPage';
import PublicPortalPage from './pages/public/PublicPortalPage';
import PublicRecordDetailPage from './pages/public/PublicRecordDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Staff login — accessible via "Staff Login" link from the public portal */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public transparency portal — no auth required, default landing */}
          <Route element={<PublicLayout />}>
            <Route path="/portal" element={<PublicPortalPage />} />
            <Route path="/portal/records/:id" element={<PublicRecordDetailPage />} />
          </Route>

          {/* Authenticated routes — AppLayout redirects to /login if unauthenticated */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/contracts" element={<ContractsListPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />

            <Route path="/vendors" element={<VendorsListPage />} />
            <Route path="/vendors/:id" element={<VendorDetailPage />} />

            <Route path="/payments" element={<PaymentsListPage />} />

            <Route path="/audits" element={<AuditsListPage />} />
            <Route path="/audits/:id" element={<AuditDetailPage />} />

            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/spending" element={<SpendingSummaryPage />} />

            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/moderation" element={<CommentModerationPage />} />
          </Route>

          {/* Root and all unmatched routes → public transparency portal */}
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
