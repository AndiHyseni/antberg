import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { AccessGate, AccessPage } from './components/auth/AccessGate';
import { OverviewPage } from './pages/OverviewPage';
import { ScoutingOrdersPage } from './pages/ScoutingOrdersPage';
import { CataloguePage } from './pages/CataloguePage';
import { ComparePage } from './pages/ComparePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { MandatePage } from './pages/MandatePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { PipelinePage, DocumentsPage, SavedOpportunitiesPage, SettingsPage } from './pages/SecondaryPages';
import { AdminGate, AdminLoginPage } from './components/admin/AdminGate';
import { AdminShell } from './components/admin/AdminShell';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminAccessTokensPage } from './pages/admin/AdminAccessTokensPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/access/:token" element={<AccessPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminGate />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="access-tokens" element={<AdminAccessTokensPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
            </Route>
          </Route>
          <Route element={<AccessGate />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="scouting-orders" element={<ScoutingOrdersPage />} />
              <Route path="catalogue" element={<CataloguePage />} />
              <Route path="compare" element={<ComparePage />} />
              <Route path="analysis/:objectId" element={<AnalysisPage />} />
              <Route path="mandate" element={<MandatePage />} />
              <Route path="evaluation" element={<EvaluationPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="saved" element={<SavedOpportunitiesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
