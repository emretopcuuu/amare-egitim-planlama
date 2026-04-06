import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as XLSX from 'xlsx';
import {
  LogOut, Users, Calendar, Settings,
  RefreshCw, Download, Trash2, Eye, EyeOff, Upload,
  UserCircle, Camera, X, ImageIcon, Key, Save, Pencil,
  Plus, Search, LayoutList, LayoutGrid, CheckSquare, Square,
  ExternalLink, Loader2, Info,
} from 'lucide-react';
import GorselOlusturModal from '../components/GorselOlusturModal';
import { gorselOlustur } from '../utils/gorselOlustur';

const DURUM_RENKLER = {
  beklemede: 'bg-yellow-100 text-yellow-800',
  onaylandi: 'bg-green-100 text-green-800',
  reddedildi: 'bg-red-100 text-red-800',
};

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const BOŞ_FORM = {
  egitim: '', gun: 'Pazartesi', tarih: '', saat: '',
  bitisSaati: '', sure: '', egitmen: '', yer: 'ZOOM SALON ID: 937 3761 2425', hafta: 1,
};

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30';

const FormField = ({ label, required, children }) => (
  <div>
    <label className="text-sm font-semibold text-gray-700 block mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const EgitimFormAlanlari = ({ form, setForm }) => (
  <>
    <FormField label="Eğitim Adı" required>
      <input type="text" value={form.egitim} onChange={e => setForm(f => ({ ...f, egitim: e.target.value }))} placeholder="Eğitim adını girin" className={inputCls} />
    </FormField>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Gün">
        <select value={form.gun} onChange={e => setForm(f => ({ ...f, gun: e.target.value }))} className={inputCls}>
          {GUNLER.map(g => <option key={g}>{g}</option>)}
        </select>
      </FormField>
      <FormField label="Tarih" required>
        <input type="text" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} placeholder="01.04.2025" className={inputCls} />
      </FormField>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <FormField label="Başlangıç" required>
        <input type="text" value={form.saat} onChange={e => setForm(f => ({ ...f, saat: e.target.value }))} placeholder="19:00" className={inputCls} />
      </FormField>
      <FormField label="Bitiş">
        <input type="text" value={form.bitisSaati} onChange={e => setForm(f => ({ ...f, bitisSaati: e.target.value }))} placeholder="20:00" className={inputCls} />
      </FormField>
      <FormField label="Süre">
        <input type="text" value={form.sure} onChange={e => setForm(f => ({ ...f, sure: e.target.value }))} placeholder="60 dk" className={inputCls} />
      </FormField>
    </div>
    <FormField label="Konuşmacı">
      <input type="text" value={form.egitmen} onChange={e => setForm(f => ({ ...f, egitmen: e.target.value }))} className={inputCls} />
    </FormField>
    <FormField label="Yer / Platform">
      <input type="text" value={form.yer} onChange={e => setForm(f => ({ ...f, yer: e.target.value }))} className={inputCls} />
    </FormField>
    <FormField label="Hafta">
      <select value={form.hafta} onChange={e => setForm(f => ({ ...f, hafta: Number(e.target.value) }))} className={inputCls}>
        {[1,2,3,4].map(h => <option key={h} value={h}>Hafta {h}</option>)}
      </select>
    </FormField>
  </>
);

