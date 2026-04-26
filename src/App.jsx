import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';
import EgitmenBasvuru from './pages/EgitmenBasvuru';
import TakvimView from './pages/TakvimView';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import { trackPageView } from './utils/analytics';

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
  const { isAdmin } = useData();
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

function AppRoutes() {
  return (
    <BrowserRouter>
      <PageViewTracker />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/egitmen-basvuru" element={<EgitmenBasvuru />} />
        <Route path="/takvim" element={<TakvimView />} />
        <Route path="/admin-giris" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
