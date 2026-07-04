import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { RichTextEditor } from '@/components/RichTextEditor';
import { supabase } from '@/supabaseClient';
import { uploadImageToCloudinary, deleteImage } from '@/cloudinary';
import { Trash2, AlertTriangle, Loader2, UploadCloud } from 'lucide-react';

interface BankSoal {
  id: string;
  mapel_id?: string | null;
  mata_pelajaran: string;
  type_soal: string;
  no_soal: number;
  pertanyaan: string;
  gambar_url?: string | null;
  gambar_file_id?: string | null;
  opsi_1?: string | null;
  opsi_2?: string | null;
  opsi_3?: string | null;
  opsi_4?: string | null;
  opsi_5?: string | null;
  kunci_jawaban?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface Mapel {
  id: string;
  mata_pelajaran: string;
  agenda_id?: string;
}

// Cloudinary helpers: extract public_id from a Cloudinary secure URL
const extractDriveFileId = (url: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    // path after /upload/ may contain version e.g. /upload/v162/.../public_id.ext
    const parts = u.pathname.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return '';
    const afterUpload = parts.slice(uploadIndex + 1).join('/');
    // remove possible version prefix like v162345
    const publicWithExt = afterUpload.replace(/^v\d+\//, '');
    // strip extension
    const lastDot = publicWithExt.lastIndexOf('.');
    const publicId = lastDot !== -1 ? publicWithExt.substring(0, lastDot) : publicWithExt;
    return publicId;
  } catch (e) {
    return '';
  }
};

const normalizeDriveUrl = (input: string) => {
  // For Cloudinary we keep the provided secure URL as-is
  return input?.trim() || '';
};

const INITIAL_STATE: any = {
  agenda_id: '',
  mata_pelajaran: '',
  mapel_id: '',
  type_soal: 'Pilihan Ganda Tunggal (PG)',
  no_soal: '',
  pertanyaan: '',
  gambar_url: '',
  pilihan_a: '',
  pilihan_b: '',
  pilihan_c: '',
  pilihan_d: '',
  pilihan_e: '',
  kunci_jawaban: '',
};

for (let i = 1; i <= 5; i++) {
  INITIAL_STATE[`pasangan_kiri_${i}`] = '';
  INITIAL_STATE[`pasangan_kanan_${i}`] = '';
  INITIAL_STATE[`pernyataan_${i}`] = '';
}

export function BankSoalPage() {
  const [data, setData] = useState<BankSoal[]>([]);
  const [filteredData, setFilteredData] = useState<BankSoal[]>([]);
  const [allMapels, setAllMapels] = useState<Mapel[]>([]);
  
  const [isFormPageOpen, setIsFormPageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  const [manageMapelId, setManageMapelId] = useState('');
  const [manageMapelName, setManageMapelName] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');

  const location = useLocation();
  const [prefilledFromQuery, setPrefilledFromQuery] = useState<{ agenda?: boolean; mapel?: boolean }>({});

  const fetchBankSoal = async () => {
    const { data: rows, error } = await supabase.from('bank_soal').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({
      id: String(r.id),
      ...r,
      mapel_id: r.mapel_id ? String(r.mapel_id) : null,
      no_soal: Number(r.no_soal) || 0,
      gambar_url: r.gambar_url || null,
      gambar_file_id: r.gambar_file_id || null,
      opsi_1: r.opsi_1 || null,
      opsi_2: r.opsi_2 || null,
      opsi_3: r.opsi_3 || null,
      opsi_4: r.opsi_4 || null,
      opsi_5: r.opsi_5 || null,
      kunci_jawaban: r.kunci_jawaban || null,
    } as BankSoal));
    setData(items);
  };

  const handleRemoveImage = async () => {
    const fileId = formData.gambar_file_id || '';
    if (!fileId && !formData.gambar_url) {
      // nothing to remove
      setFormData((prev: any) => ({ ...prev, gambar_url: '', gambar_file_id: '' }));
      setSelectedImageFile(null);
      setLocalPreviewUrl('');
      return;
    }
    if (!confirm('Hapus gambar yang terkait dengan soal ini?')) return;
    try {
      if (fileId) await deleteImage(fileId);
    } catch (e) {
      console.warn('Failed to delete image', e);
    }
    setFormData((prev: any) => ({ ...prev, gambar_url: '', gambar_file_id: '' }));
    setSelectedImageFile(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl('');
    }
  };

  const fetchMapels = async () => {
    const { data: rows, error } = await supabase.from('mata_pelajaran').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), mata_pelajaran: r.mata_pelajaran, agenda_id: r.agenda_id } as Mapel));
    setAllMapels(items);
  };

  useEffect(() => {
    fetchBankSoal();
    fetchMapels();
  }, []);

  // Read optional query params to prefill agenda/mapel when opening from context
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qMapelId = params.get('mapel_id');
    const qMapelName = params.get('mata_pelajaran');
    if (qMapelId) {
      setFormData((prev: any) => ({ ...prev, mapel_id: qMapelId }));
      setManageMapelId(qMapelId);
      setManageMapelName(qMapelName || '');
      setPrefilledFromQuery(prev => ({ ...prev, mapel: true }));
    } else if (qMapelName) {
      setFormData((prev: any) => ({ ...prev, mata_pelajaran: qMapelName }));
      setManageMapelName(qMapelName);
      setPrefilledFromQuery(prev => ({ ...prev, mapel: true }));
    }
  }, [location.search]);

  useEffect(() => {
    if (manageMapelId && !manageMapelName && allMapels.length > 0) {
      const found = allMapels.find(m => m.id === manageMapelId);
      if (found) setManageMapelName(found.mata_pelajaran);
    }
  }, [manageMapelId, manageMapelName, allMapels]);

  // If mata_pelajaran provided but mapel_id not set, try resolve the id from loaded mapels
  useEffect(() => {
    if (prefilledFromQuery.mapel && formData.mata_pelajaran && !formData.mapel_id) {
      const found = allMapels.find(m => m.mata_pelajaran === formData.mata_pelajaran);
      if (found) setFormData((prev: any) => ({ ...prev, mapel_id: found.id }));
    }
  }, [prefilledFromQuery.mapel, formData.mata_pelajaran, allMapels]);

  // Helper: compute next available no_soal for given mapel or agenda+mapel
  const computeNextNoSoal = (mapelId?: string, mapelName?: string) => {
    try {
      let rows = data || [];
      if (mapelId) {
        rows = rows.filter(r => String(r.mapel_id) === String(mapelId));
      } else if (mapelName) {
        rows = rows.filter(r => String(r.mata_pelajaran) === String(mapelName));
      } else {
        return '1';
      }
      const max = rows.reduce((acc, cur) => {
        const n = Number(cur.no_soal) || 0;
        return n > acc ? n : acc;
      }, 0);
      return String(max + 1);
    } catch (e) {
      return '1';
    }
  };

  // Auto-fill next `no_soal` for new questions based on the selected subject.
  useEffect(() => {
    if (editingId) return;
    const hasSubject = Boolean(formData.mapel_id || formData.mata_pelajaran);
    if (!hasSubject) return;

    const next = computeNextNoSoal(formData.mapel_id || '', formData.mata_pelajaran || '');
    setFormData((prev: any) => {
      if (String(prev.no_soal) === String(next)) return prev;
      return { ...prev, no_soal: next };
    });
  }, [editingId, formData.mapel_id, formData.mata_pelajaran, data]);

  useEffect(() => {
    const sorted = [...data].sort((a, b) => Number(a.no_soal) - Number(b.no_soal));

    const normalizedMapelId = (manageMapelId || '').trim();
    const normalizedMapelName = (manageMapelName || '').trim().toLowerCase();

    const filtered = !normalizedMapelId && !normalizedMapelName
      ? sorted
      : sorted.filter(item => {
          const itemMapelId = item.mapel_id ? String(item.mapel_id) : '';
          const itemMapelName = String(item.mata_pelajaran || '').trim().toLowerCase();
          const matchesId = !normalizedMapelId || itemMapelId === normalizedMapelId;
          const matchesName = !normalizedMapelName || itemMapelName === normalizedMapelName;
          return matchesId && matchesName;
        });

    setFilteredData(filtered);
    setSelectedIds([]);
  }, [data, manageMapelId, manageMapelName]);

  const uploadToDrive = async (file: File) => {
    setUploadError('');
    setUploadingImage(true);
    try {
      const result = await uploadImageToCloudinary(file, `bank_soal`);
      if (!result) throw new Error('Upload gagal');
      setFormData((prev: any) => ({ ...prev, gambar_url: result.secure_url, gambar_file_id: result.public_id }));
      return { thumbnailUrl: result.secure_url, fileId: result.public_id };
    } catch (error: any) {
      setUploadError(error.message || 'Gagal upload gambar.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle paste events on the question textarea to accept image paste

  const handleSelectImage = (file: File) => {
    setSelectedImageFile(file);
    setUploadError('');
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let uploadedUrl = formData.gambar_url;
      let uploadedFileId = formData.gambar_file_id || '';

      // preserve old file id so we can delete it after successful update if replaced
      const oldFileId = formData.gambar_file_id || null;
      if (selectedImageFile && !uploadedUrl) {
        const uploaded = await uploadToDrive(selectedImageFile);
        if (uploaded) {
          uploadedUrl = uploaded.thumbnailUrl;
          uploadedFileId = uploaded.fileId;
        }
      }

      const normalizedImageUrl = normalizeDriveUrl(uploadedUrl);
      // map frontend type label to DB canonical value
      const TYPE_MAP: Record<string, string> = {
        'Pilihan Ganda Tunggal (PG)': 'pilihan_ganda',
        'Pilihan Ganda Kompleks (PK)': 'pilihan_kompleks',
        'Pilihan Benar/Salah (BS)': 'pilihan_benar/salah',
        'Pilihan Setuju/Tidak (ST)': 'pilihan_setuju/tidak',
        'Menjodohkan (MJ)': 'menjodohkan',
        'Uraian (UR)': 'esai'
      };

      const dbType = TYPE_MAP[formData.type_soal] || String(formData.type_soal).toLowerCase();

      // build sanitized payload matching DB schema
      const payload: any = {
        mapel_id: formData.mapel_id || null,
        mata_pelajaran: formData.mata_pelajaran || '',
        type_soal: dbType,
        no_soal: formData.no_soal ? Number(formData.no_soal) : null,
        pertanyaan: formData.pertanyaan || '',
        gambar_url: normalizedImageUrl || null,
        gambar_file_id: uploadedFileId || null,
        opsi_1: formData.pilihan_a || null,
        opsi_2: formData.pilihan_b || null,
        opsi_3: formData.pilihan_c || null,
        opsi_4: formData.pilihan_d || null,
        opsi_5: formData.pilihan_e || null,
        kunci_jawaban: formData.kunci_jawaban || null,
      };

      // For Benar/Salah or Setuju/Tidak: map pernyataan_i -> opsi_i
      if (dbType === 'pilihan_benar/salah' || dbType === 'pilihan_setuju/tidak') {
        for (let i = 1; i <= 5; i++) {
          payload[`opsi_${i}`] = formData[`pernyataan_${i}`] || null;
        }
      }

      // For Menjodohkan: map pasangan_kiri_i + pasangan_kanan_i -> opsi_i as 'left||right'
      if (dbType === 'menjodohkan') {
        for (let i = 1; i <= 5; i++) {
          const left = formData[`pasangan_kiri_${i}`] || '';
          const right = formData[`pasangan_kanan_${i}`] || '';
          if (left || right) payload[`opsi_${i}`] = `${left}||${right}`; else payload[`opsi_${i}`] = null;
        }
      }

      if (uploadedUrl && !normalizedImageUrl) {
        alert('Gambar URL tidak valid. Gunakan URL Cloudinary yang dihasilkan oleh proses upload.');
        setLoading(false);
        return;
      }

      if (editingId) {
        const { error } = await supabase.from('bank_soal').update(payload).eq('id', editingId);
        if (error) throw error;
        // if replaced image, delete old file from Cloudinary
        if (oldFileId && payload.gambar_file_id && oldFileId !== payload.gambar_file_id) {
          try { await deleteImage(oldFileId); } catch (e) { console.warn('Failed to delete old image', e); }
        }
        // if user removed image (no payload.gambar_url) delete old
        if (oldFileId && !payload.gambar_url && !payload.gambar_file_id) {
          try { await deleteImage(oldFileId); } catch (e) { console.warn('Failed to delete old image', e); }
        }
      } else {
        const { error } = await supabase.from('bank_soal').insert(payload);
        if (error) throw error;
      }
      // close modal and clear any filter-prefill flag
      setIsFormPageOpen(false);
      setFormData(INITIAL_STATE);
      setEditingId(null);
      setSelectedImageFile(null);
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl('');
      }
      fetchBankSoal();
    } catch (error: any) {
      console.error("Error saving document: ", error);
      const msg = error?.message || error?.error || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Terjadi kesalahan saat menyimpan data: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: BankSoal) => {
    const newState: any = { ...INITIAL_STATE, ...item };
    // map DB opsi_* to frontend pilihan_* for editing
    newState.pilihan_a = item.opsi_1 ?? item.pilihan_a ?? '';
    newState.pilihan_b = item.opsi_2 ?? item.pilihan_b ?? '';
    newState.pilihan_c = item.opsi_3 ?? item.pilihan_c ?? '';
    newState.pilihan_d = item.opsi_4 ?? item.pilihan_d ?? '';
    newState.pilihan_e = item.opsi_5 ?? item.pilihan_e ?? '';
    // map DB canonical type back to UI label so correct fields render
    const DB_TO_LABEL: Record<string, string> = {
      'pilihan_ganda': 'Pilihan Ganda Tunggal (PG)',
      'pilihan_kompleks': 'Pilihan Ganda Kompleks (PK)',
      'pilihan_benar/salah': 'Pilihan Benar/Salah (BS)',
      'pilihan_setuju/tidak': 'Pilihan Setuju/Tidak (ST)',
      'menjodohkan': 'Menjodohkan (MJ)',
      'esai': 'Uraian (UR)'
    };
    const t = String(item.type_soal || '').toLowerCase();
    newState.type_soal = DB_TO_LABEL[t] || item.type_soal || newState.type_soal;
    newState.no_soal = String(item.no_soal ?? newState.no_soal ?? '');
    if (t === 'pilihan_benar/salah' || t === 'pilihan_setuju/tidak' || t.includes('benar') || t.includes('setuju')) {
      for (let i = 1; i <= 5; i++) newState[`pernyataan_${i}`] = item[`opsi_${i}`] || '';
    }
    // map opsi_* back to pasangan_kiri_/pasangan_kanan_ for MJ (split on '||')
    if (t === 'menjodohkan' || t.includes('menjodohkan') || t.includes('mj')) {
      for (let i = 1; i <= 5; i++) {
        const val = item[`opsi_${i}`] || '';
        if (typeof val === 'string' && val.includes('||')) {
          const parts = val.split('||');
          newState[`pasangan_kiri_${i}`] = parts[0] || '';
          newState[`pasangan_kanan_${i}`] = parts[1] || '';
        } else {
          newState[`pasangan_kiri_${i}`] = '';
          newState[`pasangan_kanan_${i}`] = '';
        }
      }
    }
    if (!newState.gambar_file_id && newState.gambar_url) {
      newState.gambar_file_id = extractDriveFileId(newState.gambar_url);
    }
    setFormData(newState);
    setEditingId(item.id);
    setIsFormPageOpen(true);
  };

  const handleDelete = async (item: BankSoal) => {
    if (confirm(`Apakah Anda yakin ingin menghapus soal no ${item.no_soal}?`)) {
      try {
        const { error } = await supabase.from('bank_soal').delete().eq('id', item.id);
        if (error) throw error;
        const fileId = item.gambar_file_id || '';
        if (fileId) {
          try { await deleteImage(fileId); } catch (e) { console.warn('Failed to delete image', e); }
        }
        fetchBankSoal();
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Gagal menghapus data");
      }
    }
  };

  // Handle selection
  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    try {
        const { error } = await supabase.from('bank_soal').delete().in('id', selectedIds);
        if (error) throw error;
      setSelectedIds([]);
      setShowDeleteModal(false);
      fetchBankSoal();
    } catch (error) {
      console.error("Error deleting: ", error);
      alert("Gagal menghapus data");
    }
    setDeleting(false);
  };

  // Delete all filtered
  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
        const ids = filteredData.map(i => i.id);
        if (ids.length) {
          const { error } = await supabase.from('bank_soal').delete().in('id', ids);
          if (error) throw error;
        }
      setShowDeleteModal(false);
      fetchBankSoal();
    } catch (error) {
      console.error("Error deleting all: ", error);
      alert("Gagal menghapus semua data");
    }
    setDeleting(false);
  };

  const getKeyHint = (type: string) => {
    switch (type) {
      case 'Pilihan Ganda Tunggal (PG)': return 'Contoh: A';
      case 'Pilihan Ganda Kompleks (PK)': return 'Contoh: ACD (Jika jawaban benar A, C, dan D)';
      case 'Pilihan Benar/Salah (BS)': return 'Contoh: BBSSB (B=Benar, S=Salah)';
      case 'Pilihan Setuju/Tidak (ST)': return 'Contoh: SSTTS (S=Setuju, T=Tidak)';
      case 'Menjodohkan (MJ)': return 'Contoh: 1E2D3C4B5A';
      case 'Uraian (UR)': return 'Tuliskan jawaban singkat';
      default: return '';
    }
  };

  const getTypeShort = (type: string) => {
    const typeMap: {[key:string]: string} = {
      'Pilihan Ganda Tunggal (PG)': 'PG',
      'Pilihan Ganda Kompleks (PK)': 'PK',
      'Pilihan Benar/Salah (BS)': 'BS',
      'Pilihan Setuju/Tidak (ST)': 'ST',
      'Menjodohkan (MJ)': 'MJ',
      'Uraian (UR)': 'UR'
    };
    return typeMap[type] || type;
  };

  const handleOpenCreateForm = () => {
    const nextNoSoal = computeNextNoSoal(manageMapelId || '', manageMapelName || '');
    setFormData({
      ...INITIAL_STATE,
      mapel_id: manageMapelId || '',
      mata_pelajaran: manageMapelName || '',
      no_soal: nextNoSoal,
    });
    setEditingId(null);
    setSelectedImageFile(null);
    setLocalPreviewUrl('');
    setIsFormPageOpen(true);
  };

  return (
    <Layout title="Kelola Soal">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-gray-600">
            {manageMapelName ? `Menampilkan soal untuk ${manageMapelName}.` : 'Kelola soal ujian.'}
          </p>
          {manageMapelName && (
            <p className="text-sm text-gray-500">Jumlah soal yang tampil: {filteredData.length}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenCreateForm}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Tambah Nomor Soal
        </button>
      </div>

      {isFormPageOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{editingId ? 'Edit Soal' : 'Tambah Soal'}</h2>
              <p className="text-sm text-gray-500">Tambahkan atau ubah soal dengan format WYSIWYG.</p>
            </div>
            <button
              type="button"
              onClick={() => { setIsFormPageOpen(false); setFormData(INITIAL_STATE); setEditingId(null); }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Tutup Form
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3">

            <p className="font-mono mt-1 text-[11px]">Tip: gunakan gambar berukuran wajar; sistem akan mengompres otomatis ke target 500KB.</p>
          </div>

          {/* Section 1: Agenda & Mapel */}
          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-3 rounded-lg border">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
              <SearchableSelect
                options={[{ value: '', label: 'Pilih Mapel' }, ...allMapels.map(m => ({ value: m.id, label: m.mata_pelajaran }))] as Option[]}
                value={formData.mapel_id || null}
                onChange={(v) => {
                  const selected = allMapels.find(m => m.id === String(v));
                  setFormData({ 
                    ...formData, 
                    mapel_id: String(v),
                    mata_pelajaran: selected ? selected.mata_pelajaran : ''
                  });
                }}
                placeholder="Pilih Mapel"
              />
            </div>
          </div>

          {/* Section 2: Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type Soal</label>
              <SearchableSelect
                options={[
                  { value: 'Pilihan Ganda Tunggal (PG)', label: 'Pilihan Ganda Tunggal (PG)' },
                  { value: 'Pilihan Ganda Kompleks (PK)', label: 'Pilihan Ganda Kompleks (PK)' },
                  { value: 'Pilihan Benar/Salah (BS)', label: 'Pilihan Benar/Salah (BS)' },
                  { value: 'Pilihan Setuju/Tidak (ST)', label: 'Pilihan Setuju/Tidak (ST)' },
                  { value: 'Menjodohkan (MJ)', label: 'Menjodohkan (MJ)' },
                  { value: 'Uraian (UR)', label: 'Uraian (UR)' }
                ] as Option[]}
                value={formData.type_soal || null}
                onChange={(v) => setFormData({ ...formData, type_soal: String(v) })}
                placeholder="Pilih Type Soal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">No. Soal</label>
              <input
                required
                type="number"
                readOnly={!editingId && Boolean(formData.mapel_id || formData.mata_pelajaran)}
                value={formData.no_soal}
                onChange={e => setFormData({ ...formData, no_soal: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
              {!editingId && (formData.mapel_id || formData.mata_pelajaran) && (
                <p className="text-xs text-gray-500">Nomor soal diisi otomatis sesuai mata pelajaran.</p>
              )}
            </div>
          </div>
         
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Pertanyaan</label>
            <RichTextEditor
              value={formData.pertanyaan}
              onChange={(value) => setFormData({ ...formData, pertanyaan: value })}
              placeholder="Tulis pertanyaan di sini... (Anda dapat menambahkan format, gambar, dan rumus matematika)"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Upload Gambar (Cloudinary)</label>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg p-3 space-y-1">
              <p className="font-semibold">Upload langsung:</p>
              <p className="font-mono text-[11px]">Hasil upload akan menyimpan Database.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectImage(file);
                  }}
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                  <UploadCloud className="h-4 w-4" />
                  <span className="text-sm">Pilih Gambar</span>
                </div>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.gambar_url}
                  onChange={e => {
                    const normalized = normalizeDriveUrl(e.target.value);
                    setFormData({ ...formData, gambar_url: normalized || e.target.value, gambar_file_id: extractDriveFileId(normalized || e.target.value) });
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 math-text math-input question-content"
                  placeholder="URL thumbnail otomatis"
                />
              </div>
            </div>

            {uploadingImage && (
              <div className="text-sm text-blue-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Mengupload gambar...
              </div>
            )}
            {(localPreviewUrl || formData.gambar_url) && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">Preview Gambar:</p>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img src={localPreviewUrl || formData.gambar_url} alt="Preview" className="w-full max-h-56 object-contain" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    Hapus Gambar
                  </button>
                </div>
              </div>
            )}
            {uploadError && (
              <div className="text-sm text-red-600">
                {uploadError}
              </div>
            )}

            <p className="text-xs text-gray-500">

            </p>
          </div>

          {/* Pilihan Ganda & Kompleks */}
          {(formData.type_soal === 'Pilihan Ganda Tunggal (PG)' || formData.type_soal === 'Pilihan Ganda Kompleks (PK)') && (
            <div className="grid grid-cols-1 gap-3 border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700">Pilihan Jawaban</h4>
              {['A', 'B', 'C', 'D', 'E'].map(opt => (
                <div key={opt} className="flex items-start gap-2">
                  <span className="font-bold w-4 mt-2">{opt}</span>
                  <div className="w-full">
                    <RichTextEditor
                      value={formData[`pilihan_${opt.toLowerCase()}`]}
                      onChange={(value) => setFormData({ ...formData, [`pilihan_${opt.toLowerCase()}`]: value })}
                      placeholder={`Pilihan ${opt}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Benar/Salah & Setuju/Tidak */}
          {(formData.type_soal === 'Pilihan Benar/Salah (BS)' || formData.type_soal === 'Pilihan Setuju/Tidak (ST)') && (
            <div className="grid grid-cols-1 gap-3 border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700">Pernyataan</h4>
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="flex items-start gap-2">
                  <span className="text-sm font-bold w-6 mt-2">{num}.</span>
                  <div className="w-full">
                    <RichTextEditor
                      value={formData[`pernyataan_${num}`]}
                      onChange={(value) => setFormData({ ...formData, [`pernyataan_${num}`]: value })}
                      placeholder={`Pernyataan ${num}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Menjodohkan */}
          {formData.type_soal === 'Menjodohkan (MJ)' && (
            <div className="grid grid-cols-1 gap-3 border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700">Pasangan Jawaban</h4>
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="grid grid-cols-2 gap-2">
                  <div className="flex gap-1 items-start">
                    <span className="text-xs font-bold mt-2">{num}.</span>
                    <div className="w-full">
                      <RichTextEditor
                        value={formData[`pasangan_kiri_${num}`]}
                        onChange={(value) => setFormData({ ...formData, [`pasangan_kiri_${num}`]: value })}
                        placeholder={`Kiri ${num}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 items-start">
                    <span className="text-xs font-bold mt-2">{String.fromCharCode(64 + num)}.</span>
                    <div className="w-full">
                      <RichTextEditor
                        value={formData[`pasangan_kanan_${num}`]}
                        onChange={(value) => setFormData({ ...formData, [`pasangan_kanan_${num}`]: value })}
                        placeholder={`Kanan ${num}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <label className="text-sm font-medium text-gray-700">Kunci Jawaban</label>
            <RichTextEditor
              value={formData.kunci_jawaban}
              onChange={(value) => setFormData({ ...formData, kunci_jawaban: value })}
              placeholder="Tulis kunci jawaban atau pembahasan di sini..."
            />
            <p className="text-xs text-gray-500 italic">{getKeyHint(formData.type_soal)}</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => { setIsFormPageOpen(false); setFormData(INITIAL_STATE); setEditingId(null); }}
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
      </div>
    )}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          Menampilkan {filteredData.length} dari {data.length} soal
          {selectedIds.length > 0 && (
            <span className="ml-2 text-red-600 font-medium">
              ({selectedIds.length} dipilih)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                setDeleteType('selected');
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" /> Hapus Terpilih ({selectedIds.length})
            </button>
          )}
          {filteredData.length > 0 && (
            <button
              onClick={() => {
                setDeleteType('all');
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-600">
          Tidak ada data soal. Tambahkan soal baru.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Mapel</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Pertanyaan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kunci</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.mata_pelajaran}</td>
                  <td className="px-4 py-3 text-gray-700">{item.no_soal}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {getTypeShort(item.type_soal)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.pertanyaan?.substring(0, 50)}{item.pertanyaan?.length > 50 ? '...' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-sm">{item.kunci_jawaban}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data soal. Gunakan filter atau tambah soal baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Konfirmasi Hapus</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="mb-6">
              {deleteType === 'selected' && (
                <p className="text-gray-700">
                  Apakah Anda yakin ingin menghapus <strong>{selectedIds.length}</strong> soal yang dipilih?
                </p>
              )}
              {deleteType === 'all' && (
                <div>
                  <p className="text-gray-700 mb-3">
                    Apakah Anda yakin ingin menghapus <strong className="text-red-600">SEMUA {filteredData.length}</strong> soal yang ditampilkan?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ⚠️ Semua soal yang sesuai filter akan dihapus permanen!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (deleteType === 'selected') {
                    handleDeleteSelected();
                  } else {
                    handleDeleteAll();
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
