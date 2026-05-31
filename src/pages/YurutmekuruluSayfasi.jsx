// Yürütme Kurulu sayfası — Tek liste (rütbe/kariyer görünmez)
// İçerik: src/utils/yurutmeKurulu.js
// Foto: konuşmacılar collection'ından coreId match

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, User as UserIcon, Edit3, Save, X, Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { YURUTME_KURULU as YURUTME_DEFAULT } from '../utils/yurutmeKurulu';
import { db } from '../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { makeCoreId, useData } from '../context/DataContext';
import KonusmaciFullModal from '../components/KonusmaciFullModal';
import { useSmartBack } from '../utils/navigation';
import { getSiteIcerik, saveSiteIcerik, isSiteAdmin } from '../utils/siteIcerik';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import BosListe from '../components/BosListe';

const I18N = {
  tr: {
    anasayfa: 'Hakkımızda',
    geri: 'Geri',
    kicker: 'OneTeam Liderleri',
    baslik: 'Yürütme Kurulu',
    aciklama: 'OneTeam ekosistemini yönlendiren, vizyonu hayata geçiren liderler.',
    altMetin: 'Bu liderler komisyonları kurar, eğitim politikalarını belirler ve OneTeam ailesini büyütür.',
    uye: 'üye',
  },
  en: {
    anasayfa: 'About',
    geri: 'Back',
    kicker: 'OneTeam Leaders',
    baslik: 'Executive Board',
    aciklama: 'The leaders shaping the OneTeam ecosystem and bringing the vision to life.',
    altMetin: 'These leaders form the committees, set training policies, and grow the OneTeam family.',
    uye: 'members',
  },
  de: {
    anasayfa: 'Über uns',
    geri: 'Zurück',
    kicker: 'OneTeam-Führung',
    baslik: 'Exekutivausschuss',
    aciklama: 'Die Führungskräfte, die das OneTeam-Ökosystem gestalten und die Vision zum Leben erwecken.',
    altMetin: 'Diese Führungskräfte bilden die Ausschüsse, legen die Bildungsrichtlinien fest und vergrößern die OneTeam-Familie.',
    uye: 'Mitglieder',
  },
  nl: {
    anasayfa: 'Over ons',
    geri: 'Terug',
    kicker: 'OneTeam Leiders',
    baslik: 'Uitvoerend Bestuur',
    aciklama: 'De leiders die het OneTeam-ecosysteem vormgeven en de visie tot leven brengen.',
    altMetin: 'Deze leiders vormen de commissies, bepalen het opleidingsbeleid en laten de OneTeam-familie groeien.',
    uye: 'leden',
  },
};

