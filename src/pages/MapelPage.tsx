import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';
import { Plus } from 'lucide-react';

interface Mapel {
  id: string;
  mata_pelajaran: string;
  durasi: number;
  jumlah_soal: number;
  status: string;
  kode_soal?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  jenjang_studi?: string | null;
}

const INITIAL_STATE = {
  jenjang_studi: '',
  mata_pelajaran: '',
  durasi: '',
  jumlah_soal: '',
  status: 'aktif',
  kode_soal: ''
};

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

export function MapelPage() {
  const [data, setData] = useState<Mapel[]>([]);
  const [filteredData, setFilteredData] = useState<Mapel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [soalCountsByMapel, setSoalCountsByMapel] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const fetchMapel = async () => {
    const { data: rows, error } = await supabase.from('mata_pelajaran').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({
      id: String(r.id),
      mata_pelajaran: r.mata_pelajaran,
      durasi: Number(r.durasi) || 0,
      jumlah_soal: Number(r.jumlah_soal) || 0,
      status: r.status || 'aktif',
      jenjang_studi: r.jenjang_studi || null,
      kode_soal: r.kode_soal || '',
      created_at: r.created_at || null,
      updated_at: r.updated_at || null,
    } as Mapel));
    setData(items);
  };

  const fetchSoalCounts = async () => {
    const { data: rows, error } = await supabase.from('bank_soal').select('id, mata_pelajaran');
    if (error) {
      console.error(error);
      return;
    }

    const counts = (rows || []).reduce<Record<string, number>>((acc, row: any) => {
      const name = String(row.mata_pelajaran || '').trim();
      if (!name) return acc;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    setSoalCountsByMapel(counts);
  };

  useEffect(() => {
    fetchMapel();
    fetchSoalCounts();
  }, []);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const autoJumlahSoal = Number(soalCountsByMapel[String(formData.mata_pelajaran).trim()] || formData.jumlah_soal || 0);
      const payload = {
        jenjang_studi: String(formData.jenjang_studi || '').trim() || null,
        mata_pelajaran: String(formData.mata_pelajaran).trim(),
        durasi: Number(formData.durasi) || 0,
        jumlah_soal: autoJumlahSoal,
        status: String(formData.status || 'aktif').toLowerCase(),
        kode_soal: formData.kode_soal ? String(formData.kode_soal).trim() : null,
      };

      if (editingId) {
        const { error } = await supabase.from('mata_pelajaran').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mata_pelajaran').insert(payload);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData(INITIAL_STATE);
      setEditingId(null);
      fetchMapel();
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Mapel) => {
    setFormData({
      jenjang_studi: (item as any).jenjang_studi || '',
      mata_pelajaran: item.mata_pelajaran,
      durasi: item.durasi,
      jumlah_soal: soalCountsByMapel[item.mata_pelajaran] || item.jumlah_soal || 0,
      status: item.status,
      kode_soal: item.kode_soal || ''
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Mapel) => {
    if (confirm(`Apakah Anda yakin ingin menghapus mata pelajaran ${item.mata_pelajaran}?`)) {
      try {
        const { error } = await supabase.from('mata_pelajaran').delete().eq('id', item.id);
        if (error) throw error;
        fetchMapel();
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const columns = [
    { header: 'Mata Pelajaran', accessor: 'mata_pelajaran' as keyof Mapel },
    { header: 'Durasi (Menit)', accessor: 'durasi' as keyof Mapel },
    { header: 'Jumlah Soal', accessor: 'jumlah_soal' as keyof Mapel },
    {
      header: 'Status',
      accessor: (item: Mapel) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          item.status === 'aktif'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {item.status}
        </span>
      )
    },
    { header: 'Kode Soal', accessor: 'kode_soal' as keyof Mapel },
  ];

  return (
    <Layout title="Mata Pelajaran">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <p className="text-gray-600">Kelola data mata pelajaran sesuai skema tabel.</p>
        <button
          onClick={() => {
            setFormData(INITIAL_STATE);
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Mapel
        </button>
      </div>

      {/* Info */}
      <div className="mb-4 text-sm text-gray-500">
        Menampilkan {filteredData.length} dari {data.length} mata pelajaran
      </div>

      <Table
        data={filteredData}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConfigure={(item) => navigate(`/admin/bank-soal?mapel_id=${item.id}&mata_pelajaran=${encodeURIComponent(item.mata_pelajaran)}`)}
        keyExtractor={(item) => item.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Jenjang Studi</label>
            <SearchableSelect
              options={[
                { value: '', label: 'Pilih Jenjang Studi' },
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
              placeholder="Pilih Jenjang Studi"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
            <SearchableSelect
              options={[{ value: '', label: 'Pilih Mata Pelajaran' }, ...SUBJECT_OPTIONS.map(s => ({ value: s, label: s }))] as Option[]}
              value={formData.mata_pelajaran || null}
              onChange={(v) => setFormData({ ...formData, mata_pelajaran: String(v) })}
              placeholder="Pilih Mata Pelajaran"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Durasi Ujian (Menit)</label>
              <input
                required
                type="number"
                value={formData.durasi}
                onChange={e => setFormData({ ...formData, durasi: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Jumlah Soal (Otomatis)</label>
              <input
                type="number"
                readOnly
                value={formData.jumlah_soal}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-gray-500">Diisi otomatis dari data soal yang sudah ada di Kelola Soal.</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kode Soal</label>
            <input
              type="text"
              value={formData.kode_soal}
              onChange={e => setFormData({ ...formData, kode_soal: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="(opsional)"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <SearchableSelect
              options={[{ value: 'aktif', label: 'Aktif' }, { value: 'tidak aktif', label: 'Tidak Aktif' }] as Option[]}
              value={formData.status || null}
              onChange={(v) => setFormData({ ...formData, status: String(v) })}
              placeholder="Pilih Status"
            />
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
    </Layout>
  );
}
