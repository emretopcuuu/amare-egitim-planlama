import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import { trackPageView } from './utils/analytics';
import LoadingProgress from './components/LoadingProgress';
import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/Toast';
import PwaInstallBanner from './components/PwaInstallBanner';
import OnboardingTour from './components/OnboardingTour';
import OfflineBanner from './components/OfflineBanner';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import KeyboardHelpModal from './components/KeyboardHelpModal';

// Code-split — public sayfalar dahil hepsi route-level lazy load
// İlk yükleme: sadece HomePage indirilir, diğerleri kullanıcı navigasyonu ile
const TakvimView = lazy(() => import('./pages/TakvimView'));
const EgitimDetay = lazy(() => import('./pages/EgitimDetay'));
const KonusmacilarSayfasi = lazy(() => import('./pages/KonusmacilarSayfasi'));
const KayitliEgitimlerSayfasi = lazy(() => import('./pages/KayitliEgitimlerSayfasi'));
const EgitmenBasvuru = lazy(() => import('./pages/EgitmenBasvuru'));
const GirisTamamla = lazy(() => import('./pages/GirisTamamla'));
const SsoCallback = lazy(() => import('./pages/SsoCallback'));
const Profil = lazy(() => import('./pages/Profil'));
const Ekibim = lazy(() => import('./pages/Ekibim'));
const LiderlerSayfasi = lazy(() => import('./pages/LiderlerSayfasi'));
// Komisyonlar — public sayfa, detay sayfasına yönlendiriyor
const KomisyonlarSayfasi = lazy(() => import('./pages/KomisyonlarSayfasi'));
const KomisyonDetay = lazy(() => import('./pages/KomisyonDetay'));
const HakkimizdaSayfasi = lazy(() => import('./pages/HakkimizdaSayfasi'));
const EkipYonetimSayfasi = lazy(() => import('./pages/EkipYonetimSayfasi'));
const YurutmekuruluSayfasi = lazy(() => import('./pages/YurutmekuruluSayfasi'));
// Admin sayfaları — public kullanıcı hiç indirmez (en büyük kazanç)
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const GorselStudyo = lazy(() => import('./pages/GorselStudyo'));

// Hatayı ekrana basan basit error boundary
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { this.setState({ info }); console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', background: '#fee', color: '#900', whiteSpace: 'pre-wrap', fontSize: 13 }}>
          <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>UI Hatası</h2>
          <div><b>Mesaj:</b> {this.state.err?.message || String(this.state.err)}</div>
          <div style={{ marginTop: 10 }}><b>Stack:</b>{'\n'}{this.state.err?.stack || ''}</div>
          <div style={{ marginTop: 10 }}><b>Component stack:</b>{'\n'}{this.state.info?.componentStack || ''}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { isAdmin, authLoading } = useData();
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Yetki kontrol ediliyor...</div>
      </div>
    );
  }
  return isAdmin ? children : <Navigate to="/admin-giris" />;
};

// Her sayfa değişiminde pageview gönder
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}

function PageTransitionWrapper({ children }) {
  const location = useLocation();
  // key değişince component yeniden mount olur, animate-page-in tetiklenir
  return <div key={location.pathname} className="animate-page-in">{children}</div>;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">İçeriğe atla</a>
      <PageViewTracker />
      <Suspense fallback={<LoadingProgress />}>
        <PageTransitionWrapper>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/egitmen-basvuru" element={<EgitmenBasvuru />} />
          <Route path="/giris-tamamla" element={<GirisTamamla />} />
          <Route path="/sso" element={<SsoCallback />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/ekibim" element={<Ekibim />} />
          <Route path="/liderler" element={<LiderlerSayfasi />} />
          <Route path="/takvim" element={<TakvimView />} />
          <Route path="/e/:id" element={<EgitimDetay />} />
          <Route path="/konusmacilar" element={<KonusmacilarSayfasi />} />
          <Route path="/kayitli-egitimler" element={<KayitliEgitimlerSayfasi />} />
          <Route path="/komisyonlar" element={<KomisyonlarSayfasi />} />
          <Route path="/komisyonlar/:id" element={<KomisyonDetay />} />
          <Route path="/hakkimizda" element={<HakkimizdaSayfasi />} />
          <Route path="/ekip-yonetim" element={<EkipYonetimSayfasi />} />
          <Route path="/yurutmekurulu" element={<YurutmekuruluSayfasi />} />
          <Route path="/admin-giris" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gorsel"
            element={
              <ProtectedRoute>
                <GorselStudyo />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </PageTransitionWrapper>
      </Suspense>
      <BottomNav />
      <PwaInstallBanner />
      <OnboardingTour />
      <OfflineBanner />
      <ConfirmDialogProvider />
      <KeyboardHelpModal />
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <DataProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </DataProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
