import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { SearchableSelect, Option } from '@/components/SearchableSelect';
import { supabase } from '@/supabaseClient';
import { Printer, RefreshCw, Search, CheckSquare, Square, Send } from 'lucide-react';

interface Agenda {
  id: string;
  agenda_ujian: string;
  token_ujian?: string;
  tgljam_mulai?: string;
  tgljam_selesai?: string;
}

interface Peserta {
  id: string;
  nama_peserta: string;
  asal_sekolah: string;
  kelas: string;
  username: string;
  password?: string;
  agenda_id?: string;
  agenda_nama?: string;
  agenda_token?: string;
  no_wa_peserta?: string;
}

const LOGO_URL = "https://lh3.googleusercontent.com/d/1zPGgFw4WVSz4v-Clgd0XvlgZ41QePiAY=w1200?authuser=0";

export function PrintKartuPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [selectedAgendaId, setSelectedAgendaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchAgendas = async () => {
    const { data: rows, error } = await supabase.from('agenda_ujian').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as Agenda));
    setAgendas(items);
  };

  const fetchPeserta = async () => {
    const { data: rows, error } = await supabase.from('peserta').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const items = (rows || []).map((r: any) => ({ id: String(r.id), ...r } as Peserta));
    setPeserta(items);
  };

  useEffect(() => {
    fetchAgendas();
    fetchPeserta();
  }, []);

  const selectedAgenda = agendas.find((item) => item.id === selectedAgendaId);

  const filteredPeserta = useMemo(() => {
    if (!selectedAgendaId) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return peserta
      .filter((item) => item.agenda_id === selectedAgendaId)
      .filter((item) => {
        if (!normalizedSearch) return true;
        return (
          item.nama_peserta?.toLowerCase().includes(normalizedSearch) ||
          item.asal_sekolah?.toLowerCase().includes(normalizedSearch) ||
          item.kelas?.toLowerCase().includes(normalizedSearch) ||
          item.username?.toLowerCase().includes(normalizedSearch)
        );
      })
      .map((item) => ({
        ...item,
        agenda_token: selectedAgenda?.token_ujian || item.agenda_token,
      }));
  }, [peserta, selectedAgendaId, searchTerm, selectedAgenda]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedAgendaId, searchTerm]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchAgendas(), fetchPeserta()]);
    setLoading(false);
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filteredPeserta.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredPeserta.map((item) => item.id));
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handlePrint = () => {
    if (!selectedAgendaId) return;
    if (selectedIds.length === 0) {
      alert('Pilih minimal satu peserta untuk dicetak.');
      return;
    }
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal satu peserta untuk dikirim.');
      return;
    }
    const selectedCards = filteredPeserta.filter((item) => selectedIds.includes(item.id));
    const messageHeader = `*CBT-Q • Kartu Tes Peserta*\n_Silakan gunakan data berikut untuk login ujian_\n\n`;
      const messageBody = selectedCards
      .map((item) => {
        const agendaName = selectedAgenda?.agenda_ujian || item.agenda_nama || '-';
        return `Nama: ${item.nama_peserta}\nSekolah : ${item.asal_sekolah}\nKelas : ${item.kelas}\nAgenda : ${agendaName}\nUsername : ${item.username}\nPassword : ${item.password || '-'}\nToken Ujian : ${item.agenda_token || '-'}`;
      })
      .join('\n\n———\n\n');
    const messageFooter = `\n\n_Jika ada kendala, silakan hubungi panitia._`;
    const message = `${messageHeader}${messageBody}${messageFooter}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Layout title="Print Kartu Tes">
      <div className="space-y-4">
        <div className="print-area">
        <div className="bg-white rounded-lg border border-gray-200 p-4 no-print">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Cetak Kartu Tes Peserta</h2>
              <p className="text-sm text-gray-500">Pilih agenda dan peserta yang ingin dicetak atau dikirim via WhatsApp.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={handlePrint}
                disabled={!selectedAgendaId}
                className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                <Printer className="h-4 w-4" /> Cetak Kartu
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={!selectedAgendaId}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Kirim WA
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Pilih Agenda Ujian</label>
              <SearchableSelect
                options={[{ value: '', label: '-- Pilih Agenda --' }, ...agendas.map(a => ({ value: a.id, label: a.agenda_ujian }))] as Option[]}
                value={selectedAgendaId || null}
                onChange={(v) => setSelectedAgendaId(String(v))}
                placeholder="-- Pilih Agenda --"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cari Peserta</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nama, sekolah, kelas, username"
                  className="w-full border-none focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-sm text-gray-600">Agenda Terpilih</p>
              <p className="text-base font-semibold text-gray-800">{selectedAgenda?.agenda_ujian || '-'}</p>
              <p className="text-xs text-gray-500">Total Peserta: {filteredPeserta.length}</p>
              <button
                onClick={handleToggleAll}
                className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-gray-700"
              >
                {selectedIds.length === filteredPeserta.length && filteredPeserta.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-red-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
                Pilih Semua
              </button>
            </div>
          </div>
        </div>

        {!selectedAgendaId ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            Pilih agenda terlebih dahulu untuk menampilkan kartu peserta.
          </div>
        ) : filteredPeserta.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            Peserta tidak ditemukan untuk agenda ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPeserta.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden print-card ${
                    isSelected ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'
                  } ${isSelected ? 'print-only' : 'print-hide'}`}
                >
                  <div className="flex items-center justify-between bg-red-600 text-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1">
                        {!imgError ? (
                          <img src={LOGO_URL} alt="CBT-Q" className="w-full h-full object-contain" onError={() => setImgError(true)} />
                        ) : (
                          <span className="text-sm font-bold text-red-600">Q</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Kartu Tes CBT-Q</p>
                        <p className="text-xs text-red-100">{selectedAgenda?.agenda_ujian || item.agenda_nama || '-'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleOne(item.id)}
                      className="text-white/90 hover:text-white"
                      title={isSelected ? 'Batalkan pilih' : 'Pilih kartu'}
                    >
                      {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Nama</span>
                      <span className="font-semibold text-gray-800 text-right">{item.nama_peserta}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Sekolah</span>
                      <span className="text-gray-800 text-right">{item.asal_sekolah}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Kelas</span>
                      <span className="text-gray-800 text-right">{item.kelas}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Username</span>
                      <span className="font-semibold text-gray-800 text-right">{item.username}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Password</span>
                      <span className="font-semibold text-gray-800 text-right">{item.password || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Token Ujian</span>
                      <span className="font-semibold text-gray-800 text-right">{item.agenda_token || '-'}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
                    Gunakan data di atas untuk masuk ke aplikasi CBT-Q.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
    </Layout>
  );
}
