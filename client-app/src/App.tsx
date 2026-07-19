import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { AccessGate, AccessPage } from './components/auth/AccessGate';
import { OverviewPage } from './pages/OverviewPage';
import { ScoutingOrdersPage } from './pages/ScoutingOrdersPage';
import { CataloguePage } from './pages/CataloguePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { MandatePage } from './pages/MandatePage';
import { EvaluationPage, PipelinePage, PlaceholderPage } from './pages/SecondaryPages';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/access/:token" element={<AccessPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route element={<AccessGate />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="scouting-orders" element={<ScoutingOrdersPage />} />
              <Route path="catalogue" element={<CataloguePage />} />
              <Route path="analysis/:objectId" element={<AnalysisPage />} />
              <Route path="mandate" element={<MandatePage />} />
              <Route path="evaluation" element={<EvaluationPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="documents" element={<PlaceholderPage title="Documents" />} />
              <Route path="saved" element={<PlaceholderPage title="Saved Opportunities" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
