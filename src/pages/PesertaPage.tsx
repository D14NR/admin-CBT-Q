import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';
import { Plus, Search, Trash2, Upload, FileDown, Download, RefreshCw } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { normalizePhoneNumber } from '@/utils/phoneUtils';

interface Peserta {
  id: string;
  agenda_id: string;
  nama: string;
  tanggal_lahir: string; // ISO date string
  asal_sekolah?: string | null;
  jenjang_studi?: string | null;
  no_whatsapp_siswa?: string | null;
  no_whatsapp_orang_tua?: string | null;
  kelas?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Agenda {
  id: string;
  agenda_ujian: string;
  tgljam_mulai?: string;
  tgljam_selesai?: string;
}

interface School {
  id: string;
  asal_sekolah?: string | null;
  jenjang_studi?: string | null;
}

const INITIAL_STATE = {
  agenda_id: '',
  nama: '',
  tanggal_lahir: '',
  asal_sekolah: '',
  jenjang_studi: '',
  kelas: '',
  no_whatsapp_siswa: '',
  no_whatsapp_orang_tua: ''
};

export function PesertaPage() {
  const [data, setData] = useState<Peserta[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  // New Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [importAgendaId, setImportAgendaId] = useState('');
  const [exportAgendaId, setExportAgendaId] = useState('');
  const [filterSekolah, setFilterSekolah] = useState('');
  const [filterAgenda, setFilterAgenda] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schools for searchable dropdown
  const [schools, setSchools] = useState<School[]>([]);
  const [sekolahQuery, setSekolahQuery] = useState('');
  const [showSekolahDropdown, setShowSekolahDropdown] = useState(false);

  const fetchSchools = async () => {
    try {
      const { data: rows, error } = await supabase.from('asal_sekolah').select('*');
      if (error) {
        console.error('Error fetching schools', error);
        return;
      }
      const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as School));
      setSchools(items);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeserta = async () => {
    const { data: rows, error } = await supabase.from('peserta').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as Peserta));
    setData(items);
  };

