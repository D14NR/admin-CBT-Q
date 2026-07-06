import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { RichTextEditor } from '@/components/RichTextEditor';
import { supabase } from '@/supabaseClient';
import { Trash2, AlertTriangle } from 'lucide-react';

interface BankSoal {
  id: string;
  mapel_id?: string | null;
  mata_pelajaran: string;
  type_soal: string;
  no_soal: number;
  pertanyaan: string;
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

// No image upload storage in this schema; images are not stored on Cloudinary.

const INITIAL_STATE: any = {
  agenda_id: '',
  mata_pelajaran: '',
  mapel_id: '',
  type_soal: 'Pilihan Ganda Tunggal (PG)',
  no_soal: '',
  pertanyaan: '',
  pilihan_a: '',
  pilihan_b: '',
  pilihan_c: '',
  pilihan_d: '',
  pilihan_e: '',
  scor_opsi_1: '',
  scor_opsi_2: '',
  scor_opsi_3: '',
  scor_opsi_4: '',
  scor_opsi_5: '',
  scor_opsi_esai: '',
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  const [manageMapelId, setManageMapelId] = useState('');
  const [manageMapelName, setManageMapelName] = useState('');
  const [optionCount, setOptionCount] = useState<number>(5);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');
  const [deleting, setDeleting] = useState(false);

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
      opsi_1: r.opsi_1 || null,
      opsi_2: r.opsi_2 || null,
      opsi_3: r.opsi_3 || null,
      opsi_4: r.opsi_4 || null,
      opsi_5: r.opsi_5 || null,
      kunci_jawaban: r.kunci_jawaban || null,
    } as BankSoal));
    setData(items);
  };

  // image removal is not applicable under the current schema

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // map frontend type label to DB canonical value
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
        opsi_1: formData.pilihan_a || null,
        opsi_2: formData.pilihan_b || null,
        opsi_3: formData.pilihan_c || null,
        opsi_4: formData.pilihan_d || null,
        opsi_5: formData.pilihan_e || null,
        kunci_jawaban: normalizeKunciJawaban(formData.kunci_jawaban || '', formData.type_soal) || null,
        scor_opsi_1: formData.scor_opsi_1 !== '' ? Number(formData.scor_opsi_1) : null,
        scor_opsi_2: formData.scor_opsi_2 !== '' ? Number(formData.scor_opsi_2) : null,
        scor_opsi_3: formData.scor_opsi_3 !== '' ? Number(formData.scor_opsi_3) : null,
        scor_opsi_4: formData.scor_opsi_4 !== '' ? Number(formData.scor_opsi_4) : null,
        scor_opsi_5: formData.scor_opsi_5 !== '' ? Number(formData.scor_opsi_5) : null,
        scor_opsi_esai: formData.scor_opsi_esai !== '' ? Number(formData.scor_opsi_esai) : null,
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

      if (editingId) {
        const { error } = await supabase.from('bank_soal').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bank_soal').insert(payload);
        if (error) throw error;
      }
      // close modal and clear any filter-prefill flag
      setIsFormPageOpen(false);
      setFormData(INITIAL_STATE);
      setEditingId(null);
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
    // image fields removed from schema; nothing to map here
    newState.scor_opsi_1 = item.scor_opsi_1 ?? '';
    newState.scor_opsi_2 = item.scor_opsi_2 ?? '';
    newState.scor_opsi_3 = item.scor_opsi_3 ?? '';
    newState.scor_opsi_4 = item.scor_opsi_4 ?? '';
    newState.scor_opsi_5 = item.scor_opsi_5 ?? '';
    newState.scor_opsi_esai = item.scor_opsi_esai ?? '';
    // normalize kunci_jawaban (strip possible HTML stored previously) into plain letters/comma
    newState.kunci_jawaban = normalizeKunciJawaban(item.kunci_jawaban ?? newState.kunci_jawaban ?? '', newState.type_soal);
    // determine option count from existing opsi_* values (min 2, max 5)
    const present = [1,2,3,4,5].reduce((acc, i) => acc + (item[`opsi_${i}`] ? 1 : 0), 0);
    setOptionCount(Math.max(2, Math.min(5, present || 5)));
    setFormData(newState);
    setEditingId(item.id);
    setIsFormPageOpen(true);
  };

  const handleDelete = async (item: BankSoal) => {
    if (confirm(`Apakah Anda yakin ingin menghapus soal no ${item.no_soal}?`)) {
      try {
        const { error } = await supabase.from('bank_soal').delete().eq('id', item.id);
        if (error) throw error;
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

  const renderPreviewOptions = (item: BankSoal) => {
    const normalizedType = String(item.type_soal || '').toLowerCase();
    if (normalizedType.includes('menjodohkan')) {
      const pairs = [1, 2, 3, 4, 5]
        .map((i) => {
          const raw = item[`opsi_${i}`] || '';
          const [left, right] = String(raw).split('||');
          return { left: left || '', right: right || '' };
        })
        .filter(pair => pair.left || pair.right);
      if (pairs.length === 0) {
        return <div className="text-sm text-gray-500">Tidak ada pasangan jawaban untuk ditampilkan.</div>;
      }
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Pernyataan Kiri</div>
            <div className="space-y-3">
              {pairs.map((pair, index) => (
                <div key={`mj-left-${index}`} className="flex gap-3 items-start">
                  <span className="mt-1 font-semibold text-gray-900">{index + 1}.</span>
                  <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: pair.left || '&nbsp;' }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Jawaban Pernyataan Kanan</div>
            <div className="space-y-3">
              {pairs.map((pair, index) => (
                <div key={`mj-right-${index}`} className="flex gap-3 items-start">
                  <span className="mt-1 font-semibold text-gray-900">{String.fromCharCode(65 + index)}.</span>
                  <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: pair.right || '&nbsp;' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (normalizedType.includes('pilihan_benar/salah') || normalizedType.includes('pilihan_setuju/tidak') || normalizedType.includes('benar') || normalizedType.includes('setuju')) {
      const answers = [1, 2, 3, 4, 5]
        .map((i) => ({
          index: i,
          text: item[`opsi_${i}`] || ''
        }))
        .filter(answer => String(answer.text).trim() !== '');
      if (answers.length === 0) {
        return <div className="text-sm text-gray-500">Tidak ada pernyataan untuk ditampilkan.</div>;
      }

      const trueLabel = normalizedType.includes('setuju') ? 'Setuju' : 'Benar';
      const falseLabel = normalizedType.includes('setuju') ? 'Tidak' : 'Salah';
      const trueValue = normalizedType.includes('setuju') ? 'S' : 'B';
      const falseValue = normalizedType.includes('setuju') ? 'T' : 'S';
      const selectedAnswers = String(item.kunci_jawaban || '')
        .toUpperCase()
        .split(/[\s,]+/)
        .filter(Boolean);

      return (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">Pilihan Pernyataan</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] table-fixed border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                  <th className="w-12 px-3 py-2">No.</th>
                  <th className="px-3 py-2">Pernyataan</th>
                  <th className="w-24 px-3 py-2">{trueLabel}</th>
                  <th className="w-24 px-3 py-2">{falseLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {answers.map((answer) => (
                  <tr key={`bs-${answer.index}`}>
                    <td className="px-3 py-3 font-semibold text-gray-900 align-top">{answer.index}.</td>
                    <td className="px-3 py-3 align-top">
                      <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: answer.text }} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center justify-center">
                        <input type="checkbox" disabled className="h-4 w-4 rounded-sm border-gray-300 text-gray-700 bg-white" />
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center justify-center">
                        <input type="checkbox" disabled className="h-4 w-4 rounded-sm border-gray-300 text-gray-700 bg-white" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (normalizedType.includes('pilihan_ganda') || normalizedType.includes('pilihan ganda') || normalizedType.includes('kompleks')) {
      const options = [1, 2, 3, 4, 5]
        .map((i) => ({
          letter: String.fromCharCode(64 + i),
          text: item[`opsi_${i}`] || ''
        }))
        .filter(option => String(option.text).trim() !== '');
      if (options.length === 0) {
        return <div className="text-sm text-gray-500">Tidak ada opsi untuk ditampilkan.</div>;
      }
      return (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">Pilihan Jawaban</div>
          <div className="grid gap-3">
            {options.map(option => (
              <div key={`pg-${option.letter}`} className="flex gap-3 items-start">
                <span className="mt-1 font-semibold text-gray-900">{option.letter}.</span>
                <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: option.text }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (normalizedType.includes('esai') || normalizedType.includes('uraian')) {
      return (
        <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-600">
          <p className="font-semibold mb-2">Jawaban:</p>
          <div className="h-28 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">&nbsp;</div>
        </div>
      );
    }

    return null;
  };

  const renderPrintContent = () => (
    <div className="print-area hidden">
      <div className="print-only">
        <div className="mx-auto w-full max-w-6xl bg-white px-6 py-8">
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6">
            <div className="text-xs uppercase tracking-[0.32em] text-gray-500">CBT-Q • Computer Based Test</div>
            <div className="mt-3 text-2xl font-semibold text-gray-900">Preview Soal</div>
            <div className="mt-1 text-sm text-gray-600">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} • {filteredData.length} soal</div>
          </div>
          <div className="space-y-10">
            {filteredData.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                Tidak ada soal untuk ditampilkan.
              </div>
            ) : (
              filteredData.map((item, index) => (
                <div key={`print-${item.id}`} className="print-break">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-red-600">Soal {index + 1}</div>
                        <div className="text-base font-semibold text-gray-900">{item.mata_pelajaran || '-'} • {getTypeShort(item.type_soal)} • No. {item.no_soal}</div>
                      </div>
                      {showAnswerKey && item.kunci_jawaban && (
                        <div className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm text-gray-600">Kunci: {item.kunci_jawaban}</div>
                      )}
                    </div>
                    <div className="mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Pertanyaan</div>
                      <div className="prose prose-sm text-gray-800" dangerouslySetInnerHTML={{ __html: item.pertanyaan || '<p>-</p>' }} />
                    </div>
                    <div className="space-y-4">
                      {renderPreviewOptions(item)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const normalizeKunciJawaban = (raw: any, type?: string) => {
    if (!raw) return '';
    try {
      let value = String(raw);
      value = value.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
      value = value.replace(/<[^>]*>/g, '').trim();
      if (!value) return '';

      const normalizedType = String(type || '').toLowerCase();
      const isBsSt = normalizedType.includes('benar') || normalizedType.includes('salah') || normalizedType.includes('setuju') || normalizedType.includes('tidak');
      const isPgPk = normalizedType.includes('ganda');
      const isMj = normalizedType.includes('menjodohkan');
      const isUr = normalizedType.includes('esai') || normalizedType.includes('uraian');

      if (isUr) {
        return value;
      }

      if (isMj) {
        return value.replace(/\s+/g, '').toUpperCase();
      }

      if (isBsSt) {
        const letters = value.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
        return letters.join(',');
      }

      if (isPgPk) {
        const cleaned = value.replace(/[^A-Za-z,\s]/g, '').toUpperCase();
        const parts = cleaned.split(/[ ,]+/).map(p => p.trim()).filter(Boolean);
        return parts.join(',');
      }

      const cleaned = value.replace(/[^A-Za-z0-9,\s]/g, '').toUpperCase();
      const parts = cleaned.split(/[ ,]+/).map(p => p.trim()).filter(Boolean);
      return parts.join(',');
    } catch (e) {
      return String(raw);
    }
  };

  const handleOpenCreateForm = () => {
    const nextNoSoal = computeNextNoSoal(manageMapelId || '', manageMapelName || '');
    setFormData({
      ...INITIAL_STATE,
      mapel_id: manageMapelId || '',
      mata_pelajaran: manageMapelName || '',
      no_soal: nextNoSoal,
    });
    setOptionCount(5);
    setEditingId(null);
    setIsFormPageOpen(true);
  };

  return (
    <Layout title="Kelola Soal">
      {renderPrintContent()}
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
          {/* Gambar field removed per user request */}

          {/* Pilihan Ganda & Kompleks */}
          {(formData.type_soal === 'Pilihan Ganda Tunggal (PG)' || formData.type_soal === 'Pilihan Ganda Kompleks (PK)') && (
            <div className="border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-3">Pilihan Jawaban</h4>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="w-12 px-2 py-2">Opsi</th>
                      <th className="w-24 px-2 py-2">Kunci</th>
                      <th className="px-2 py-2">Jawaban</th>
                      <th className="w-32 px-2 py-2">Skor</th>
                      <th className="w-20 px-2 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.from({ length: optionCount }).map((_, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isPG = formData.type_soal === 'Pilihan Ganda Tunggal (PG)';
                      const isPK = formData.type_soal === 'Pilihan Ganda Kompleks (PK)';
                      const currentKunci = String(formData.kunci_jawaban || '');
                      const selectedForPK = currentKunci ? currentKunci.split(',').map(s => s.trim()) : [];
                      const checkedPK = selectedForPK.includes(letter);
                      return (
                        <tr key={letter} className="align-top">
                          <td className="px-2 py-3 font-bold">{letter}</td>
                          <td className="px-2 py-3">
                            {isPG && (
                              <button
                                type="button"
                                aria-pressed={currentKunci === letter}
                                onClick={() => setFormData({ ...formData, kunci_jawaban: letter })}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border ${currentKunci === letter ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                                title={currentKunci === letter ? 'Terpilih' : 'Pilih kunci'}
                              >
                                {currentKunci === letter ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : null}
                              </button>
                            )}
                            {isPK && (
                              <button
                                type="button"
                                aria-pressed={checkedPK}
                                onClick={() => {
                                  const arr = currentKunci ? currentKunci.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  if (checkedPK) {
                                    const idx = arr.indexOf(letter);
                                    if (idx >= 0) arr.splice(idx, 1);
                                  } else {
                                    if (!arr.includes(letter)) arr.push(letter);
                                  }
                                  setFormData({ ...formData, kunci_jawaban: arr.join(',') });
                                }}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border ${checkedPK ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                                title={checkedPK ? 'Terpilih' : 'Centang untuk pilih'}
                              >
                                {checkedPK ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                                  </svg>
                                ) : null}
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <RichTextEditor
                              value={formData[`pilihan_${letter.toLowerCase()}`]}
                              onChange={(value) => setFormData({ ...formData, [`pilihan_${letter.toLowerCase()}`]: value })}
                              placeholder={`Pilihan ${letter}`}
                            />
                          </td>
                          <td className="px-2 py-3 flex items-start gap-2">
                            {(() => {
                              const isKeySelected = isPG ? currentKunci === letter : isPK ? checkedPK : false;
                              return (
                                <>
                                  <input
                                    type="number"
                                    step="any"
                                    value={formData[`scor_opsi_${i + 1}`]}
                                    onChange={(e) => setFormData({ ...formData, [`scor_opsi_${i + 1}`]: e.target.value })}
                                    disabled={!isKeySelected}
                                    className={`w-24 rounded-lg border px-2 py-1 ${isKeySelected ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                                    placeholder="0"
                                  />
                                  {isKeySelected && (
                                    <span className="inline-flex items-center text-green-600" title="Kunci terpilih">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-3">
                            {optionCount > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  // clear the fields for this option then reduce count
                                  const letterLower = letter.toLowerCase();
                                  const idx = i + 1;
                                  const copy: any = { ...formData };
                                  copy[`pilihan_${letterLower}`] = '';
                                  copy[`scor_opsi_${idx}`] = '';
                                  // also remove from kunci_jawaban if present
                                  const k = String(copy.kunci_jawaban || '');
                                  if (k) {
                                    const arr = k.split(',').map((s: string) => s.trim()).filter(Boolean);
                                    const pos = arr.indexOf(letter);
                                    if (pos >= 0) arr.splice(pos, 1);
                                    copy.kunci_jawaban = arr.join(',');
                                  }
                                  setFormData(copy);
                                  setOptionCount(prev => Math.max(2, prev - 1));
                                }}
                                className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOptionCount(prev => Math.min(5, prev + 1))}
                  disabled={optionCount >= 5}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Tambah opsi
                </button>
              </div>
            </div>
          )}

          {/* Benar/Salah & Setuju/Tidak */}
          {(formData.type_soal === 'Pilihan Benar/Salah (BS)' || formData.type_soal === 'Pilihan Setuju/Tidak (ST)') && (
            <div className="border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-3">Pernyataan</h4>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="w-12 px-2 py-2">Opsi</th>
                      <th className="px-2 py-2">Pernyataan</th>
                      <th className="w-24 px-2 py-2">{formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'Benar' : 'Setuju'}</th>
                      <th className="w-24 px-2 py-2">{formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'Salah' : 'Tidak'}</th>
                      <th className="w-28 px-2 py-2">Skor</th>
                      <th className="w-20 px-2 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.from({ length: optionCount }).map((_, i) => {
                      const num = i + 1;
                      const letter = String.fromCharCode(64 + num);
                      const currentAnswers = normalizeKunciJawaban(formData.kunci_jawaban || '', formData.type_soal).split(/[,\s]+/).filter(Boolean);
                      while (currentAnswers.length < optionCount) currentAnswers.push('-');
                      const answerChar = currentAnswers[i] || '-';
                      const trueValue = formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'B' : 'S';
                      const falseValue = formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'S' : 'T';
                      const isTrue = answerChar === trueValue;
                      const isFalse = answerChar === falseValue;

                      const setAnswer = (value: string) => {
                        setFormData((prev: any) => {
                          const answers = normalizeKunciJawaban(prev.kunci_jawaban || '', prev.type_soal).split(/[,\s]+/).filter(Boolean);
                          while (answers.length < optionCount) answers.push('-');
                          answers[i] = value;
                          return { ...prev, kunci_jawaban: answers.join(',') };
                        });
                      };

                      return (
                        <tr key={`bsst-${num}`} className="align-top">
                          <td className="px-2 py-3 font-bold">{letter}</td>
                          <td className="px-2 py-3">
                            <RichTextEditor
                              value={formData[`pernyataan_${num}`]}
                              onChange={(value) => setFormData({ ...formData, [`pernyataan_${num}`]: value })}
                              placeholder={`Pernyataan ${num}`}
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setAnswer(trueValue)}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border ${isTrue ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-700'} focus:outline-none`}
                              aria-pressed={isTrue}
                              title={formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'Benar' : 'Setuju'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setAnswer(falseValue)}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border ${isFalse ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-700'} focus:outline-none`}
                              aria-pressed={isFalse}
                              title={formData.type_soal === 'Pilihan Benar/Salah (BS)' ? 'Salah' : 'Tidak'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10 3.636 5.05a1 1 0 011.414-1.414L10 8.586z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="number"
                              step="any"
                              value={formData[`scor_opsi_${num}`]}
                              onChange={(e) => setFormData({ ...formData, [`scor_opsi_${num}`]: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-3">
                            {optionCount > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy: any = { ...formData };
                                  copy[`pernyataan_${num}`] = '';
                                  copy[`scor_opsi_${num}`] = '';
                                  const current = String(copy.kunci_jawaban || '').split('');
                                  current.splice(i, 1);
                                  copy.kunci_jawaban = current.join('');
                                  setFormData(copy);
                                  setOptionCount(prev => Math.max(2, prev - 1));
                                }}
                                className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOptionCount(prev => Math.min(5, prev + 1))}
                  disabled={optionCount >= 5}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Tambah opsi
                </button>
              </div>
            </div>
          )}

          {/* Menjodohkan */}
          {formData.type_soal === 'Menjodohkan (MJ)' && (
            <div className="border p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-3">Pasangan Jawaban</h4>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="w-12 px-2 py-2">No</th>
                      <th className="px-2 py-2">Pernyataan Kiri</th>
                      <th className="px-2 py-2">Jawaban Pernyataan Kanan</th>
                      <th className="w-28 px-2 py-2">Skor</th>
                      <th className="w-20 px-2 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.from({ length: optionCount }).map((_, i) => {
                      const num = i + 1;
                      const letter = String.fromCharCode(64 + num);
                      return (
                        <tr key={`mj-${num}`} className="align-top">
                          <td className="px-2 py-3 font-bold">{num}</td>
                          <td className="px-2 py-3">
                            <RichTextEditor
                              value={formData[`pasangan_kiri_${num}`]}
                              onChange={(value) => setFormData({ ...formData, [`pasangan_kiri_${num}`]: value })}
                              placeholder={`Pernyataan Kiri ${num}`}
                            />
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex gap-2 items-start">
                              <span className="text-xs font-bold mt-2">{letter}.</span>
                              <div className="w-full">
                                <RichTextEditor
                                  value={formData[`pasangan_kanan_${num}`]}
                                  onChange={(value) => setFormData({ ...formData, [`pasangan_kanan_${num}`]: value })}
                                  placeholder={`Pernyataan Kanan ${letter}`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="number"
                              step="any"
                              value={formData[`scor_opsi_${num}`]}
                              onChange={(e) => setFormData({ ...formData, [`scor_opsi_${num}`]: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-3">
                            {optionCount > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy: any = { ...formData };
                                  copy[`pasangan_kiri_${num}`] = '';
                                  copy[`pasangan_kanan_${num}`] = '';
                                  copy[`scor_opsi_${num}`] = '';
                                  setFormData(copy);
                                  setOptionCount(prev => Math.max(2, prev - 1));
                                }}
                                className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOptionCount(prev => Math.min(5, prev + 1))}
                  disabled={optionCount >= 5}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Tambah opsi
                </button>
              </div>
            </div>
          )}

          {formData.type_soal === 'Pilihan Ganda Tunggal (PG)' || formData.type_soal === 'Pilihan Ganda Kompleks (PK)' ? (
            <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <label className="text-sm font-medium text-gray-700">Kunci Jawaban</label>
              <p className="text-sm text-gray-700">Pilih kunci jawaban langsung pada kolom <strong>Kunci</strong> di samping opsi.</p>
              <div className="mt-2">
                <label className="text-xs text-gray-500">Terpilih:</label>
                <div className="mt-1 px-2 py-2 bg-white border rounded text-sm font-mono text-gray-700">{formData.kunci_jawaban || '-'}</div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-500 italic">{getKeyHint(formData.type_soal)}</p>
              </div>
            </div>
          ) : formData.type_soal === 'Uraian (UR)' ? (
            <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <label className="text-sm font-medium text-gray-700">Kunci Jawaban</label>
              <RichTextEditor
                value={formData.kunci_jawaban}
                onChange={(value) => setFormData({ ...formData, kunci_jawaban: value })}
                placeholder="Tulis kunci jawaban atau pembahasan di sini..."
              />
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-500 italic">{getKeyHint(formData.type_soal)}</p>
                <div className="ml-auto w-40">
                  <label className="text-xs text-gray-500">Skor Esai</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.scor_opsi_esai}
                    onChange={(e) => setFormData({ ...formData, scor_opsi_esai: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ) : formData.type_soal === 'Menjodohkan (MJ)' ? (
            <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <label className="text-sm font-medium text-gray-700">Kunci Jawaban</label>
              <RichTextEditor
                value={formData.kunci_jawaban}
                onChange={(value) => setFormData({ ...formData, kunci_jawaban: value })}
                placeholder="Tulis kunci jawaban atau pembahasan di sini..."
              />
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-500 italic">{getKeyHint(formData.type_soal)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <label className="text-sm font-medium text-gray-700">Kunci Jawaban</label>
              <p className="text-sm text-gray-700">Pilih kunci jawaban langsung pada baris Pernyataan.</p>
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-500 italic">{getKeyHint(formData.type_soal)}</p>
              </div>
            </div>
          )}

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
      <div className={isFormPageOpen ? 'hidden' : ''}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            Menampilkan {filteredData.length} dari {data.length} soal
            {selectedIds.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">({selectedIds.length} dipilih)</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Preview Soal
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => { setDeleteType('selected'); setShowDeleteModal(true); }}
                className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
              >
                <Trash2 className="h-4 w-4" /> Hapus Terpilih ({selectedIds.length})
              </button>
            )}
            {filteredData.length > 0 && (
              <button
                onClick={() => { setDeleteType('all'); setShowDeleteModal(true); }}
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
                      <td className="px-4 py-3 text-gray-700">{item.pertanyaan?.substring(0, 50)}{item.pertanyaan?.length > 50 ? '...' : ''}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-sm">{item.kunci_jawaban}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm">Edit</button>
                          <button onClick={() => handleDelete(item)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data soal. Gunakan filter atau tambah soal baru.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
          <div className="relative z-10 max-w-6xl w-full max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between no-print">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Preview Soal</h3>
                <p className="text-sm text-gray-500">Tampilkan semua soal yang sedang difilter dan simpan dalam bentuk PDF.</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowAnswerKey(prev => !prev)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {showAnswerKey ? 'Hide Kunci' : 'Show Kunci'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(90vh-120px)] bg-gray-50 p-6">
              <div className="print-area-inner">
                {filteredData.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                    Tidak ada soal untuk ditampilkan.
                  </div>
                ) : (
                  filteredData.map((item, index) => (
                    <div key={item.id} className="mb-10 last:mb-0 print-break">
                      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print-break">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-red-600">Soal {index + 1}</div>
                            <div className="text-base font-semibold text-gray-900">{item.mata_pelajaran || '-'} • {getTypeShort(item.type_soal)} • No. {item.no_soal}</div>
                          </div>
                          {showAnswerKey && item.kunci_jawaban && (
                            <div className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm text-gray-600">Kunci: {item.kunci_jawaban}</div>
                          )}
                        </div>
                        <div className="mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                          <div className="text-sm font-semibold text-gray-700 mb-3">Pertanyaan</div>
                          <div className="prose prose-sm text-gray-800" dangerouslySetInnerHTML={{ __html: item.pertanyaan || '<p>-</p>' }} />
                        </div>
                        <div className="space-y-4">
                          {renderPreviewOptions(item)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
