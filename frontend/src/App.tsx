import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProfilePage } from './pages/Profile';
import { OpportunitiesPage } from './pages/Opportunities';
import { OpportunityDetailsPage } from './pages/OpportunityDetails';
import { SavedOpportunitiesPage } from './pages/SavedOpportunities';
import { ChecklistPage } from './pages/Checklist';
import { NotificationsPage } from './pages/Notifications';

export function App(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="centered">Loading…</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailsPage />} />
        <Route path="/saved" element={<SavedOpportunitiesPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
