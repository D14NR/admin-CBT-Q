import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { SafeStorage } from '../utils/safeStorage';

const LOGO_URL = "https://lh3.googleusercontent.com/d/1zPGgFw4WVSz4v-Clgd0XvlgZ41QePiAY=w1200?authuser=0";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (username === 'Admin' && password === '290192') {
      SafeStorage.setItem('admin', JSON.stringify({ username, role: 'admin' }));
      navigate('/admin/dashboard');
    } else {
      setError('Username atau password salah');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#1F2937] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      {/* Back link to student login removed — admin-only application */}

      <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] border border-white/10 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 pt-8 pb-6 px-6 text-center">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4 overflow-hidden p-2 shadow-lg">
            {!imgError ? (
              <img src={LOGO_URL} alt="CBT-Q" className="w-full h-full object-contain" onError={() => setImgError(true)} />
            ) : (
              <span className="text-2xl font-bold text-gray-800">Q</span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-white" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-300 text-sm">Masuk sebagai Administrator</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl text-center">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username admin" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/80 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white/80 focus:bg-white transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-xl hover:from-black hover:to-gray-900 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-black/30">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
            ) : (
              <><LogIn className="h-5 w-5" /> Masuk</>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-white/40 text-xs">CBT-Q Admin • dibuat oleh D14nr</p>
    </div>
  );
}
