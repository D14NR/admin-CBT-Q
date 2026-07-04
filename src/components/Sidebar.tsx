import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, BookOpen, LogOut, Monitor, Menu, X, Printer, School } from 'lucide-react';
import { SafeStorage } from '../utils/safeStorage';

const LOGO_URL = "https://lh3.googleusercontent.com/d/1zPGgFw4WVSz4v-Clgd0XvlgZ41QePiAY=w1200?authuser=0";

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/peserta', icon: Users, label: 'Peserta' },
  { to: '/admin/daftar-sekolah', icon: School, label: 'Daftar Sekolah' },
  { to: '/admin/agenda', icon: Calendar, label: 'Agenda Ujian' },
  { to: '/admin/mapel', icon: BookOpen, label: 'Mata Pelajaran' },
  { to: '/admin/monitoring', icon: Monitor, label: 'Monitoring' },
  { to: '/admin/print-kartu', icon: Printer, label: 'Print Kartu Tes' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-red-700 text-white rounded-lg flex items-center justify-center shadow-lg">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-60 bg-red-700 text-white z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-red-600/50">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
            {!imgError ? (
              <img src={LOGO_URL} alt="CBT-Q" className="w-full h-full object-contain" onError={() => setImgError(true)} />
            ) : (
              <span className="text-sm font-bold text-red-600">Q</span>
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CBT-Q</h1>
            <p className="text-red-200 text-xs">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-red-700' : 'text-red-100 hover:bg-white/10'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-red-600/50">
          <button onClick={() => { SafeStorage.removeItem('admin'); navigate('/'); }} className="w-full flex items-center justify-center gap-2 bg-red-800/60 hover:bg-red-900 text-white py-2 px-4 rounded-lg transition-colors text-sm">
            <LogOut className="h-4 w-4" /> Logout
          </button>
          <p className="text-red-300/50 text-xs text-center mt-2">dibuat oleh D14nr</p>
        </div>
      </aside>
    </>
  );
}
