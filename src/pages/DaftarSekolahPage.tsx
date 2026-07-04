import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, PencilLine, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';

interface School {
  id: string;
  jenjang_studi?: string | null;
  asal_sekolah?: string | null;
}

const INITIAL_FORM = {
  jenjang_studi: '',
  asal_sekolah: ''
};

export function DaftarSekolahPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [editing, setEditing] = useState<School | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  const fetchSchools = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: rows, error } = await supabase.from('asal_sekolah').select('*');
      if (error) throw error;
      const data = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as School));
      setSchools(data);
    } catch {
      setError('Gagal memuat data sekolah.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return schools;
    return schools.filter((school) => String(school.asal_sekolah || '').toLowerCase().includes(keyword) || String(school.jenjang_studi || '').toLowerCase().includes(keyword));
  }, [schools, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM as any);
    setIsModalOpen(true);
  };

  const openEdit = (school: School) => {
    setEditing(school);
    setForm({ jenjang_studi: school.jenjang_studi || '', asal_sekolah: school.asal_sekolah || '' } as any);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!String((form as any).asal_sekolah || '').trim()) {
      setError('Nama sekolah wajib diisi.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        jenjang_studi: (form as any).jenjang_studi || null,
        asal_sekolah: String((form as any).asal_sekolah || '').trim() || null
      };
      if (editing) {
        const { error } = await supabase.from('asal_sekolah').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('asal_sekolah').insert(payload);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setForm(INITIAL_FORM as any);
      setEditing(null);
      await fetchSchools();
    } catch {
      setError('Gagal menyimpan data sekolah.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('asal_sekolah').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await fetchSchools();
    } catch {
      setError('Gagal menghapus data sekolah.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title="Daftar Sekolah">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Daftar Sekolah</h1>
            <p className="text-sm text-gray-500">Kelola data sekolah untuk pendaftaran peserta.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari sekolah atau jenjang..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              <PlusCircle className="h-4 w-4" /> Tambah Sekolah
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              Total sekolah: <span className="font-semibold text-gray-800">{filteredSchools.length}</span>
            </p>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {loading && (
              <div className="px-6 py-6 text-sm text-gray-500">Memuat data sekolah...</div>
            )}
            {!loading && filteredSchools.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500">Tidak ada sekolah yang cocok.</div>
            )}
            {!loading && filteredSchools.length > 0 && (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">No</th>
                    <th className="px-6 py-3 font-semibold">Jenjang</th>
                    <th className="px-6 py-3 font-semibold">Nama Sekolah</th>
                    <th className="px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((school, index) => (
                    <tr key={school.id} className="border-t border-gray-100">
                      <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-6 py-3 text-gray-700">{school.jenjang_studi || '-'}</td>
                      <td className="px-6 py-3 text-gray-800">{school.asal_sekolah}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(school)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:border-red-200 hover:text-red-600"
                          >
                            <PencilLine className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(school)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Ubah Sekolah' : 'Tambah Sekolah'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenjang Studi</label>
            <SearchableSelect
              options={[
                { value: '', label: 'Pilih Jenjang' },
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
              value={(form as any).jenjang_studi || null}
              onChange={(v) => setForm({ ...(form as any), jenjang_studi: String(v) } as any)}
              placeholder="Pilih Jenjang"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
            <input
              type="text"
              value={(form as any).asal_sekolah}
              onChange={(e) => setForm({ ...(form as any), asal_sekolah: e.target.value } as any)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-red-500 focus:outline-none"
              placeholder="Contoh: SMA Negeri 1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Sekolah"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Hapus sekolah <span className="font-semibold">{deleteTarget?.asal_sekolah}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSaving ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