const AdminPanel = () => {
  const navigate = useNavigate();
  const {
    egitmenler, takvim, takvimYayinlandi, isAdmin, loading,
    otomatikTakvimOlustur, exceldenTakvimYukle,
    egitimSil, egitimGuncelle, manuelEgitimEkle,
    basvuruSil, basvuruDurumGuncelle,
    konusmacilar, konusmaciFotoYukle, konusmaciFotoSil, konusmaciBilgiGuncelle,
    geminiApiKey, geminiApiKeyKaydet,
    sablonlar, sablonEkle, sablonSil,
    takvimDurumDegistir, adminCikis,
  } = useData();

  const [activeTab, setActiveTab] = useState('basvurular');
  const [processing, setProcessing] = useState(false);
  const [fotoUploadingId, setFotoUploadingId] = useState(null);
  const [gorselModal, setGorselModal] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [sablonYukleniyor, setSablonYukleniyor] = useState(false);

  // Düzenleme
  const [duzenleModal, setDuzenleModal] = useState(null);
  const [duzenleForm, setDuzenleForm] = useState({});
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false);

  // Manuel ekleme
  const [ekleModal, setEkleModal] = useState(false);
  const [ekleForm, setEkleForm] = useState(BOŞ_FORM);
  const [ekleKaydediliyor, setEkleKaydediliyor] = useState(false);

  // Arama & görünüm
  const [aramaMetni, setAramaMetni] = useState('');
  const [gorunum, setGorunum] = useState('liste');

  // Toplu görsel
  const [topluMod, setTopluMod] = useState(false);
  const [topluSecili, setTopluSecili] = useState(new Set());
  const [topluIlerleme, setTopluIlerleme] = useState(null);

  // Konuşmacı bilgi
  const [bilgiModal, setBilgiModal] = useState(null);
  const [bilgiForm, setBilgiForm] = useState({ unvan: '', biyografi: '', linkedin: '' });
  const [bilgiKaydediliyor, setBilgiKaydediliyor] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate('/admin-giris');
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600 text-xl">Yükleniyor...</div>
    </div>
  );

  // Computed
  const benzersizKonusmacilar = [...new Set(
    takvim.map(e => e.egitmen).filter(Boolean)
      .flatMap(e => e.split(/[\/,]/).map(n => n.trim()).filter(n => n.length > 1))
  )].sort();

  const filtreliTakvim = aramaMetni.trim()
    ? takvim.filter(e =>
        e.egitim?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        e.egitmen?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        e.tarih?.includes(aramaMetni)
      )
    : takvim;

  const konusmaciEgitimSayisi = {};
  takvim.forEach(e => {
    if (e.egitmen) {
      e.egitmen.split(/[\/,]/).map(n => n.trim()).filter(n => n.length > 1)
        .forEach(ad => { konusmaciEgitimSayisi[ad] = (konusmaciEgitimSayisi[ad] || 0) + 1; });
    }
  });
  const topKonusmacilar = Object.entries(konusmaciEgitimSayisi).sort(([,a],[,b]) => b - a).slice(0, 5);

  // Handlers
  const handleLogout = () => { adminCikis(); navigate('/'); };

  const handleOtomatikOlustur = async () => {
    if (!window.confirm('Mevcut takvim silinecek ve yeni takvim oluşturulacak. Emin misiniz?')) return;
    setProcessing(true);
    const result = await otomatikTakvimOlustur();
    setProcessing(false);
    if (result.success) { alert(`${result.count} eğitim planlandı.`); setActiveTab('takvim'); }
    else alert('Takvim oluşturulamadı: ' + result.error);
  };

  const handleExcelYukle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { alert('Lütfen .xlsx dosyası seçin.'); return; }
    if (!window.confirm(`"${file.name}" yüklenecek ve mevcut takvim silinecek. Emin misiniz?`)) { e.target.value = ''; return; }
    setProcessing(true);
    const result = await exceldenTakvimYukle(file);
    setProcessing(false);
    e.target.value = '';
    if (result.success) { alert(`${result.count} eğitim yüklendi.`); setActiveTab('takvim'); }
    else alert('Yükleme başarısız: ' + result.error);
  };

  const handleExcelIndir = () => {
    const rows = [...takvim]
      .sort((a, b) => (a.hafta - b.hafta) || (a.tarih || '').localeCompare(b.tarih || '') || (a.saat || '').localeCompare(b.saat || ''))
      .map(e => ({
        'Hafta': e.hafta, 'Gün': e.gun, 'Tarih': e.tarih,
        'Başlangıç': e.saat, 'Bitiş': e.bitisSaati, 'Süre': e.sure,
        'Eğitim': e.egitim, 'Konuşmacı': e.egitmen, 'Yer': e.yer,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Takvim');
    XLSX.writeFile(wb, `amare_takvim_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
  };

  const handleTakvimYayinla = async () => {
    const yeniDurum = !takvimYayinlandi;
    if (!window.confirm(yeniDurum ? 'Takvim yayınlanacak. Emin misiniz?' : 'Takvim gizlenecek. Emin misiniz?')) return;
    const result = await takvimDurumDegistir(yeniDurum);
    if (!result.success) alert('İşlem başarısız: ' + result.error);
  };

  const handleFotoYukle = async (konusmaciAdi, file) => {
    if (!file) return;
    const safeId = konusmaciAdi.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    setFotoUploadingId(safeId);
    try {
      const result = await konusmaciFotoYukle(konusmaciAdi, file);
      if (!result.success) alert('Fotoğraf yüklenemedi: ' + result.error);
    } catch (err) {
      alert('Fotoğraf yüklenemedi: ' + err.message);
    } finally {
      setFotoUploadingId(null);
    }
  };

  const handleFotoSil = async (konusmaciId, konusmaciAd) => {
    if (!window.confirm(`"${konusmaciAd}" fotoğrafını silmek istiyor musunuz?`)) return;
    const result = await konusmaciFotoSil(konusmaciId, konusmaciAd);
    if (!result.success) alert('Silme başarısız: ' + result.error);
  };

  const handleGorselAc = (egitim) => {
    const egitmenAdlari = (egitim.egitmen || '').split(/[\/,]/).map(n => n.trim()).filter(Boolean);
    let fotoURL = null;
    for (const ad of egitmenAdlari) {
      const safeId = ad.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const k = konusmacilar.find(k => k.id === safeId);
      if (k?.fotoURL) { fotoURL = k.fotoURL; break; }
    }
    setGorselModal({ egitim, egitmenFotoURL: fotoURL });
  };

  const handleApiKeySave = () => {
    geminiApiKeyKaydet(apiKeyInput.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleSablonYukle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setSablonYukleniyor(true);
    try {
      const ad = file.name.replace(/\.[^.]+$/, '');
      const result = await sablonEkle(ad, file);
      if (!result.success) alert('Şablon yüklenemedi: ' + result.error);
    } catch (err) {
      alert('Şablon yüklenemedi: ' + err.message);
    } finally {
      setSablonYukleniyor(false);
    }
  };

  const handleSablonSil = async (sablonId, sablonAd) => {
    if (!window.confirm(`"${sablonAd}" şablonunu silmek istiyor musunuz?`)) return;
    const result = await sablonSil(sablonId);
    if (!result.success) alert('Silme başarısız: ' + result.error);
  };

  const handleDuzenleAc = (egitim) => {
    setDuzenleForm({
      egitim: egitim.egitim || '', gun: egitim.gun || '', tarih: egitim.tarih || '',
      saat: egitim.saat || '', bitisSaati: egitim.bitisSaati || '', sure: egitim.sure || '',
      egitmen: egitim.egitmen || '', yer: egitim.yer || '', hafta: egitim.hafta || 1,
    });
    setDuzenleModal(egitim);
  };

  const handleDuzenleKaydet = async () => {
    if (!duzenleModal) return;
    setDuzenleKaydediliyor(true);
    const result = await egitimGuncelle(duzenleModal.id, duzenleForm);
    setDuzenleKaydediliyor(false);
    if (result.success) setDuzenleModal(null);
    else alert('Kaydedilemedi: ' + result.error);
  };

  const handleEgitimSil = async (egitimId, egitimAdi) => {
    if (!window.confirm(`"${egitimAdi}" eğitimini silmek istiyor musunuz?`)) return;
    const result = await egitimSil(egitimId);
    if (!result.success) alert('Silme başarısız: ' + result.error);
  };

  const hesaplaSure = (form) => {
    if (form.sure) return form.sure;
    if (form.saat && form.bitisSaati) {
      const [bH, bM] = form.saat.split(':').map(Number);
      const [eH, eM] = form.bitisSaati.split(':').map(Number);
      const diff = (eH * 60 + eM) - (bH * 60 + bM);
      if (diff > 0) return `${diff} dk`;
    }
    return '45 dk';
  };

  const handleEkleKaydet = async () => {
    if (!ekleForm.egitim || !ekleForm.tarih || !ekleForm.saat) { alert('Eğitim adı, tarih ve saat zorunludur.'); return; }
    setEkleKaydediliyor(true);
    const result = await manuelEgitimEkle({
      ...ekleForm, sure: hesaplaSure(ekleForm), hafta: Number(ekleForm.hafta),
      slot: `${ekleForm.tarih}_${ekleForm.saat}`, kaynak: 'manuel',
    });
    setEkleKaydediliyor(false);
    if (result.success) { setEkleModal(false); setEkleForm(BOŞ_FORM); }
    else alert('Kaydedilemedi: ' + result.error);
  };

  const handleTopluSecToggle = (egitimId) => {
    setTopluSecili(prev => {
      const n = new Set(prev);
      n.has(egitimId) ? n.delete(egitimId) : n.add(egitimId);
      return n;
    });
  };

  const handleTopluGorselOlustur = async () => {
    if (topluSecili.size === 0) { alert('Lütfen en az bir eğitim seçin.'); return; }
    if (!geminiApiKey) { alert('API anahtarı eksik. Ayarlar sekmesinden ekleyin.'); return; }
    if (sablonlar.length === 0) { alert('Şablon bulunamadı. Ayarlar sekmesinden şablon ekleyin.'); return; }
    const sablon = sablonlar[0];
    const seciliEgitimler = takvim.filter(e => topluSecili.has(e.id));
    setTopluIlerleme({ tamamlanan: 0, toplam: seciliEgitimler.length, hatalar: [], sonuclar: [] });
    for (let i = 0; i < seciliEgitimler.length; i++) {
      const egitim = seciliEgitimler[i];
      try {
        const egitmenAdlari = (egitim.egitmen || '').split(/[\/,]/).map(n => n.trim()).filter(Boolean);
        let fotoURL = null;
        for (const ad of egitmenAdlari) {
          const safeId = ad.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const k = konusmacilar.find(k => k.id === safeId);
          if (k?.fotoURL) { fotoURL = k.fotoURL; break; }
        }
        const result = await gorselOlustur({ apiKey: geminiApiKey, egitim, egitmenFotoURL: fotoURL, sablonFile: sablon.url });
        const standardB64 = result.base64.replace(/-/g, '+').replace(/_/g, '/');
        const byteChars = atob(standardB64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let j = 0; j < byteChars.length; j++) byteArr[j] = byteChars.charCodeAt(j);
        const blob = new Blob([byteArr], { type: result.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setTopluIlerleme(prev => ({ ...prev, tamamlanan: i + 1, sonuclar: [...prev.sonuclar, { egitim, blobUrl }] }));
      } catch (err) {
        setTopluIlerleme(prev => ({ ...prev, tamamlanan: i + 1, hatalar: [...prev.hatalar, { egitim: egitim.egitim, hata: err.message }] }));
      }
    }
  };

  const handleTopluIndir = (blobUrl, egitimAdi) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${egitimAdi.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleBilgiAc = (ad) => {
    const safeId = ad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const k = konusmacilar.find(k => k.id === safeId);
    setBilgiForm({ unvan: k?.unvan || '', biyografi: k?.biyografi || '', linkedin: k?.linkedin || '' });
    setBilgiModal({ ad, safeId });
  };

  const handleBilgiKaydet = async () => {
    if (!bilgiModal) return;
    setBilgiKaydediliyor(true);
    const result = await konusmaciBilgiGuncelle(bilgiModal.safeId, { id: bilgiModal.safeId, ad: bilgiModal.ad, ...bilgiForm });
    setBilgiKaydediliyor(false);
    if (result.success) setBilgiModal(null);
    else alert('Kaydedilemedi: ' + result.error);
  };

  const handleBasvuruSil = async (basvuruId, ad) => {
    if (!window.confirm(`"${ad}" başvurusunu silmek istiyor musunuz?`)) return;
    const result = await basvuruSil(basvuruId);
    if (!result.success) alert('Silme başarısız: ' + result.error);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white py-4 px-6 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Amare Admin Paneli</h1>
          <button onClick={handleLogout} className="flex items-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
            <LogOut className="w-5 h-5 mr-2" />Çıkış Yap
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'basvurular', label: `Başvurular (${egitmenler.length})`, Icon: Users },
              { key: 'takvim', label: `Takvim (${takvim.length})`, Icon: Calendar },
              { key: 'konusmacilar', label: `Konuşmacılar (${benzersizKonusmacilar.length})`, Icon: UserCircle },
              { key: 'ayarlar', label: 'Ayarlar', Icon: Settings },
            ].map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`py-4 px-2 border-b-2 font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === key ? 'border-amare-purple text-amare-purple' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                <Icon className="w-5 h-5 inline" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">

        {/* ===== BAŞVURULAR ===== */}
        {activeTab === 'basvurular' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Eğitmen Başvuruları</h2>
              <p className="text-gray-500">Toplam {egitmenler.length} başvuru</p>
            </div>
            {egitmenler.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz başvuru yapılmadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {egitmenler.map((egitmen, index) => (
                  <div key={egitmen.id || index} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{egitmen.adSoyad}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={egitmen.durum || 'beklemede'}
                          onChange={e => basvuruDurumGuncelle(egitmen.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${DURUM_RENKLER[egitmen.durum || 'beklemede']}`}
                        >
                          <option value="beklemede">⏳ Beklemede</option>
                          <option value="onaylandi">✅ Onaylandı</option>
                          <option value="reddedildi">❌ Reddedildi</option>
                        </select>
                        <button onClick={() => handleBasvuruSil(egitmen.id, egitmen.adSoyad)} className="text-red-500 hover:text-red-700 p-1" title="Sil">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-500">Kariyer:</span> <span className="font-semibold">{egitmen.kariyerSeviyesi}</span></div>
                        <div><span className="text-gray-500">Telefon:</span> <span className="font-semibold">{egitmen.telefon}</span></div>
                        <div><span className="text-gray-500">Email:</span> <span className="font-semibold">{egitmen.email}</span></div>
                        <div><span className="text-gray-500">Deneyim:</span> <span className="font-semibold">{egitmen.deneyim}</span></div>
                      </div>
                      <div>
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-1">Verebileceği Eğitimler:</div>
                          <div className="flex flex-wrap gap-2">
                            {egitmen.egitimler?.map((eg, i) => (
                              <span key={i} className="bg-amare-purple/10 text-amare-purple px-3 py-1 rounded-full text-xs font-semibold">{eg}</span>
                            ))}
                          </div>
                        </div>
                        {egitmen.ozelKonu && (
                          <div className="mb-3">
                            <div className="text-sm text-gray-500 mb-1">Özel Konu:</div>
                            <div className="text-sm bg-yellow-50 px-3 py-2 rounded">{egitmen.ozelKonu}</div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">Uygun Günler:</div>
                            <div className="font-semibold">{egitmen.uygunGunler?.join(', ')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Uygun Saatler:</div>
                            <div className="font-semibold">{egitmen.uygunSaatler?.join(', ')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAKVİM ===== */}
        {activeTab === 'takvim' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Eğitim Takvimi</h2>
                  <p className="text-gray-600 mt-1">Toplam {takvim.length} eğitim planlandı</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <label className={`flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer text-sm font-semibold ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4 mr-2" />{processing ? 'Yükleniyor...' : 'Excel Yükle'}
                    <input type="file" accept=".xlsx,.xls" onChange={handleExcelYukle} className="hidden" disabled={processing} />
                  </label>
                  <button onClick={handleOtomatikOlustur} disabled={processing || egitmenler.length === 0}
                    className="flex items-center bg-amare-purple text-white px-4 py-2 rounded-lg hover:bg-amare-dark disabled:bg-gray-400 text-sm font-semibold">
                    <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                    {processing ? 'Oluşturuluyor...' : 'Otomatik Oluştur'}
                  </button>
                </div>
              </div>

              {/* İstatistik kartları */}
              {takvim.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[1,2,3,4].map(h => (
                    <div key={h} className="bg-purple-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-purple-600 font-semibold mb-1">Hafta {h}</div>
                      <div className="text-2xl font-bold text-purple-700">{takvim.filter(e => e.hafta === h).length}</div>
                      <div className="text-xs text-purple-400">eğitim</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              {takvim.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
                      placeholder="Eğitim adı, konuşmacı, tarih..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
                  </div>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => setGorunum('liste')} title="Liste"
                      className={`px-3 py-2 ${gorunum === 'liste' ? 'bg-amare-purple text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <button onClick={() => setGorunum('kompakt')} title="Kompakt"
                      className={`px-3 py-2 ${gorunum === 'kompakt' ? 'bg-amare-purple text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={handleExcelIndir}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700">
                    <Download className="w-4 h-4" />Excel İndir
                  </button>
                  <button onClick={() => setEkleModal(true)}
                    className="flex items-center gap-1.5 bg-amare-blue text-white px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90">
                    <Plus className="w-4 h-4" />Eğitim Ekle
                  </button>
                  <button onClick={() => { setTopluMod(!topluMod); setTopluSecili(new Set()); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${topluMod ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-amare-purple/40'}`}>
                    <ImageIcon className="w-4 h-4" />
                    {topluMod ? `${topluSecili.size} Seçili` : 'Toplu Görsel'}
                  </button>
                  {topluMod && topluSecili.size > 0 && (
                    <button onClick={handleTopluGorselOlustur}
                      className="flex items-center gap-1.5 bg-amare-purple text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-amare-dark">
                      <ImageIcon className="w-4 h-4" />{topluSecili.size} Görsel Oluştur
                    </button>
                  )}
                </div>
              )}
            </div>

            {takvim.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Henüz takvim oluşturulmadı</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[1,2,3,4].map(haftaNo => {
                  const haftaEgitimleri = filtreliTakvim.filter(e => e.hafta === haftaNo);
                  if (haftaEgitimleri.length === 0) return null;
                  return (
                    <div key={haftaNo} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-xl font-bold text-amare-purple mb-4">
                        Hafta {haftaNo} <span className="text-base font-normal text-gray-500">({haftaEgitimleri.length} eğitim)</span>
                      </h3>
                      {gorunum === 'kompakt' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {haftaEgitimleri.map(egitim => (
                            <div key={egitim.id}
                              onClick={topluMod ? () => handleTopluSecToggle(egitim.id) : undefined}
                              className={`relative border rounded-xl p-3 transition-all ${topluMod ? 'cursor-pointer' : ''} ${topluSecili.has(egitim.id) ? 'border-amare-purple bg-purple-50 ring-2 ring-amare-purple/20' : 'border-gray-200 hover:border-amare-purple/40'}`}>
                              {topluMod && (
                                <div className="absolute top-2 right-2">
                                  {topluSecili.has(egitim.id)
                                    ? <CheckSquare className="w-4 h-4 text-amare-purple" />
                                    : <Square className="w-4 h-4 text-gray-300" />}
                                </div>
                              )}
                              <div className="font-semibold text-xs text-gray-800 line-clamp-2 mb-1 pr-5">{egitim.egitim}</div>
                              <div className="text-xs text-gray-500">{egitim.tarih}{egitim.saat ? ` • ${egitim.saat}` : ''}</div>
                              {egitim.egitmen && <div className="text-xs text-amare-purple truncate mt-0.5">{egitim.egitmen}</div>}
                              {!topluMod && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  <button onClick={() => handleGorselAc(egitim)} className="text-xs bg-amare-purple text-white px-2 py-0.5 rounded-lg">Görsel</button>
                                  <button onClick={() => handleDuzenleAc(egitim)} className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded-lg">Düzenle</button>
                                  <button onClick={() => handleEgitimSil(egitim.id, egitim.egitim)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg">Sil</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {haftaEgitimleri.map(egitim => (
                            <div key={egitim.id}
                              onClick={topluMod ? () => handleTopluSecToggle(egitim.id) : undefined}
                              className={`border rounded-lg p-4 flex items-center justify-between group transition-colors ${topluMod ? 'cursor-pointer' : ''} ${topluSecili.has(egitim.id) ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-amare-purple/40 hover:bg-purple-50/30'}`}>
                              {topluMod && (
                                <div className="mr-3 flex-shrink-0">
                                  {topluSecili.has(egitim.id)
                                    ? <CheckSquare className="w-5 h-5 text-amare-purple" />
                                    : <Square className="w-5 h-5 text-gray-300" />}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-bold text-gray-800">{egitim.egitim}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {egitim.gun} {egitim.tarih} — {egitim.saat}{egitim.bitisSaati ? `-${egitim.bitisSaati}` : ''} ({egitim.sure})
                                </div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                  {egitim.egitmen && <span>🎤 {egitim.egitmen}</span>}
                                  {egitim.yer && <span className="ml-3">📍 {egitim.yer}</span>}
                                </div>
                              </div>
                              {!topluMod && (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                  <button onClick={() => handleGorselAc(egitim)}
                                    className="flex items-center gap-1.5 bg-amare-purple text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amare-dark">
                                    <ImageIcon className="w-3.5 h-3.5" />Görsel
                                  </button>
                                  <button onClick={() => handleDuzenleAc(egitim)}
                                    className="flex items-center gap-1.5 bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700">
                                    <Pencil className="w-3.5 h-3.5" />Düzenle
                                  </button>
                                  <button onClick={() => handleEgitimSil(egitim.id, egitim.egitim)} className="text-red-500 hover:text-red-700 p-2">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filtreliTakvim.length === 0 && aramaMetni && (
                  <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    "{aramaMetni}" için sonuç bulunamadı
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== KONUŞMACILAR ===== */}
        {activeTab === 'konusmacilar' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Konuşmacılar</h2>
              <p className="text-gray-500 text-sm">Fotoğraf ve profil bilgilerini düzenleyebilirsiniz.</p>
            </div>
            {benzersizKonusmacilar.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Takvimde henüz konuşmacı yok</p>
              </div>
            ) : (
              <>
                {topKonusmacilar.length > 0 && (
                  <div className="bg-white rounded-xl shadow p-5 mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">En Çok Eğitim Veren Konuşmacılar</h3>
                    <div className="flex flex-wrap gap-2">
                      {topKonusmacilar.map(([ad, sayi]) => (
                        <span key={ad} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                          {ad} <span className="bg-purple-200 text-purple-900 rounded-full px-1.5 py-0.5 ml-1">{sayi}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {benzersizKonusmacilar.map(ad => {
                    const safeId = ad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const kayitliK = konusmacilar.find(k => k.id === safeId);
                    const isUploading = fotoUploadingId === safeId;
                    return (
                      <div key={safeId} className="bg-white rounded-xl shadow p-4 flex flex-col items-center gap-3">
                        <div className="relative w-24 h-24">
                          {kayitliK?.fotoURL ? (
                            <>
                              <img src={kayitliK.fotoURL} alt={ad} className="w-24 h-24 rounded-full object-cover border-2 border-amare-purple" />
                              <button onClick={() => handleFotoSil(safeId, ad)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                              <UserCircle className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-amare-purple border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{ad}</p>
                          {kayitliK?.unvan && <p className="text-xs text-gray-500 mt-0.5">{kayitliK.unvan}</p>}
                          {kayitliK?.linkedin && (
                            <a href={kayitliK.linkedin} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1 justify-center mt-0.5">
                              <ExternalLink className="w-3 h-3" />LinkedIn
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2 w-full">
                          <label className="flex-1 cursor-pointer flex items-center justify-center gap-1 text-xs bg-amare-purple text-white px-2 py-1.5 rounded-lg hover:bg-amare-dark">
                            <Camera className="w-3 h-3" />{kayitliK?.fotoURL ? 'Değiştir' : 'Foto'}
                            <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                              onChange={e => { if (e.target.files[0]) handleFotoYukle(ad, e.target.files[0]); e.target.value = ''; }} />
                          </label>
                          <button onClick={() => handleBilgiAc(ad)}
                            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200">
                            <Info className="w-3 h-3" />Bilgi
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== AYARLAR ===== */}
        {activeTab === 'ayarlar' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Takvim Ayarları</h2>

              {/* Takvim Görünürlüğü */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Takvim Görünürlüğü</h3>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">Takvim Durumu</div>
                    <div className="text-sm text-gray-600">
                      {takvimYayinlandi ? 'Yayınlandı — Herkes görebilir' : 'Gizli — Sadece admin görebilir'}
                    </div>
                  </div>
                  <button onClick={handleTakvimYayinla}
                    className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${takvimYayinlandi ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                    {takvimYayinlandi ? <><EyeOff className="w-5 h-5 mr-2" />Takvimi Gizle</> : <><Eye className="w-5 h-5 mr-2" />Takvimi Yayınla</>}
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amare-purple" />Görsel Oluşturma (Gemini API)
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Google AI Studio'dan API anahtarı alın.{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amare-purple underline">API anahtarı al →</a>
                </p>
                <div className="flex gap-3">
                  <input type="password" value={apiKeyInput}
                    onChange={e => { setApiKeyInput(e.target.value); setApiKeySaved(false); }}
                    placeholder="AIzaSy..." className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/40" />
                  <button onClick={handleApiKeySave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${apiKeySaved ? 'bg-green-500 text-white' : 'bg-amare-purple text-white hover:bg-amare-dark'}`}>
                    <Save className="w-4 h-4" />{apiKeySaved ? 'Kaydedildi!' : 'Kaydet'}
                  </button>
                </div>
                {geminiApiKey && <p className="text-xs text-green-600 mt-1">✅ API anahtarı kayıtlı</p>}
              </div>

              {/* Şablon Görseller */}
              <div className="border-b pb-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-amare-purple" />Şablon Görseller
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Görsel hazırlarken kullanılacak şablon tasarımları</p>
                  </div>
                  <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white ${sablonYukleniyor ? 'bg-gray-400' : 'bg-amare-purple hover:bg-amare-dark'}`}>
                    <Upload className="w-4 h-4" />{sablonYukleniyor ? 'Yükleniyor...' : 'Şablon Ekle'}
                    <input type="file" accept="image/*" className="hidden" disabled={sablonYukleniyor} onChange={handleSablonYukle} />
                  </label>
                </div>
                {sablonlar.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">Henüz şablon eklenmedi</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {sablonlar.map(s => (
                      <div key={s.id} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <img src={s.url} alt={s.ad} className="w-full aspect-square object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <p className="text-white text-xs text-center font-medium line-clamp-2">{s.ad}</p>
                          <button onClick={() => handleSablonSil(s.id, s.ad)} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* İstatistikler */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">İstatistikler</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 font-semibold mb-1">Toplam Başvuru</div>
                    <div className="text-3xl font-bold text-blue-700">{egitmenler.length}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 font-semibold mb-1">Planlanan Eğitim</div>
                    <div className="text-3xl font-bold text-purple-700">{takvim.length}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 font-semibold mb-1">Takvim Durumu</div>
                    <div className="text-lg font-bold text-green-700">{takvimYayinlandi ? 'Yayında' : 'Gizli'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALLER ===== */}

      {/* Eğitim Düzenleme */}
      {duzenleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Eğitimi Düzenle</h2>
              <button onClick={() => setDuzenleModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <EgitimFormAlanlari form={duzenleForm} setForm={setDuzenleForm} />
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setDuzenleModal(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">İptal</button>
              <button onClick={handleDuzenleKaydet} disabled={duzenleKaydediliyor}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-amare-purple hover:bg-amare-dark disabled:opacity-50 flex items-center justify-center gap-2">
                {duzenleKaydediliyor ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : <><Save className="w-4 h-4" />Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Eğitim Ekleme */}
      {ekleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Yeni Eğitim Ekle</h2>
              <button onClick={() => setEkleModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <EgitimFormAlanlari form={ekleForm} setForm={setEkleForm} />
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setEkleModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">İptal</button>
              <button onClick={handleEkleKaydet} disabled={ekleKaydediliyor}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-amare-blue hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {ekleKaydediliyor ? <><Loader2 className="w-4 h-4 animate-spin" />Ekleniyor...</> : <><Plus className="w-4 h-4" />Ekle</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konuşmacı Bilgi */}
      {bilgiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Konuşmacı Bilgileri</h2>
                <p className="text-sm text-gray-500 mt-0.5">{bilgiModal.ad}</p>
              </div>
              <button onClick={() => setBilgiModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <FormField label="Unvan / Pozisyon">
                <input type="text" value={bilgiForm.unvan} onChange={e => setBilgiForm(f => ({ ...f, unvan: e.target.value }))}
                  placeholder="Örn: Diamond Lider, Prof.Dr." className={inputCls} />
              </FormField>
              <FormField label="LinkedIn Profil URL">
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="url" value={bilgiForm.linkedin} onChange={e => setBilgiForm(f => ({ ...f, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..." className={`${inputCls} pl-9`} />
                </div>
              </FormField>
              <FormField label="Biyografi">
                <textarea value={bilgiForm.biyografi} onChange={e => setBilgiForm(f => ({ ...f, biyografi: e.target.value }))}
                  placeholder="Kısa tanıtım metni..." rows={4} className={`${inputCls} resize-none`} />
              </FormField>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setBilgiModal(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">İptal</button>
              <button onClick={handleBilgiKaydet} disabled={bilgiKaydediliyor}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-amare-purple hover:bg-amare-dark disabled:opacity-50 flex items-center justify-center gap-2">
                {bilgiKaydediliyor ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : <><Save className="w-4 h-4" />Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Görsel İlerleme */}
      {topluIlerleme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Toplu Görsel Oluşturma</h2>
                <p className="text-sm text-gray-500 mt-0.5">{topluIlerleme.tamamlanan} / {topluIlerleme.toplam} tamamlandı</p>
              </div>
              {topluIlerleme.tamamlanan === topluIlerleme.toplam && (
                <button onClick={() => { setTopluIlerleme(null); setTopluMod(false); setTopluSecili(new Set()); }}
                  className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              )}
            </div>
            <div className="p-6">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div className="bg-amare-purple h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(topluIlerleme.tamamlanan / topluIlerleme.toplam) * 100}%` }} />
              </div>
              {topluIlerleme.tamamlanan < topluIlerleme.toplam && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-amare-purple" />
                  Görsel oluşturuluyor... Bu işlem birkaç dakika sürebilir.
                </div>
              )}
              {topluIlerleme.hatalar.length > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-sm font-semibold text-red-700 mb-1">Başarısız ({topluIlerleme.hatalar.length})</div>
                  {topluIlerleme.hatalar.map((h, i) => (
                    <div key={i} className="text-xs text-red-600 truncate">{h.egitim}: {h.hata}</div>
                  ))}
                </div>
              )}
              {topluIlerleme.sonuclar.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-green-700">✅ Hazır ({topluIlerleme.sonuclar.length})</div>
                  <div className="grid grid-cols-2 gap-3">
                    {topluIlerleme.sonuclar.map((s, i) => (
                      <div key={i} className="border rounded-xl overflow-hidden">
                        <img src={s.blobUrl} alt={s.egitim.egitim} className="w-full object-cover" />
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-700 truncate mb-1">{s.egitim.egitim}</div>
                          <button onClick={() => handleTopluIndir(s.blobUrl, s.egitim.egitim)}
                            className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                            <Download className="w-3 h-3" />İndir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Görsel Oluşturma Modal */}
      {gorselModal && (
        <GorselOlusturModal
          egitim={gorselModal.egitim}
          egitmenFotoURL={gorselModal.egitmenFotoURL}
          apiKey={geminiApiKey}
          sablonlar={sablonlar}
          onClose={() => setGorselModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
