import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';
import EgitmenBasvuru from './pages/EgitmenBasvuru';
import TakvimView from './pages/TakvimView';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

const ProtectedRoute = ({ children }) => {
  const { isAdmin } = useData();
  return isAdmin ? children : <Navigate to="/admin-giris" />;
};

function AppRoutes() {
  return (
    <BrowserRouter>
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
    <LanguageProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </LanguageProvider>
  );
}

export default App;
