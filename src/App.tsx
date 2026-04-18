import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { canAccessSiteManagement } from '@/lib/admin-user';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n';
import { queryClient } from '@/lib/query-client';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Records = lazy(() => import('./pages/Records'));
const DentalCharts = lazy(() => import('./pages/DentalCharts'));
const Xrays = lazy(() => import('./pages/Xrays'));
const Doctors = lazy(() => import('./pages/Doctors'));
const News = lazy(() => import('./pages/News'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AppPwa = lazy(() => import('./pages/AppPwa'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AppLoader() {
  return (
    <div className="fixed inset-0 bg-background">
      <img src="/222.gif" alt="loading" className="h-full w-full object-cover" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SiteManagementRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canAccessSiteManagement(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<AppLoader />}>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <PublicOnlyRoute>
                        <Login />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <ProtectedRoute>
                        <Appointments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/records"
                    element={
                      <ProtectedRoute>
                        <Records />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dental-charts"
                    element={
                      <ProtectedRoute>
                        <DentalCharts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/xrays"
                    element={
                      <ProtectedRoute>
                        <Xrays />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctors"
                    element={
                      <ProtectedRoute>
                        <SiteManagementRoute>
                          <Doctors />
                        </SiteManagementRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/news"
                    element={
                      <ProtectedRoute>
                        <SiteManagementRoute>
                          <News />
                        </SiteManagementRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <AppPwa />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