const YurutmekuruluSayfasi = () => {
  const navigate = useNavigate();
  const geri = useSmartBack('/hakkimizda');
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;
  const { takvim } = useData();
  const { user } = useAuth();
  const duzenleyebilir = isSiteAdmin(user?.email);
  const { toast } = useToast();

  // Üye listesi — önce hard-coded default, sonra Firestore override
  const [uyeler, setUyeler] = useState(YURUTME_DEFAULT);
  // Konuşmacılar collection — coreId → tüm kayıt
  const [konusmacilar, setKonusmacilar] = useState({}); // { coreId: { ad, fotoURL, biyografi, ... } }
  // Seçili üye → KonusmaciFullModal açar
  const [seciliUye, setSeciliUye] = useState(null);
  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [draftUyeler, setDraftUyeler] = useState([]);
  const [yeniUyeAd, setYeniUyeAd] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Firestore'dan üye listesini çek (varsa)
  useEffect(() => {
    (async () => {
      const d = await getSiteIcerik('yurutmekurulu');
      if (d?.uyeler && Array.isArray(d.uyeler) && d.uyeler.length > 0) {
        setUyeler(d.uyeler);
      }
    })();
  }, []);

  const aciliEditeBasla = () => {
    setDraftUyeler(uyeler.map(u => ({ ...u })));
    setEditMode(true);
  };
  const iptal = () => {
    setEditMode(false);
    setDraftUyeler([]);
    setYeniUyeAd('');
  };
  const uyeEkle = () => {
    const ad = yeniUyeAd.trim();
    if (!ad) return;
    setDraftUyeler(prev => [...prev, { ad, coreId: makeCoreId(ad) }]);
    setYeniUyeAd('');
  };
  const uyeSil = (idx) => setDraftUyeler(prev => prev.filter((_, i) => i !== idx));
  const uyeTasi = (idx, yon) => {
    const yeni = idx + yon;
    if (yeni < 0 || yeni >= draftUyeler.length) return;
    setDraftUyeler(prev => {
      const arr = [...prev];
      [arr[idx], arr[yeni]] = [arr[yeni], arr[idx]];
      return arr;
    });
  };
  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await saveSiteIcerik('yurutmekurulu', { uyeler: draftUyeler }, user?.email);
      setUyeler(draftUyeler);
      setEditMode(false);
      setDraftUyeler([]);
      setYeniUyeAd('');
      toast('Liste güncellendi', { type: 'success' });
    } catch (e) {
      toast('Kaydedemedik, tekrar dener misin?', { type: 'error' });
    } finally {
      setKaydediliyor(false);
    }
  };

  // localStorage cache — sadece YK üyelerinin foto+biyografisi (24 üye)
  // Stale-while-revalidate: cache anında göster, arkada fresh fetch
  const CACHE_KEY = 'amare_yurutme_konusmacilar_v1';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 gün

  useEffect(() => {
    // 1. Cache'den oku — anında render
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.data && Date.now() - (cached.ts || 0) < CACHE_TTL) {
        setKonusmacilar(cached.data);
      }
    } catch { /* yok say */ }

    // 2. Fresh fetch arka planda — sessizce güncelle + cache yenile
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'konusmacilar'));
        const ykIds = new Set(YURUTME_KURULU.map(u => u.coreId || makeCoreId(u.ad)));
        const map = {};
        snap.forEach(d => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setKonusmacilar(map);
        // Cache'e SADECE YK üyeleri (24 kişi) yaz — localStorage 5MB sınırı var
        try {
          const slim = {};
          Object.entries(map).forEach(([cid, k]) => {
            if (ykIds.has(cid)) slim[cid] = k;
          });
          const json = JSON.stringify({ data: slim, ts: Date.now() });
          if (json.length < 4.5 * 1024 * 1024) {
            localStorage.setItem(CACHE_KEY, json);
          }
        } catch (e) {
          console.warn('[yurutme cache]', e.message);
        }
      } catch (e) {
        console.warn('[yurutme] konuşmacılar yüklenemedi:', e.message);
      }
    })();
  }, []);

  const getKayit = (uye) => {
    const cid = uye.coreId || makeCoreId(uye.ad);
    return cid && konusmacilar[cid] ? konusmacilar[cid] : null;
  };
  const getFoto = (uye) => {
    const k = getKayit(uye);
    return k?.fotoURL || null;
  };

  const acModal = (uye) => {
    const kayit = getKayit(uye);
    setSeciliUye({ ad: uye.ad, kayit });
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Dekoratif altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-6xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={geri}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.geri || tr.anasayfa}
          </button>
          <div className="flex items-center gap-2">
            {duzenleyebilir && !editMode && (
              <button onClick={aciliEditeBasla}
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-md">
                <Edit3 className="w-3.5 h-3.5" /> Düzenle
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* Hero — kompakt */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 animate-fade-in">
          {/* Crown ikonu */}
          <div className="relative inline-block mb-4">
            <div className="absolute -inset-4 bg-amber-400/20 blur-2xl pointer-events-none" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/15 border border-amber-300/50 shadow-2xl">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
            </div>
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-amber-400/50" />
            <span className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-10 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-3 leading-tight">
            {tr.baslik}
          </h1>

          {/* Açıklama */}
          <p className="text-purple-100/85 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-4">
            {tr.aciklama}
          </p>

          {/* Üye sayısı rozeti */}
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white font-semibold">
              <strong className="font-bold">{uyeler.length}</strong> {tr.uye}
            </span>
          </div>
        </div>

        {/* Edit Mode — admin için inline editör */}
        {editMode && (
          <div className="bg-white/10 backdrop-blur-md border border-amber-300/40 rounded-2xl p-5 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-300" /> Üye Listesi Düzenleme
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={iptal} disabled={kaydediliyor}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                  <X className="w-3.5 h-3.5" /> İptal
                </button>
                <button onClick={kaydet} disabled={kaydediliyor}
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-60">
                  {kaydediliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Kaydet
                </button>
              </div>
            </div>

            {/* Üye listesi (drag yerine yukarı/aşağı butonları) */}
            <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
              {draftUyeler.map((u, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-purple-900/30 border border-white/10 rounded-lg p-2">
                  <span className="text-purple-200/60 text-xs w-6 text-center">{idx + 1}</span>
                  <input type="text" value={u.ad}
                    onChange={(e) => {
                      const yeni = e.target.value;
                      setDraftUyeler(prev => prev.map((it, i) => i === idx ? { ...it, ad: yeni, coreId: makeCoreId(yeni) } : it));
                    }}
                    className="flex-1 bg-purple-950/50 border border-white/10 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-amber-300/50" />
                  <button onClick={() => uyeTasi(idx, -1)} disabled={idx === 0}
                    className="text-white/60 hover:text-amber-300 disabled:opacity-30 p-1">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => uyeTasi(idx, 1)} disabled={idx === draftUyeler.length - 1}
                    className="text-white/60 hover:text-amber-300 disabled:opacity-30 p-1">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => uyeSil(idx)} title="Sil"
                    className="text-rose-400 hover:text-rose-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Yeni üye ekle */}
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <input type="text" value={yeniUyeAd}
                onChange={(e) => setYeniUyeAd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') uyeEkle(); }}
                placeholder="Yeni üye adı..."
                className="flex-1 bg-purple-950/50 border border-white/10 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-amber-300/50" />
              <button onClick={uyeEkle} disabled={!yeniUyeAd.trim()}
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 px-3 py-2 rounded text-xs font-bold transition-all disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>
            <p className="text-purple-200/60 text-xs mt-3">
              {draftUyeler.length} üye · Değişikliği kaydedince herkese yansır.
            </p>
          </div>
        )}

        {/* Tek liste — rütbe başlığı yok */}
        {uyeler.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {uyeler.map((u, idx) => {
              const foto = getFoto(u);
              return (
                <button key={u.ad + idx}
                  onClick={() => acModal(u)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 hover:border-amber-300/60 rounded-xl p-4 transition-all duration-300 text-center shadow-lg group hover:shadow-amber-500/20 hover:bg-white/15 hover:-translate-y-0.5 spring-tap focus:outline-none focus:ring-2 focus:ring-amber-400/50">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
                    {foto ? (
                      <img src={foto} alt={u.ad}
                        loading="lazy" decoding="async"
                        className="w-full h-full rounded-full object-cover border-2 border-amber-300/50 shadow-md group-hover:border-amber-300 transition-colors"
                        style={{ objectPosition: 'center 25%' }} />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/15 border-2 border-amber-300/40 flex items-center justify-center">
                        <span className="text-amber-200 font-bold text-base">
                          {(u.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Ad */}
                  <div className="text-white font-bold text-xs sm:text-sm leading-tight">
                    {u.ad}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <BosListe
            icon={Crown}
            varyant="altın"
            baslik="Liderler az sonra burada"
            mesaj="Yürütme Kurulu listesi az sonra burada parıldayacak. Birkaç saniye dur."
          />
        )}

        {/* Alt manifesto */}
        <div className="text-center mt-12 mb-12">
          <p className="text-purple-200/60 text-xs max-w-2xl mx-auto leading-relaxed">
            {tr.altMetin}
          </p>
        </div>
      </div>

      {/* Konuşmacı modal — gelecek/geçmiş eğitimler + kayıtlı + ilham veren sözler */}
      {seciliUye && (
        <KonusmaciFullModal
          ad={seciliUye.ad}
          kayit={seciliUye.kayit}
          takvim={takvim}
          onClose={() => setSeciliUye(null)}
        />
      )}
    </div>
  );
};

export default YurutmekuruluSayfasi;
