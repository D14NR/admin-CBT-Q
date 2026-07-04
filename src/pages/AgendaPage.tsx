import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';
import { Plus, RefreshCw, BookOpen } from 'lucide-react';
import { formatDateTime } from '@/utils/dateUtils';

interface Agenda {
  id: string;
  agenda_ujian: string;
  jenjang_studi: string | null;
  token_ujian: string;
  tgljam_mulai: string;
  tgljam_selesai: string;
  kode_soal?: string | null;
}

type MapelForm = { mata_pelajaran: string; durasi: number; jumlah_soal: number; status?: string };
const SUBJECT_OPTIONS = [
  'BAHASA INDONESIA',
  'BAHASA INDONESIA TINGKAT LANJUT',
  'BAHASA INGGRIS',
  'BAHASA INGGRIS TINGKAT LANJUT',
  'BIOLOGI',
  'EKONOMI',
  'FISIKA',
  'GEOGRAFI',
  'ILMU PENGETAHUAN ALAM',
  'ILMU PENGETAHUAN ALAM & SOSIAL',
  'ILMU PENGETAHUAN SOSIAL',
  'KIMIA',
  'LITERASI DALAM BAHASA INDONESIA',
  'LITERASI DALAM BAHASA INGGRIS',
  'MATEMATIKA',
  'MATEMATIKA TINGKAT LANJUT',
  'MATEMATIKA WAJIB',
  'PENALARAN MATEMATIKA',
  'PENALARAN UMUM',
  'PENDIDIKAN PANCASILA',
  'PENGETAHUAN BACAAN DAN MENULIS',
  'PENGETAHUAN DAN PEMAHAMAN UMUM',
  'PENGETAHUAN KUANTITATIF',
  'PRAKARYA DAN KEWIRAUSAHAAN',
  'SEJARAH',
  'SOSIOLOGI',
  'TEMA 1',
  'TEMA 2',
  'TEMA 3',
  'TEMA 4',
  'TES BAHASA INGGRIS',
  'TES INTELEGENSI UMUM',
  'TES KARAKTERISTIK PRIBADI',
  'TES POSTENSI SOSIAL',
  'TES POTENSI AKADEMIK',
  'TES WAWASAN KEBANGSAAN',
  'TKA BAHASA INDONESIA',
  'TKA BAHASA INGGRIS',
  'TKA BIOLOGI',
  'TKA EKONOMI',
  'TKA FISIKA',
  'TKA GEOGRAFI',
  'TKA KIMIA',
  'TKA MATEMATIKA',
  'TKA MATEMATIKA TINGKAT LANJUT',
  'TKA SEJARAH',
  'TKA SOSIOLOGI',
  'TOEFL',
  'TPA-KUANTITATIF',
  'TPA-LOGIKA',
  'TPA-NUMERIK',
  'TPA-VERBAL',
  'TPA-VERBAL & FIGURAL'
];

const INITIAL_STATE = {
  agenda_ujian: '',
  jenjang_studi: '',
  token_ujian: '',
  tgljam_mulai: '',
  tgljam_selesai: '',
  mapels: [] as string[],
};

