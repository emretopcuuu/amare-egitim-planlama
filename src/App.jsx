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
import { gecYukle, parcaHatasiMi } from './utils/gecYukle';

// Code-split — public sayfalar dahil hepsi route-level lazy load
// İlk yükleme: sadece HomePage indirilir, diğerleri kullanıcı navigasyonu ile
// gecYukle: yeni sürüm yayınlandıysa eski parça adı 404 verir → sayfa bir kez
// kendiliğinden yenilenir (bkz. utils/gecYukle.js).
const TakvimView = lazy(gecYukle(() => import('./pages/TakvimView')));
const EgitimDetay = lazy(gecYukle(() => import('./pages/EgitimDetay')));
const KonusmacilarSayfasi = lazy(gecYukle(() => import('./pages/KonusmacilarSayfasi')));
const KayitliEgitimlerSayfasi = lazy(gecYukle(() => import('./pages/KayitliEgitimlerSayfasi')));
const DurumSayfasi = lazy(gecYukle(() => import('./pages/DurumSayfasi')));
const ZoomAnaliz = lazy(gecYukle(() => import('./pages/ZoomAnaliz')));
const AraSayfasi = lazy(gecYukle(() => import('./pages/AraSayfasi')));
const EgitmenBasvuru = lazy(gecYukle(() => import('./pages/EgitmenBasvuru')));
const GirisTamamla = lazy(gecYukle(() => import('./pages/GirisTamamla')));
const SsoCallback = lazy(gecYukle(() => import('./pages/SsoCallback')));
const Profil = lazy(gecYukle(() => import('./pages/Profil')));
const Ekibim = lazy(gecYukle(() => import('./pages/Ekibim')));
const LiderlerSayfasi = lazy(gecYukle(() => import('./pages/LiderlerSayfasi')));
// Komisyonlar — public sayfa, detay sayfasına yönlendiriyor
const KomisyonlarSayfasi = lazy(gecYukle(() => import('./pages/KomisyonlarSayfasi')));
const KomisyonDetay = lazy(gecYukle(() => import('./pages/KomisyonDetay')));
const HakkimizdaSayfasi = lazy(gecYukle(() => import('./pages/HakkimizdaSayfasi')));
const EkipYonetimSayfasi = lazy(gecYukle(() => import('./pages/EkipYonetimSayfasi')));
const YurutmekuruluSayfasi = lazy(gecYukle(() => import('./pages/YurutmekuruluSayfasi')));
// Admin sayfaları — public kullanıcı hiç indirmez (en büyük kazanç)
const AdminLogin = lazy(gecYukle(() => import('./pages/AdminLogin')));
const AdminPanel = lazy(gecYukle(() => import('./pages/AdminPanel')));
const GorselStudyo = lazy(gecYukle(() => import('./pages/GorselStudyo')));
const LiderProfil = lazy(gecYukle(() => import('./pages/LiderProfil')));

// Hatayı ekrana basan basit error boundary
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { this.setState({ info }); console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.err) {
      // Parça indirilemedi: kullanıcıya yığın dökümü DEĞİL, insanca bir ekran.
      // (gecYukle zaten bir kez yenilemeyi denedi; buraya düştüyse ağ sorunu var.)
      if (parcaHatasiMi(this.state.err)) {
        return (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            <div style={{ maxWidth: 360 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Güncelleme yüklenemedi</h2>
              <p style={{ fontSize: 14, opacity: .75, marginBottom: 20 }}>
                İnternet bağlantını kontrol edip tekrar dene.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#fbbf24', color: '#3b1772', fontWeight: 700, padding: '12px 28px', borderRadius: 12, border: 'none', fontSize: 15 }}
              >Yeniden dene</button>
            </div>
          </div>
        );
      }
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
          <Route path="/lider/:id" element={<LiderProfil />} />
          <Route path="/kayitli-egitimler" element={<KayitliEgitimlerSayfasi />} />
          <Route path="/durum" element={<DurumSayfasi />} />
          <Route path="/zoom-analiz" element={<ZoomAnaliz />} />
          <Route path="/ara" element={<AraSayfasi />} />
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
