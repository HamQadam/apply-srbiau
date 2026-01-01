import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './pages/Home/HomePage';
import { LoginPage } from './pages/Auth/LoginPage';
import { OnboardingPage } from './pages/Onboarding/OnboardingPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { AddProgramPage } from './pages/Dashboard/AddProgramPage';
import { ProgramDetailPage } from './pages/Dashboard/ProgramDetailPage';
import { ExplorePage } from './pages/Explore/ExplorePage';
import { RecommendationsPage } from './pages/Recommendations/RecommendationsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { Spinner } from './components/Feedback/Spinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-10 w-10" />
          <span className="text-text-muted text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
        </Route>
        
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />
        
        {/* Protected routes with Layout */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="add" element={
            <ProtectedRoute>
              <AddProgramPage />
            </ProtectedRoute>
          } />
          <Route path="programs/:id" element={
            <ProtectedRoute>
              <ProgramDetailPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Recommendations route */}
        <Route path="/recommendations" element={<Layout />}>
          <Route index element={
            <ProtectedRoute>
              <RecommendationsPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Settings route */}
        <Route path="/settings" element={<Layout />}>
          <Route index element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