export function AgendaPage() {
  const [data, setData] = useState<Agenda[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [isActiveMapelsModalOpen, setIsActiveMapelsModalOpen] = useState(false);
  const [mapelAgendaId, setMapelAgendaId] = useState<string | null>(null);
  const [mapelForm, setMapelForm] = useState<MapelForm[]>([]);
  const [activeMapels, setActiveMapels] = useState<any[]>([]);
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);
  const [selectedAgendaForMapels, setSelectedAgendaForMapels] = useState<Agenda | null>(null);
  const [isMapelDropdownOpen, setIsMapelDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const fetchAgenda = async () => {
    const { data: rows, error } = await supabase.from('agenda_ujian').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r, kode_soal: r.kode_soal } as Agenda));
    setData(items);
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, token_ujian: token }));
  };

  useEffect(() => {
    fetchAgenda();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const agendaPayload = {
        agenda_ujian: formData.agenda_ujian,
        jenjang_studi: formData.jenjang_studi || null,
        token_ujian: formData.token_ujian || null,
        tgljam_mulai: formData.tgljam_mulai || null,
        tgljam_selesai: formData.tgljam_selesai || null,
      };

      if (editingId) {
        const { error } = await supabase.from('agenda_ujian').update(agendaPayload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agenda_ujian').insert(agendaPayload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData(INITIAL_STATE);
      setEditingId(null);
      fetchAgenda();
    } catch (error: any) {
      console.error("Error saving document: ", error);
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Terjadi kesalahan saat menyimpan data: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Agenda) => {
    setFormData({
      agenda_ujian: item.agenda_ujian,
      jenjang_studi: item.jenjang_studi ?? '',
      token_ujian: item.token_ujian,
      tgljam_mulai: item.tgljam_mulai,
      tgljam_selesai: item.tgljam_selesai,
      mapels: [],
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Agenda) => {
    if (confirm(`Apakah Anda yakin ingin menghapus agenda ${item.agenda_ujian}?`)) {
      try {
        const { error } = await supabase.from('agenda_ujian').delete().eq('id', item.id);
        if (error) throw error;
        fetchAgenda();
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const columns = [
    { header: 'Agenda Ujian', accessor: 'agenda_ujian' as keyof Agenda },
    { header: 'Jenjang Studi', accessor: 'jenjang_studi' as keyof Agenda },
    { header: 'Token', accessor: 'token_ujian' as keyof Agenda },
    { header: 'Mulai', accessor: (item: Agenda) => formatDateTime(item.tgljam_mulai) },
    { header: 'Selesai', accessor: (item: Agenda) => formatDateTime(item.tgljam_selesai) },
    {
      header: 'Pilih Mata Pelajaran',
      accessor: (item: Agenda) => (
        <button
          type="button"
          onClick={() => openActiveMapelsModal(item)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <BookOpen className="h-4 w-4" />
          Pilih Mata Pelajaran
        </button>
      )
    },
  ];

  const toggleMapelSelection = (mapelId: string) => {
    setSelectedMapelIds(prev =>
      prev.includes(mapelId)
        ? prev.filter(id => id !== mapelId)
        : [...prev, mapelId]
    );
  };

  const openActiveMapelsModal = async (item: Agenda) => {
    setSelectedAgendaForMapels(item);
    // Determine selected mapels by matching `kode_soal` stored on the agenda
    const kodeSoalRaw = (item as any).kode_soal || '';
    const selectedKode = kodeSoalRaw ? String(kodeSoalRaw).split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const { data: rows, error } = await supabase.from('mata_pelajaran').select('*');
    if (error) {
      console.error('Failed to load active mapels:', error);
      setActiveMapels([]);
      setIsActiveMapelsModalOpen(true);
      return;
    }

    const active = (rows || [])
      .filter((row: any) => String(row.status || '').toLowerCase() === 'aktif')
      .map((row: any) => ({
        id: String(row.id),
        mata_pelajaran: row.mata_pelajaran || '',
        durasi: Number(row.durasi) || 0,
        jumlah_soal: Number(row.jumlah_soal) || 0,
        status: row.status || 'aktif',
        kode_soal: row.kode_soal || '',
      }));

    // Pre-select mapels whose kode_soal are present in the agenda.kode_soal
    const selectedIds = (active || []).filter(a => selectedKode.includes(String(a.kode_soal))).map(a => String(a.id));
    setSelectedMapelIds(selectedIds);

    setActiveMapels(active);
    setIsActiveMapelsModalOpen(true);
  };

  const saveSelectedMapels = async () => {
    if (!selectedAgendaForMapels?.id) return;

    setLoading(true);
    try {
      // Instead of writing agenda_id on mata_pelajaran, collect kode_soal from selected mapels
      let kodeSoal = '';
      if (selectedMapelIds.length > 0) {
        const { data: selectedRows, error: selErr } = await supabase.from('mata_pelajaran').select('kode_soal').in('id', selectedMapelIds);
        if (selErr) throw selErr;
        const kodeList = (selectedRows || []).map((r: any) => r.kode_soal).filter(Boolean);
        kodeSoal = kodeList.join(',');
      }

      const { error: updErr } = await supabase.from('agenda_ujian').update({ kode_soal: kodeSoal }).eq('id', selectedAgendaForMapels.id);
      if (updErr) throw updErr;

      setIsActiveMapelsModalOpen(false);
      setSelectedAgendaForMapels(null);
      setSelectedMapelIds([]);
      fetchAgenda();
    } catch (err: any) {
      console.error('Failed saving selected mapels:', err);
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      alert('Gagal menyimpan mata pelajaran: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const openMapelModal = async (item: Agenda) => {
    // Load mapel details by matching agenda.kode_soal to mata_pelajaran.kode_soal
    const kodeSoalRaw = (item as any).kode_soal || '';
    const kodeList = kodeSoalRaw ? String(kodeSoalRaw).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    if (kodeList.length === 0) {
      setMapelForm([]);
    } else {
      const { data: rows, error } = await supabase.from('mata_pelajaran').select('*').in('kode_soal', kodeList);
      if (error) {
        console.error('Failed to load mapels for modal:', error);
        setMapelForm([]);
      } else {
        setMapelForm((rows || []).map((r: any) => ({ mata_pelajaran: r.mata_pelajaran || '', durasi: r.durasi || 0, jumlah_soal: r.jumlah_soal || 0, status: r.status || 'Aktif' })));
      }
    }
    setMapelAgendaId(item.id);
    setIsMapelModalOpen(true);
  };

  const openMapelSettingsForForm = async () => {
    // If editing existing agenda, prefer loading existing DB values for selected subjects
    if (editingId) {
      // Load agenda to get kode_soal, then fetch mata_pelajaran by kode_soal to merge details
      const { data: agendaRows, error: agErr } = await supabase.from('agenda_ujian').select('kode_soal').eq('id', editingId).single();
      if (agErr) {
        console.error('Failed to load agenda kode_soal:', agErr);
        setMapelForm((formData.mapels || []).map((s: string) => ({ mata_pelajaran: s, durasi: 0, jumlah_soal: 0, status: 'Aktif' })));
      } else {
        const kodeSoalRaw = (agendaRows as any).kode_soal || '';
        const kodeList = kodeSoalRaw ? String(kodeSoalRaw).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        if (kodeList.length === 0) {
          setMapelForm((formData.mapels || []).map((s: string) => ({ mata_pelajaran: s, durasi: 0, jumlah_soal: 0, status: 'Aktif' })));
        } else {
          const { data: rows, error } = await supabase.from('mata_pelajaran').select('*').in('kode_soal', kodeList);
          if (error) {
            console.error('Failed to load mapels for modal:', error);
            setMapelForm((formData.mapels || []).map((s: string) => ({ mata_pelajaran: s, durasi: 0, jumlah_soal: 0, status: 'Aktif' })));
          } else {
            const map = new Map((rows || []).map((r: any) => [String(r.mata_pelajaran).toLowerCase().trim(), r]));
            const merged = (formData.mapels || []).map((s: string) => {
              const key = s.toLowerCase().trim();
              const existing = map.get(key);
              if (existing) return { mata_pelajaran: s, durasi: existing.durasi || 0, jumlah_soal: existing.jumlah_soal || 0, status: existing.status || 'Aktif' };
              return { mata_pelajaran: s, durasi: 0, jumlah_soal: 0, status: 'Aktif' };
            });
            setMapelForm(merged);
          }
        }
      }
      setMapelAgendaId(editingId);
      setIsMapelModalOpen(true);
    } else {
      // New agenda: use current selections
      setMapelForm((formData.mapels || []).map((s: string) => ({ mata_pelajaran: s, durasi: 0, jumlah_soal: 0, status: 'Aktif' })));
      setMapelAgendaId(null);
      setIsMapelModalOpen(true);
    }
  };

  const saveMapels = async () => {
    setLoading(true);
    try {
      if (mapelAgendaId) {
        // For existing agenda, update agenda_ujian.kode_soal with kode_soal from selected mapelForm
        const kodeList: string[] = [];
        if (Array.isArray(mapelForm) && mapelForm.length > 0) {
          // try to match mata_pelajaran rows to get kode_soal
          const names = mapelForm.map(m => m.mata_pelajaran).filter(Boolean);
          const { data: rows, error } = await supabase.from('mata_pelajaran').select('kode_soal,mata_pelajaran').in('mata_pelajaran', names);
          if (error) throw error;
          (rows || []).forEach((r: any) => { if (r.kode_soal) kodeList.push(r.kode_soal); });
        }
        const kodeSoal = kodeList.join(',');
        const { error: updErr } = await supabase.from('agenda_ujian').update({ kode_soal: kodeSoal }).eq('id', mapelAgendaId);
        if (updErr) throw updErr;
        setIsMapelModalOpen(false);
        setMapelAgendaId(null);
        fetchAgenda();
      } else {
        // For new agenda (no id yet), save mapelForm into formData as temporary details
        setFormData({ ...formData, mapelsDetail: mapelForm });
        setIsMapelModalOpen(false);
      }
    } catch (err: any) {
      console.error('Failed saving mapels:', err);
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      alert('Gagal menyimpan mapel: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Agenda Ujian">
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">Kelola jadwal dan agenda ujian.</p>
        <button
          onClick={() => {
            setFormData(INITIAL_STATE);
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Agenda
        </button>
      </div>

      <Table
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        keyExtractor={(item) => item.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Agenda' : 'Tambah Agenda'}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Agenda Ujian</label>
            <input
              required
              type="text"
              value={formData.agenda_ujian}
              onChange={e => setFormData({ ...formData, agenda_ujian: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Jenjang Studi</label>
            <SearchableSelect
              options={[
                { value: '', label: 'Pilih jenjang studi' },
                { value: '3 SMA', label: '3 SMA' },
                { value: '2 SMA', label: '2 SMA' },
                { value: '1 SMA', label: '1 SMA' },
                { value: '3 SMP', label: '3 SMP' },
                { value: '2 SMP', label: '2 SMP' },
                { value: '1 SMP', label: '1 SMP' },
                { value: '6 SD', label: '6 SD' },
                { value: '5 SD', label: '5 SD' },
                { value: '4 SD', label: '4 SD' }
              ] as Option[]}
              value={formData.jenjang_studi || null}
              onChange={(v) => setFormData({ ...formData, jenjang_studi: String(v) })}
              placeholder="Pilih jenjang studi"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Token Ujian</label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                value={formData.token_ujian}
                onChange={e => setFormData({ ...formData, token_ujian: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={generateToken}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors"
                title="Generate Token"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tgl & Jam Mulai</label>
              <input
                required
                type="datetime-local"
                value={formData.tgljam_mulai}
                onChange={e => setFormData({ ...formData, tgljam_mulai: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tgl & Jam Selesai</label>
              <input
                required
                type="datetime-local"
                value={formData.tgljam_selesai}
                onChange={e => setFormData({ ...formData, tgljam_selesai: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isActiveMapelsModalOpen}
        onClose={() => setIsActiveMapelsModalOpen(false)}
        title={selectedAgendaForMapels ? `Mata Pelajaran Aktif - ${selectedAgendaForMapels.agenda_ujian}` : 'Mata Pelajaran Aktif'}
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Pilih mata pelajaran yang ingin diujikan untuk agenda <span className="font-semibold text-gray-700">{selectedAgendaForMapels?.agenda_ujian || ''}</span>.
          </p>
          {activeMapels.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada mata pelajaran aktif yang tersedia saat ini.</p>
          ) : (
            activeMapels.map((mapel) => {
              const isSelected = selectedMapelIds.includes(mapel.id);
              return (
                <button
                  key={mapel.id}
                  type="button"
                  onClick={() => toggleMapelSelection(mapel.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{mapel.mata_pelajaran}</p>
                      <p className="text-sm text-gray-500">Durasi: {mapel.durasi} menit • Jumlah Soal: {mapel.jumlah_soal}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isSelected ? 'bg-red-600 text-white' : 'bg-green-100 text-green-700'}`}>
                        {isSelected ? 'Terpilih' : 'Aktif'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsActiveMapelsModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={saveSelectedMapels}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isMapelModalOpen}
        onClose={() => setIsMapelModalOpen(false)}
        title="Pengaturan Mata Pelajaran"
        size="xl"
      >
        <div className="space-y-4">
          {(mapelForm || []).map((m, idx) => (
            <div key={idx} className="space-y-2 border-b pb-3">
              <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
              <input
                type="text"
                aria-label={`Nama Mata Pelajaran ${idx + 1}`}
                value={m.mata_pelajaran}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 cursor-not-allowed"
              />

              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-sm text-gray-600">Jumlah Soal</label>
                  <input
                    type="number"
                    aria-label={`Jumlah Soal ${idx + 1}`}
                    placeholder="Jumlah Soal"
                    value={m.jumlah_soal}
                    onChange={e => {
                      const next = [...mapelForm];
                      next[idx] = { ...next[idx], jumlah_soal: Number(e.target.value) };
                      setMapelForm(next);
                    }}
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Durasi (menit)</label>
                  <input
                    type="number"
                    aria-label={`Durasi ${idx + 1}`}
                    placeholder="Durasi (menit)"
                    value={m.durasi}
                    onChange={e => {
                      const next = [...mapelForm];
                      next[idx] = { ...next[idx], durasi: Number(e.target.value) };
                      setMapelForm(next);
                    }}
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <SearchableSelect
                    options={[{ value: 'Aktif', label: 'Aktif' }, { value: 'Tidak Aktif', label: 'Tidak Aktif' }] as Option[]}
                    value={m.status || 'Aktif'}
                    onChange={(v) => {
                      const next = [...mapelForm];
                      next[idx] = { ...next[idx], status: String(v) };
                      setMapelForm(next);
                    }}
                    placeholder="Pilih Status"
                  />
                </div>

              </div>
            </div>
          ))}

          {/* Tombol tambah dan hapus mata pelajaran dinonaktifkan sesuai permintaan */}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setIsMapelModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300">Batal</button>
            <button type="button" onClick={saveMapels} className="px-4 py-2 rounded-lg bg-red-600 text-white">Simpan</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
