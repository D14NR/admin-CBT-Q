import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';
import { CacheManager } from '../utils/cacheManager';
import { Monitor, RefreshCw, Activity, Clock, Search, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/utils/dateUtils';

// Monitoring now reads from Supabase `hasil_ujian` table directly.

interface Agenda {
  id: string;
  agenda_ujian: string;
  jenjang_studi: string | null;
  tgljam_mulai: string;
  tgljam_selesai: string;
  token_ujian: string;
}

interface MonitoringRow {
  key: string;
  peserta_id: string;
  peserta_nama: string;
  mapel_id: string;
  mapel_nama: string;
  status: string;
  waktu_selesai: string;
  isSelesai: boolean;
}

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  const row: string[] = [];

  const pushCell = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    rows.push([...row]);
    row.length = 0;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushCell();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || row.length) {
        pushCell();
        pushRow();
      }
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    pushCell();
    pushRow();
  }

  return rows.filter(r => r.length > 1);
};

const MonitoringPage = () => {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [monitoringRows, setMonitoringRows] = useState<MonitoringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [mapelFilter, setMapelFilter] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchAgendas = async () => {
      const cached = CacheManager.get<Agenda[]>('agenda_all');
      if (cached) {
        setAgendas(cached);
        return;
      }
      const { data: rows, error } = await supabase.from('agenda_ujian').select('*');
      if (error) {
        console.error(error);
        return;
      }
      const data = (rows || []).map((r: any) => ({ id: String(r.id), ...r })) as Agenda[];
      CacheManager.set('agenda_all', data, 5 * 60 * 1000);
      setAgendas(data);
    };
    fetchAgendas();
  }, []);

  const fetchMonitoringData = async () => {
    if (!selectedAgenda) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase.from('hasil_ujian').select('*').eq('agenda_id', selectedAgenda.id);
      if (error) throw error;
      const mapped: MonitoringRow[] = (rows || []).map((r: any) => ({
        key: `${r.peserta_id || ''}_${r.mapel_id || ''}_${r.id || ''}`,
        peserta_id: r.peserta_id || '-',
        peserta_nama: r.peserta_nama || '-',
        mapel_id: r.mapel_id || '-',
        mapel_nama: r.mapel_nama || '-',
        status: r.status || 'Selesai',
        waktu_selesai: r.waktu_selesai || '-',
        isSelesai: true
      }));
      setMonitoringRows(mapped);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      setMonitoringRows([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedAgenda) return;
    fetchMonitoringData();
  }, [selectedAgenda]);

  useEffect(() => {
    if (!selectedAgenda || !autoRefresh) return;
    const interval = setInterval(fetchMonitoringData, 600000);
    return () => clearInterval(interval);
  }, [selectedAgenda, autoRefresh]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return monitoringRows.filter(row => {
      const matchesSearch = !q || row.peserta_nama.toLowerCase().includes(q) || row.mapel_nama.toLowerCase().includes(q);
      const matchesMapel = !mapelFilter || row.mapel_id === mapelFilter;
      return matchesSearch && matchesMapel;
    });
  }, [monitoringRows, searchQuery, mapelFilter]);

  const handleResetRow = async (row: MonitoringRow) => {
    if (!selectedAgenda) return;
    setIsResetting(true);
    try {
      const sesiId = `${row.peserta_id}_${selectedAgenda.id}_${row.mapel_id}`;
      const { error: delSesiError } = await supabase.from('sesi_ujian').delete().eq('id', sesiId);
      if (delSesiError) throw delSesiError;

      const { error: delHasilError } = await supabase.from('hasil_ujian').delete().match({ agenda_id: selectedAgenda.id, peserta_id: row.peserta_id, mapel_id: row.mapel_id });
      if (delHasilError) throw delHasilError;

      // Sheet sync disabled; data deleted from Supabase only.
    } catch (error) {
      console.error('Reset error:', error);
    }
    setIsResetting(false);
    fetchMonitoringData();
  };

  return (
    <Layout title="Monitoring Ujian">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
              <div className="flex gap-3 items-center">
                <div className="p-3 bg-red-100 rounded-xl"><Monitor className="text-red-600" size={22} /></div>
                <div>
                  <h1 className="text-xl font-bold">Monitoring</h1>
                  <p className="text-gray-500 text-sm">Sederhana & fokus</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => fetchMonitoringData()} disabled={loading} className="px-3 py-2 bg-red-600 text-white rounded-lg flex gap-2 items-center hover:bg-red-700 disabled:opacity-50">
                  <RefreshCw className={loading ? 'animate-spin' : ''} size={16} /> Refresh
                </button>
                <button onClick={() => setAutoRefresh(!autoRefresh)} className={`px-3 py-2 border rounded-lg flex gap-2 items-center ${autoRefresh ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white'}`}>
                  <Activity className={autoRefresh ? 'animate-pulse' : ''} size={16} /> {autoRefresh ? 'Auto (5m)' : 'Auto OFF'}
                </button>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs flex items-center gap-2"><Clock size={12} /> {lastUpdate.toLocaleTimeString('id-ID')}</div>
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2 text-sm">Pilih Agenda</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {agendas.map(agenda => (
                  <button key={agenda.id} onClick={() => setSelectedAgenda(agenda)} className={`p-3 text-left border rounded-lg ${selectedAgenda?.id === agenda.id ? 'border-red-500 bg-red-50' : 'hover:border-red-300'}`}>
                    <div className="font-semibold text-sm">{agenda.agenda_ujian}</div>
                    <div className="text-xs text-gray-500">{agenda.jenjang_studi ?? '-'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedAgenda && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nama peserta atau mapel..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <div className="md:w-64">
                <SearchableSelect
                  options={[{ value: '', label: 'Semua Mata Pelajaran' }, ...Array.from(new Map(monitoringRows.map(row => [row.mapel_id, row.mapel_nama])).entries()).map(([id, name]) => ({ value: String(id), label: String(name) }))] as Option[]}
                  value={mapelFilter || null}
                  onChange={(v) => setMapelFilter(String(v))}
                  placeholder="Semua Mata Pelajaran"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3">Reset</th>
                    <th className="p-3">Nama Peserta</th>
                    <th className="p-3">Mata Pelajaran</th>
                    <th className="p-3">Status Pengerjaan</th>
                    <th className="p-3">Selesai Mengerjakan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">Belum ada data untuk agenda ini</td></tr>
                  ) : (
                    filteredRows.map(row => (
                      <tr key={row.key} className="border-b">
                        <td className="p-3">
                          <button
                            onClick={() => handleResetRow(row)}
                            disabled={isResetting}
                            className="text-red-600 flex items-center gap-2 text-sm disabled:opacity-60"
                          >
                            <Trash2 size={14} /> Reset
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{row.peserta_nama}</div>
                        </td>
                        <td className="p-3">{row.mapel_nama}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Selesai</span>
                        </td>
                        <td className="p-3 text-sm text-gray-500">{row.waktu_selesai ? formatDateTime(row.waktu_selesai) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MonitoringPage;