  const fetchAgendas = async () => {
    const { data: rows, error } = await supabase.from('agenda_ujian').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as Agenda));
    setAgendas(items);
  };

  useEffect(() => {
    fetchPeserta();
    fetchAgendas();
    fetchSchools();
  }, []);

  // Filtered Data Logic
  const filteredData = data.filter(item => {
    const matchSearch = (item.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.no_whatsapp_siswa || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSekolah = filterSekolah ? item.asal_sekolah === filterSekolah : true;
    const matchAgenda = filterAgenda ? item.agenda_id === filterAgenda : true;
    return matchSearch && matchSekolah && matchAgenda;
  });

  const uniqueSchools = Array.from(new Set(schools.map(item => item.asal_sekolah))).filter(Boolean);

  const filteredSchoolOptions = schools
    .filter(s => !!s.asal_sekolah)
    .filter(s => {
      // If jenjang selected, only show schools matching jenjang
      const selectedJenjang = (formData as any).jenjang_studi;
      if (selectedJenjang) {
        if (String(s.jenjang_studi || '').toLowerCase() !== String(selectedJenjang).toLowerCase()) return false;
      }
      const q = sekolahQuery.trim().toLowerCase();
      if (!q) return true;
      return String(s.asal_sekolah).toLowerCase().includes(q) || String(s.jenjang_studi || '').toLowerCase().includes(q);
    });

  // Handle No WA change - auto normalize username
  const handleNoWaChange = (value: string) => {
    const normalized = normalizePhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      no_whatsapp_siswa: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Build payload according to new peserta schema
      const normalizedNoSiswa = normalizePhoneNumber(formData.no_whatsapp_siswa || '');
      if (!formData.agenda_id) {
        alert('Agenda Ujian wajib diisi');
        setLoading(false);
        return;
      }
      if (!formData.nama) {
        alert('Nama peserta wajib diisi');
        setLoading(false);
        return;
      }
      if (!formData.tanggal_lahir) {
        alert('Tanggal lahir wajib diisi');
        setLoading(false);
        return;
      }

      const payload: any = {
        agenda_id: formData.agenda_id,
        nama: formData.nama,
        tanggal_lahir: formData.tanggal_lahir,
        asal_sekolah: formData.asal_sekolah || null,
        jenjang_studi: formData.jenjang_studi || null,
        kelas: (formData as any).kelas || null,
        no_whatsapp_siswa: normalizedNoSiswa || null,
        no_whatsapp_orang_tua: normalizePhoneNumber(formData.no_whatsapp_orang_tua || '') || null
      };

      if (editingId) {
        const { error } = await supabase.from('peserta').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('peserta').insert(payload);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData(INITIAL_STATE as any);
      setEditingId(null);
      fetchPeserta();
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Peserta) => {
    setFormData({
      agenda_id: item.agenda_id,
      nama: item.nama,
      tanggal_lahir: item.tanggal_lahir ? String(item.tanggal_lahir).slice(0,10) : '',
      asal_sekolah: item.asal_sekolah || '',
      jenjang_studi: item.jenjang_studi || '',
      kelas: item.kelas || '',
      no_whatsapp_siswa: item.no_whatsapp_siswa || '',
      no_whatsapp_orang_tua: item.no_whatsapp_orang_tua || ''
    } as any);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Peserta) => {
    if (confirm(`Apakah Anda yakin ingin menghapus peserta ${item.nama}?`)) {
      try {
        const { error } = await supabase.from('peserta').delete().eq('id', item.id);
        if (error) throw error;
        fetchPeserta();
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} peserta terpilih?`)) {
      setLoading(true);
      try {
        const { error } = await supabase.from('peserta').delete().in('id', selectedIds);
        if (error) throw error;
        setSelectedIds([]);
        fetchPeserta();
        alert("Data terpilih berhasil dihapus");
      } catch (error) {
        console.error("Error deleting selected: ", error);
        alert("Gagal menghapus sebagian data");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA data peserta? Tindakan ini tidak dapat dibatalkan.")) {
      const confirm2 = prompt("Ketik 'HAPUS' untuk mengonfirmasi:");
      if (confirm2 !== 'HAPUS') return;

      setLoading(true);
      try {
        const { data: rows, error: fetchError } = await supabase.from('peserta').select('id');
        if (fetchError) throw fetchError;
        const ids = (rows || []).map((r: any) => String(r.id));
        if (ids.length) {
          const { error } = await supabase.from('peserta').delete().in('id', ids);
          if (error) throw error;
        }
        setSelectedIds([]);
        fetchPeserta();
        alert("Semua data berhasil dihapus");
      } catch (error) {
        console.error("Error deleting all: ", error);
        alert("Gagal menghapus semua data");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExport = () => {
    if (!exportAgendaId) {
      alert('Pilih Agenda Ujian terlebih dahulu sebelum export.');
      return;
    }
    const selectedAgenda = agendas.find(agenda => agenda.id === exportAgendaId);
    const exportData = data
      .filter(item => item.agenda_id === exportAgendaId)
      .map(item => ({
        nama: item.nama,
        tanggal_lahir: item.tanggal_lahir ? String(item.tanggal_lahir).slice(0,10) : '',
        asal_sekolah: item.asal_sekolah || '',
        jenjang_studi: item.jenjang_studi || '',
        kelas: item.kelas || '',
        no_whatsapp_siswa: item.no_whatsapp_siswa || '',
        no_whatsapp_orang_tua: item.no_whatsapp_orang_tua || ''
      }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Peserta");
    const agendaName = selectedAgenda?.agenda_ujian?.replace(/\s+/g, '_') || 'Agenda';
    writeFile(wb, `Data_Peserta_${agendaName}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama: 'Nama Peserta',
        tanggal_lahir: '2008-05-17',
        asal_sekolah: 'Nama Sekolah',
        jenjang_studi: '1 SMA',
        kelas: 'X IPA 1',
        no_whatsapp_siswa: '08123456789',
        no_whatsapp_orang_tua: '08123456788'
      }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template_Peserta");
    // README sheet
    const readme = [
      ['Instruksi impor Peserta'],
      ['- Pilih Agenda di modal impor sebelum mengunggah file.'],
      ['- Kolom tanggal_lahir wajib, format YYYY-MM-DD.'],
      ['- Nomor WA akan dinormalisasi otomatis.'],
      ['- Nama kolom harus persis seperti pada sheet Template_Peserta.']
    ];
    const wsReadme = utils.aoa_to_sheet(readme);
    utils.book_append_sheet(wb, wsReadme, 'README');
    writeFile(wb, "Template_Peserta.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importAgendaId) {
      alert('Pilih Agenda Ujian terlebih dahulu sebelum import.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const selectedAgenda = agendas.find(agenda => agenda.id === importAgendaId);

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = read(arrayBuffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = utils.sheet_to_json(ws) as any[];

      let successCount = 0;
      for (const row of jsonData) {
        const nama = row['nama'] || row['Nama'] || '';
        const tanggal = row['tanggal_lahir'] || row['Tanggal_Lahir'] || '';
        if (!nama || !tanggal) {
          console.warn('Skipping row missing nama or tanggal_lahir', row);
          continue;
        }
        const noSiswaRaw = String(row['no_whatsapp_siswa'] || row['No_WA_Peserta'] || '');
        const noOrtuRaw = String(row['no_whatsapp_orang_tua'] || row['No_WA_Ortu'] || '');
        const payload: any = {
          agenda_id: importAgendaId,
          nama: nama,
          tanggal_lahir: String(tanggal).slice(0,10),
          asal_sekolah: row['asal_sekolah'] || row['Asal_Sekolah'] || null,
          jenjang_studi: row['jenjang_studi'] || row['Jenjang_Studi'] || null,
          kelas: row['kelas'] || row['Kelas'] || null,
          no_whatsapp_siswa: normalizePhoneNumber(noSiswaRaw) || null,
          no_whatsapp_orang_tua: normalizePhoneNumber(noOrtuRaw) || null
        };
        const { error } = await supabase.from('peserta').insert(payload);
        if (error) throw error;
        successCount++;
      }

      await fetchPeserta();
      setIsImportModalOpen(false);
      setImportAgendaId('');
      alert(`Berhasil mengimpor ${successCount} data.`);
    } catch (error) {
      console.error("Error importing: ", error);
      alert("Gagal mengimpor data. Pastikan format Excel benar.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns = [
    { header: 'Nama', accessor: 'nama' as keyof Peserta },
    { header: 'Tanggal Lahir', accessor: 'tanggal_lahir' as keyof Peserta },
    { header: 'Sekolah', accessor: 'asal_sekolah' as keyof Peserta },
    { header: 'Jenjang', accessor: 'jenjang_studi' as keyof Peserta },
    { header: 'WA Siswa', accessor: 'no_whatsapp_siswa' as keyof Peserta },
    { header: 'WA Ortu', accessor: 'no_whatsapp_orang_tua' as keyof Peserta }
  ];

  return (
    <Layout title="Data Peserta">
      <div className="space-y-4 mb-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-gray-600">Kelola data peserta ujian.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchPeserta}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <FileDown className="h-4 w-4" /> Export Excel
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Upload className="h-4 w-4" /> Import Excel
            </button>
            {/* Tambah Peserta hanya ditampilkan setelah user memilih Agenda di filter */}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-full md:w-56">
              <label className="text-xs text-gray-500">Agenda Ujian</label>
              <SearchableSelect
                options={agendas.map(a => ({ value: a.id, label: a.agenda_ujian })) as Option[]}
                value={filterAgenda || null}
                onChange={(v) => setFilterAgenda(String(v))}
                placeholder="Pilih Agenda"
              />
            </div>

            {/* Show search and school filter only after an agenda is selected */}
            {filterAgenda ? (
              <>
                <div className="relative w-full md:w-64">
                  <label className="text-xs text-gray-500">Cari</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau nomor WA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
                <div className="w-full md:w-48">
                  <label className="text-xs text-gray-500">Sekolah</label>
                  <SearchableSelect
                    options={[{ value: '', label: 'Semua Sekolah' }, ...(uniqueSchools as string[]).map(s => ({ value: s, label: s }))].map(x => x as Option)}
                    value={filterSekolah || null}
                    onChange={(v) => setFilterSekolah(String(v))}
                    placeholder="Semua Sekolah"
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Pilih Agenda untuk menampilkan pencarian dan filter sekolah.</div>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm border border-red-200"
              >
                <Trash2 className="h-4 w-4" /> Hapus Terpilih ({selectedIds.length})
              </button>
            )}
             <button
                onClick={handleDeleteAll}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200"
              >
                <Trash2 className="h-4 w-4" /> Hapus Semua
              </button>
          </div>
        </div>
      </div>

        {/* Tombol Tambah Peserta muncul di atas tabel setelah user memilih Agenda */}
        {filterAgenda ? (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                const initial = { ...(INITIAL_STATE as any) } as any;
                initial.agenda_id = filterAgenda;
                setFormData(initial);
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" /> Tambah Peserta
            </button>
          </div>
        ) : (
          <div className="mb-4 text-sm text-gray-600">Pilih Agenda untuk menampilkan tombol Tambah Peserta.</div>
        )}

        <Table
        data={filteredData}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        keyExtractor={(item) => item.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Peserta' : 'Tambah Peserta'}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">No. WA Siswa</label>
            <input
              required
              type="tel"
              value={(formData as any).no_whatsapp_siswa}
              onChange={e => handleNoWaChange(e.target.value)}
              maxLength={20}
              placeholder="08xxx / 628xxx / +628xxx"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500">Format bebas, akan dinormalisasi otomatis</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nama Peserta</label>
            <input
              required
              type="text"
              value={(formData as any).nama}
              onChange={e => setFormData({ ...(formData as any), nama: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tanggal Lahir</label>
            <input
              required
              type="date"
              value={(formData as any).tanggal_lahir}
              onChange={e => setFormData({ ...(formData as any), tanggal_lahir: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>



          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kelas</label>
            <input
              type="text"
              value={(formData as any).kelas}
              onChange={e => setFormData({ ...(formData as any), kelas: e.target.value })}
              placeholder="Contoh: X IPA 1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Asal Sekolah</label>
            <div className="relative">
              <input
                type="text"
                value={sekolahQuery || (formData as any).asal_sekolah || ''}
                onChange={e => { setSekolahQuery(e.target.value); setShowSekolahDropdown(true); setFormData({ ...(formData as any), asal_sekolah: e.target.value }); }}
                onFocus={() => {
                  if (!(formData as any).jenjang_studi) {
                    setShowSekolahDropdown(false);
                    setSekolahQuery('');
                    return;
                  }
                  setShowSekolahDropdown(true);
                }}
                placeholder={!(formData as any).jenjang_studi ? 'Pilih Jenjang Studi terlebih dahulu' : 'Ketik untuk mencari atau pilih dari daftar...'}
                disabled={!(formData as any).jenjang_studi}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
              {showSekolahDropdown && (
                <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredSchoolOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">Tidak ada sekolah untuk jenjang ini</li>
                  ) : (
                    filteredSchoolOptions.map(s => (
                      <li
                        key={s.id}
                        onClick={() => {
                          setFormData({ ...(formData as any), asal_sekolah: s.asal_sekolah });
                          setSekolahQuery('');
                          setShowSekolahDropdown(false);
                        }}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        <div className="font-medium text-gray-800">{s.asal_sekolah}</div>
                        <div className="text-xs text-gray-500">{s.jenjang_studi || ''}</div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {!((formData as any).jenjang_studi) && (
              <p className="text-xs text-orange-600 mt-1">Pilih Jenjang Studi terlebih dahulu untuk memilih sekolah.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Jenjang Studi</label>
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
              value={(formData as any).jenjang_studi || null}
              onChange={(v) => setFormData({ ...(formData as any), jenjang_studi: String(v) })}
              placeholder="Pilih Jenjang"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Agenda Ujian</label>
            <SearchableSelect
              options={[{ value: '', label: 'Pilih Agenda Ujian' }, ...agendas.map(a => ({ value: a.id, label: a.agenda_ujian }))] as Option[]}
              value={(formData as any).agenda_id || null}
              onChange={(v) => setFormData({ ...(formData as any), agenda_id: String(v) })}
              disabled={!!filterAgenda}
              placeholder="Pilih Agenda Ujian"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">No. WA Ortu</label>
            <input
              type="tel"
              value={(formData as any).no_whatsapp_orang_tua}
              onChange={e => setFormData({ ...(formData as any), no_whatsapp_orang_tua: e.target.value })}
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); setFormData(INITIAL_STATE as any); setEditingId(null); }}
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

      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportAgendaId('');
        }}
        title="Export Data Peserta"
      >
        <div className="space-y-6 p-2">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Pilih Agenda Ujian</h4>
            <p className="text-sm text-green-700 mb-3">
              Data peserta akan diexport berdasarkan agenda yang dipilih.
            </p>
            <SearchableSelect
              options={agendas.map(a => ({ value: a.id, label: a.agenda_ujian })) as Option[]}
              value={exportAgendaId || null}
              onChange={(v) => setExportAgendaId(String(v))}
              placeholder="Pilih Agenda Ujian"
            />
            {exportAgendaId && (
              <p className="text-xs text-green-600 mt-2">Agenda dipilih: {agendas.find(a => a.id === exportAgendaId)?.agenda_ujian}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => {
                setIsExportModalOpen(false);
                setExportAgendaId('');
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                handleExport();
                if (exportAgendaId) {
                  setIsExportModalOpen(false);
                  setExportAgendaId('');
                }
              }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Export
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Data Peserta"
      >
        <div className="space-y-6 p-2">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Langkah 1: Download Template</h4>
            <p className="text-sm text-blue-600 mb-3">
              Unduh template Excel berikut untuk memastikan format data sesuai dengan sistem.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-white text-blue-600 border border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" /> Download Template
            </button>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">ℹ️ Informasi Normalisasi WA</h4>
            <p className="text-sm text-yellow-700">
              Nomor WA akan dinormalisasi otomatis saat disimpan. Contoh konversi:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
              <li>08999990431 → <strong>8999990431</strong></li>
              <li>628999990431 → <strong>8999990431</strong></li>
              <li>+62899-9990-431 → <strong>8999990431</strong></li>
            </ul>
          </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Langkah 2: Pilih Agenda Ujian</h4>
            <p className="text-sm text-gray-600 mb-3">
              Tentukan agenda ujian untuk semua peserta yang akan diimpor.
            </p>
            <SearchableSelect
              options={agendas.map(a => ({ value: a.id, label: a.agenda_ujian })) as Option[]}
              value={importAgendaId || null}
              onChange={(v) => setImportAgendaId(String(v))}
              placeholder="Pilih Agenda Ujian"
            />
            {importAgendaId && (
              <p className="text-xs text-green-600 mt-2">Agenda dipilih: {agendas.find(a => a.id === importAgendaId)?.agenda_ujian}</p>
            )}
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Langkah 3: Upload File</h4>
            <p className="text-sm text-gray-600 mb-3">
              Pilih file Excel yang sudah diisi dengan data peserta.
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImport}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-red-50 file:text-red-700
                hover:file:bg-red-100"
            />
            {loading && <p className="text-sm text-red-600 mt-2 font-medium">Sedang memproses import data...</p>}
            {!importAgendaId && (
              <p className="text-xs text-orange-600 mt-2">Pilih agenda terlebih dahulu sebelum upload.</p>
            )}
          </div>
        </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
