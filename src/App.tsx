import { Component, type ReactNode, type ErrorInfo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import Layout from '@/components/Layout';
import AuthPage from '@/pages/Auth';
import { Loader2 } from 'lucide-react';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { useCapacitor } from '@/lib/capacitor';

const Generator = lazy(() => import('@/pages/Generator'));
const Settings = lazy(() => import('@/pages/Settings'));
const AdminPanel = lazy(() => import('@/pages/Admin'));
const AdCreator = lazy(() => import('@/pages/AdCreator'));
const ImageCreator = lazy(() => import('@/pages/ImageCreator'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const SupportChat = lazy(() => import('@/pages/SupportChat'));
const EmailVerified = lazy(() => import('@/pages/EmailVerified'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#fff', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#f87171', fontSize: 20 }}>Что-то пошло не так</h1>
          <p style={{ marginTop: 16, color: '#94a3b8' }}>
            Произошла непредвиденная ошибка. Пожалуйста, обновите страницу и попробуйте снова.
          </p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, loading, isRecovery, isEmailVerified, clearEmailVerified } = useAuth();
  const location = useLocation();
  useCapacitor();

  if (location.pathname === '/privacy') return <Suspense fallback={<PageLoader />}><Privacy /></Suspense>;
  if (location.pathname === '/terms') return <Suspense fallback={<PageLoader />}><Terms /></Suspense>;

  if (loading) {
    return <PageLoader />;
  }

  if (isRecovery && user) {
    return <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>;
  }

  if (isEmailVerified && user) {
    return <Suspense fallback={<PageLoader />}><EmailVerified onContinue={clearEmailVerified} /></Suspense>;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (location.pathname === '/stup') {
    return <Suspense fallback={<PageLoader />}><AdminPanel /></Suspense>;
  }

  if (location.pathname === '/image-creator') {
    return <Suspense fallback={<PageLoader />}><ImageCreator /></Suspense>;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Generator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ad-creator" element={<AdCreator />} />
          <Route path="/support" element={<SupportChat />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
            <PWAInstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
