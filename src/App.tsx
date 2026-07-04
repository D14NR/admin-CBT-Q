import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Admin Pages
import { AdminLoginPage } from './pages/AdminLoginPage';
import { Dashboard } from './pages/Dashboard';
import { PesertaPage } from './pages/PesertaPage';
import { AgendaPage } from './pages/AgendaPage';
import { MapelPage } from './pages/MapelPage';
import { BankSoalPage } from './pages/BankSoalPage';
import MonitoringPage from './pages/MonitoringPage';
import { PrintKartuPage } from './pages/PrintKartuPage';
import { DaftarSekolahPage } from './pages/DaftarSekolahPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to admin login */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/peserta" element={<PesertaPage />} />
        <Route path="/admin/daftar-sekolah" element={<DaftarSekolahPage />} />
        <Route path="/admin/agenda" element={<AgendaPage />} />
        <Route path="/admin/mapel" element={<MapelPage />} />
        <Route path="/admin/bank-soal" element={<BankSoalPage />} />
        <Route path="/admin/monitoring" element={<MonitoringPage />} />
        <Route path="/admin/print-kartu" element={<PrintKartuPage />} />
        <Route path="/admin/print-kartu" element={<PrintKartuPage />} />
      </Routes>
    </BrowserRouter>
  );
}
