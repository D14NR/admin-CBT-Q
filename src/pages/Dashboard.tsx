import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Users, Calendar, BookOpen, Monitor, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';

const menuCards = [
  { title: 'Peserta', desc: 'Kelola data peserta', icon: Users, to: '/admin/peserta', color: 'bg-blue-500' },
  { title: 'Agenda Ujian', desc: 'Atur jadwal ujian', icon: Calendar, to: '/admin/agenda', color: 'bg-green-500' },
  { title: 'Mata Pelajaran', desc: 'Kelola mata pelajaran', icon: BookOpen, to: '/admin/mapel', color: 'bg-orange-500' },
  { title: 'Monitoring', desc: 'Pantau ujian realtime', icon: Monitor, to: '/admin/monitoring', color: 'bg-red-500' },
];

export function Dashboard() {
  const [stats, setStats] = useState({ peserta: 0, agenda: 0, mapel: 0, soal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, a, m, s] = await Promise.all([
          supabase.from('peserta').select('id', { count: 'exact' }),
          supabase.from('agenda_ujian').select('id', { count: 'exact' }),
          supabase.from('mata_pelajaran').select('id', { count: 'exact' }),
          supabase.from('bank_soal').select('id', { count: 'exact' }),
        ]);
        setStats({
          peserta: p.count || 0,
          agenda: a.count || 0,
          mapel: m.count || 0,
          soal: s.count || 0
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Peserta', value: stats.peserta, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Agenda Ujian', value: stats.agenda, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Mata Pelajaran', value: stats.mapel, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <Layout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-red-600 rounded-xl p-6 text-white mb-6">
        <h1 className="text-xl font-bold mb-1">Selamat Datang! 👋</h1>
        <p className="text-red-100 text-sm">Kelola ujian berbasis komputer dengan mudah menggunakan CBT-Q.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.title} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs font-medium">{s.title}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {loading ? <span className="inline-block w-10 h-7 bg-gray-200 rounded animate-pulse" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Menu Cards */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Menu Utama</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {menuCards.map((card) => (
          <Link key={card.title} to={card.to} className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">{card.title}</h3>
            <p className="text-xs text-gray-500 mb-2">{card.desc}</p>
            <span className="flex items-center text-xs font-medium text-red-600 group-hover:text-red-700">
              Kelola <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
