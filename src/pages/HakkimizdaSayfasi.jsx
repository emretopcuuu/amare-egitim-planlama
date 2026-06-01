// Hakkımızda — OneTeam Girişimcilik Ekosistemi kurumsal sayfası
// Misyon + Vizyon + ileride Değerler/Liderler/İletişim için geniş.
// İçerik şimdilik hard-coded; ileride Firestore'a alınabilir.

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Compass, GraduationCap, Building2, Crown, ArrowRight, Edit3, Save, X, Loader2, Sparkles } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { useSmartBack } from '../utils/navigation';
import { db } from '../utils/firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { YURUTME_KURULU } from '../utils/yurutmeKurulu';
import { KOMISYONLAR } from '../utils/komisyonlar';
import { makeCoreId, useData } from '../context/DataContext';
import { getSiteIcerik, saveSiteIcerik, isSiteAdmin } from '../utils/siteIcerik';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import LiveCounter from '../components/LiveCounter';
import AvatarOverlap from '../components/AvatarOverlap';

const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    geri: 'Geri',
    kicker: 'One Team',
    baslikSol: 'Girişimcilik',
    baslikSag: 'Ekosistemi',
    intro: 'Bireylerin hayatını değiştiren, dünyanın en güçlü girişimcilik ekosistemini birlikte kuruyoruz.',
    sayilarKicker: 'Birlikte',
    sayilarBaslik: 'Çoğalan bir aile',
    katilCagriBaslik: 'OneTeam Ailesine Katıl',
    katilCagriMetin: 'Marka Ortağı ol, sağlık + varlık + özgürlük yolculuğuna bizimle başla.',
    katilButon: 'Aramıza Katıl',
    girisliKatilButon: 'Profilime Git',
    sozBaslik: 'Liderlerden',
    sozMetin: 'Bir kişinin başarısı için değil, herkesin hayatını iyileştirmek için buradayız. OneTeam ailesi olarak hep birlikte büyüyoruz.',
    sozAd: 'OneTeam Manifesto',
    misyon: 'Misyon',
    misyonMetin1: 'Sağlık, varlık ve özgürlük dolu bir yaşamın',
    misyonVurgu: ' herkes için ',
    misyonMetin2: 'mümkün olduğuna inanıyoruz. One Team ailesi olarak hep birlikte bunun için çalışıyoruz.',
    vizyon: 'Vizyon',
    vizyonMetin1: 'Bireylerin ve toplulukların yaşamını iyileştiren,',
    vizyonVurgu: ' dünyanın en büyük ve en etkili ',
    vizyonMetin2: 'girişimcilik ekosistemi olmak.',
    altKicker: 'Birlikte Daha Güçlü',
    altMetin: 'One Team, Amare liderlerin kurduğu dünyanın en başarılı girişimci dayanışma topluluklarından biridir.',
    sekmelerKicker: 'Ekosistemi Keşfet',
    egitmenlerBaslik: 'Eğitmenler',
    egitmenlerAciklama: 'Aramıza katılıp bilgi ve deneyimlerini paylaşan uzmanlar',
    komisyonlarBaslik: 'Komisyonlar',
    komisyonlarAciklama: 'Yürütme Kurulu’nun kurduğu 11 görev komisyonu',
    yurutmeBaslik: 'Yürütme Kurulu',
    yurutmeAciklama: 'OneTeam ekosistemini yönlendiren liderler',
    ke: 'Keşfet',
    copyright: '© 2026 Powered by OneTeam',
  },
  en: {
    anasayfa: 'Home',
    geri: 'Back',
    kicker: 'One Team',
    baslikSol: 'Entrepreneurship',
    baslikSag: 'Ecosystem',
    intro: 'A family setting out for health, prosperity and freedom, supporting aspiring entrepreneurs.',
    misyon: 'Mission',
    misyonMetin1: 'We believe a life full of health, prosperity and freedom is',
    misyonVurgu: ' possible for everyone',
    misyonMetin2: '. As the One Team family, we work together for this.',
    vizyon: 'Vision',
    vizyonMetin1: 'To become',
    vizyonVurgu: ' the world\'s largest and most influential ',
    vizyonMetin2: 'entrepreneurship ecosystem improving the lives of individuals and communities.',
    altKicker: 'Stronger Together',
    altMetin: 'One Team is one of the world’s most successful entrepreneur solidarity communities, founded by Amare leaders.',
    sekmelerKicker: 'Explore the Ecosystem',
    egitmenlerBaslik: 'Trainers',
    egitmenlerAciklama: 'Experts who join us to share their knowledge and experience',
    komisyonlarBaslik: 'Committees',
    komisyonlarAciklama: '11 task committees established by the Executive Board',
    yurutmeBaslik: 'Executive Board',
    yurutmeAciklama: 'The leaders guiding the OneTeam ecosystem',
    ke: 'Explore',
    copyright: '© 2026 Powered by OneTeam',
  },
  de: {
    anasayfa: 'Startseite',
    geri: 'Zurück',
    kicker: 'One Team',
    baslikSol: 'Unternehmer',
    baslikSag: 'Ökosystem',
    intro: 'Eine Familie auf dem Weg zu Gesundheit, Wohlstand und Freiheit – mit Unterstützung für angehende Unternehmer.',
    misyon: 'Mission',
    misyonMetin1: 'Wir glauben, ein Leben voller Gesundheit, Wohlstand und Freiheit ist',
    misyonVurgu: ' für jeden ',
    misyonMetin2: 'möglich. Als One Team-Familie arbeiten wir gemeinsam dafür.',
    vizyon: 'Vision',
    vizyonMetin1: 'Das',
    vizyonVurgu: ' weltweit größte und einflussreichste ',
    vizyonMetin2: 'Unternehmer-Ökosystem zu werden, das das Leben von Menschen und Gemeinschaften verbessert.',
    altKicker: 'Gemeinsam Stärker',
    altMetin: 'One Team ist eine der erfolgreichsten Unternehmer-Solidargemeinschaften der Welt, gegründet von Amare-Führungskräften.',
    sekmelerKicker: 'Erkunde das Ökosystem',
    egitmenlerBaslik: 'Trainer',
    egitmenlerAciklama: 'Experten, die ihr Wissen und ihre Erfahrung mit uns teilen',
    komisyonlarBaslik: 'Ausschüsse',
    komisyonlarAciklama: '11 Arbeitsausschüsse, die vom Exekutivausschuss eingerichtet wurden',
    yurutmeBaslik: 'Exekutivausschuss',
    yurutmeAciklama: 'Die Führungskräfte des OneTeam-Ökosystems',
    ke: 'Erkunden',
    copyright: '© 2026 Powered by OneTeam',
  },
  nl: {
    anasayfa: 'Home',
    geri: 'Terug',
    kicker: 'One Team',
    baslikSol: 'Ondernemers',
    baslikSag: 'Ecosysteem',
    intro: 'Een familie op weg naar gezondheid, welvaart en vrijheid — met steun voor aspirant-ondernemers.',
    misyon: 'Missie',
    misyonMetin1: 'Wij geloven dat een leven vol gezondheid, welvaart en vrijheid',
    misyonVurgu: ' voor iedereen ',
    misyonMetin2: 'mogelijk is. Als One Team-familie werken we hier samen aan.',
    vizyon: 'Visie',
    vizyonMetin1: 'Het',
    vizyonVurgu: ' grootste en meest invloedrijke ',
    vizyonMetin2: 'ondernemersecosysteem ter wereld worden dat het leven van individuen en gemeenschappen verbetert.',
    altKicker: 'Samen Sterker',
    altMetin: 'One Team is een van \'s werelds meest succesvolle ondernemers-solidariteitsgemeenschappen, opgericht door Amare-leiders.',
    sekmelerKicker: 'Ontdek het Ecosysteem',
    egitmenlerBaslik: 'Trainers',
    egitmenlerAciklama: 'Experts die hun kennis en ervaring delen',
    komisyonlarBaslik: 'Commissies',
    komisyonlarAciklama: '11 werkcommissies opgericht door het Uitvoerend Bestuur',
    yurutmeBaslik: 'Uitvoerend Bestuur',
    yurutmeAciklama: 'De leiders die het OneTeam-ecosysteem aansturen',
    ke: 'Verkennen',
    copyright: '© 2026 Powered by OneTeam',
  },
};

const HakkimizdaSayfasi = () => {
  const navigate = useNavigate();
  const geri = useSmartBack('/');
  const { lang } = useTranslation();
  const { user } = useAuth();
  const { takvim, konusmacilar } = useData();
  const duzenleyebilir = isSiteAdmin(user?.email);
  const { toast } = useToast();

  // #3 — İstatistikler (KonusmacilarSayfasi ile aynı mantık)
  const egitmenSayisi = useMemo(() => {
    const set = new Set();
    (konusmacilar || []).forEach(k => {
      const cid = makeCoreId(k.ad || k.id);
      if (cid) set.add(cid);
    });
    (takvim || []).forEach(e => {
      if (!e?.egitmen) return;
      String(e.egitmen).split(/[\/,&]/).map(s => s.trim()).filter(s => s.length > 1).forEach(ad => {
        const cid = makeCoreId(ad);
        if (cid) set.add(cid);
      });
    });
    return set.size || 115;
  }, [konusmacilar, takvim]);

  // #5 — Yürütme Kurulu lider yüzleri (önizleme için)
  const liderAvatarlar = useMemo(() => {
    const konusmacilarMap = {};
    (konusmacilar || []).forEach(k => { konusmacilarMap[k.id] = k; });
    return YURUTME_KURULU.slice(0, 6).map(u => {
      const cid = u.coreId || makeCoreId(u.ad);
      const k = konusmacilarMap[cid];
      return { ad: u.ad, coreId: cid, fotoURL: k?.fotoURL || null };
    });
  }, [konusmacilar]);

  // #5 — Eğitmen yüzleri (önizleme için)
  const egitmenAvatarlar = useMemo(() => {
    return (konusmacilar || []).slice(0, 6).map(k => ({
      ad: k.ad,
      coreId: k.id,
      fotoURL: k.fotoURL || null,
    }));
  }, [konusmacilar]);

  // #5 — Komisyon ikonları (önizleme için)
  const komisyonIkonlar = KOMISYONLAR.slice(0, 6);

  // Firestore'dan override içeriği oku — tek seferlik
  const [icerikOverride, setIcerikOverride] = useState(null);
  useEffect(() => {
    (async () => {
      const d = await getSiteIcerik('hakkimizda');
      if (d) setIcerikOverride(d);
    })();
  }, []);
  // Birleştir: Firestore TR alanları varsa onu kullan, yoksa I18N default
  const trBase = I18N.tr;
  const trMerged = icerikOverride?.tr ? { ...trBase, ...icerikOverride.tr } : trBase;
  const I18N_MERGED = { ...I18N, tr: trMerged };
  const tr = I18N_MERGED[lang] || I18N_MERGED.tr;

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({});
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const editeBasla = () => {
    setDraft({
      misyon: trMerged.misyon,
      misyonMetin1: trMerged.misyonMetin1,
      misyonVurgu: trMerged.misyonVurgu,
      misyonMetin2: trMerged.misyonMetin2,
      vizyon: trMerged.vizyon,
      vizyonMetin1: trMerged.vizyonMetin1,
      vizyonVurgu: trMerged.vizyonVurgu,
      vizyonMetin2: trMerged.vizyonMetin2,
    });
    setEditMode(true);
  };
  const iptal = () => { setEditMode(false); setDraft({}); };
  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await saveSiteIcerik('hakkimizda', { tr: draft }, user?.email);
      setIcerikOverride(prev => ({ ...(prev || {}), tr: { ...(prev?.tr || {}), ...draft } }));
      setEditMode(false);
      setDraft({});
      toast('Misyon & vizyon güncellendi', { type: 'success' });
    } catch (e) {
      toast('Kaydedemedik, tekrar dener misin?', { type: 'error' });
    } finally {
      setKaydediliyor(false);
    }
  };

  // Yürütme Kurulu + Komisyonlar verilerini prefetch — kullanıcı tıklarsa cache hazır
  // Sadece cache yoksa veya eskidiyse fetch et; idle-time'da çalıştır.
  useEffect(() => {
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const YK_KEY = 'amare_yurutme_konusmacilar_v1';
    const KOM_KEY = 'amare_komisyonlar_listing_v1';

    const isCacheTaze = (key) => {
      try {
        const c = JSON.parse(localStorage.getItem(key) || 'null');
        return c && Date.now() - (c.ts || 0) < TTL;
      } catch { return false; }
    };

    const prefetchYK = async () => {
      if (isCacheTaze(YK_KEY)) return;
      try {
        const snap = await getDocs(collection(db, 'konusmacilar'));
        const ykIds = new Set(YURUTME_KURULU.map(u => u.coreId || makeCoreId(u.ad)));
        const slim = {};
        snap.forEach(d => { if (ykIds.has(d.id)) slim[d.id] = { id: d.id, ...d.data() }; });
        const json = JSON.stringify({ data: slim, ts: Date.now() });
        if (json.length < 4.5 * 1024 * 1024) localStorage.setItem(YK_KEY, json);
      } catch { /* sessiz */ }
    };

    const prefetchKomisyonlar = async () => {
      if (isCacheTaze(KOM_KEY)) return;
      try {
        const snap = await getDocs(collection(db, 'komisyonlar'));
        const baskanlar = {};
        const icerikler = {};
        snap.forEach(d => {
          const data = d.data();
          const uyeler = Array.isArray(data.uyeler) ? data.uyeler : [];
          const b = uyeler.find(u => u.unvan === 'Komisyon Başkanı');
          if (b) baskanlar[d.id] = { ad: b.ad, coreId: b.coreId, unvan: b.unvan, fotoURL: b.fotoURL };
          icerikler[d.id] = { ozet: data.ozet || '', uyeSayisi: uyeler.length };
        });
        // Başkanların fresh fotosunu çek
        const coreIds = [...new Set(Object.values(baskanlar).map(b => b.coreId || makeCoreId(b.ad)).filter(Boolean))];
        const freshFotolar = {};
        await Promise.all(coreIds.map(async cid => {
          try {
            const ks = await getDoc(doc(db, 'konusmacilar', cid));
            if (ks.exists()) {
              const k = ks.data();
              if (k.fotoURL) freshFotolar[cid] = { fotoURL: k.fotoURL, ad: k.ad };
            }
          } catch {}
        }));
        const json = JSON.stringify({ baskanlar, icerikler, freshFotolar, ts: Date.now() });
        if (json.length < 4.5 * 1024 * 1024) localStorage.setItem(KOM_KEY, json);
      } catch { /* sessiz */ }
    };

    const runAll = () => { prefetchYK(); prefetchKomisyonlar(); };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(runAll, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(runAll, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* #8 Yıldız desen — çok ince, tüm sayfaya yayılı */}
      <div className="absolute inset-0 bg-stars opacity-25 pointer-events-none" />

      {/* Dekoratif altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={geri}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.geri || tr.anasayfa}
          </button>
          <div className="flex items-center gap-2">
            {duzenleyebilir && !editMode && (
              <button onClick={editeBasla}
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-md">
                <Edit3 className="w-3.5 h-3.5" /> Düzenle
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* Hakkımızda Edit Modal */}
        {editMode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-amber-400 to-orange-400 text-purple-900 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5" /> Misyon & Vizyon Düzenleme (TR)
                </h3>
                <button onClick={iptal} className="hover:bg-purple-900/10 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Misyon başlığı</label>
                  <input type="text" value={draft.misyon || ''}
                    onChange={(e) => setDraft(d => ({ ...d, misyon: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Misyon — başlangıç metni</label>
                  <textarea value={draft.misyonMetin1 || ''}
                    onChange={(e) => setDraft(d => ({ ...d, misyonMetin1: e.target.value }))}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Misyon — altın vurgu</label>
                  <input type="text" value={draft.misyonVurgu || ''}
                    onChange={(e) => setDraft(d => ({ ...d, misyonVurgu: e.target.value }))}
                    className="w-full bg-amber-50 border border-amber-200 text-amber-900 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Misyon — devam metni</label>
                  <textarea value={draft.misyonMetin2 || ''}
                    onChange={(e) => setDraft(d => ({ ...d, misyonMetin2: e.target.value }))}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div className="border-t border-gray-200 pt-5">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vizyon başlığı</label>
                  <input type="text" value={draft.vizyon || ''}
                    onChange={(e) => setDraft(d => ({ ...d, vizyon: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vizyon — başlangıç metni</label>
                  <textarea value={draft.vizyonMetin1 || ''}
                    onChange={(e) => setDraft(d => ({ ...d, vizyonMetin1: e.target.value }))}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vizyon — altın vurgu</label>
                  <input type="text" value={draft.vizyonVurgu || ''}
                    onChange={(e) => setDraft(d => ({ ...d, vizyonVurgu: e.target.value }))}
                    className="w-full bg-amber-50 border border-amber-200 text-amber-900 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vizyon — devam metni</label>
                  <textarea value={draft.vizyonMetin2 || ''}
                    onChange={(e) => setDraft(d => ({ ...d, vizyonMetin2: e.target.value }))}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400" />
                </div>
                <p className="text-xs text-gray-500 italic">
                  Not: Sadece TR (Türkçe) içerik düzenlenir. Diğer diller (EN/DE/NL) varsayılan metni kullanmaya devam eder.
                </p>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end gap-2 rounded-b-2xl">
                <button onClick={iptal} disabled={kaydediliyor}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">
                  İptal
                </button>
                <button onClick={kaydet} disabled={kaydediliyor}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md disabled:opacity-60">
                  {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* #1 + #6 HERO — Sinematik logo, manifesto-tonu intro */}
        <div className="text-center mb-12 sm:mb-16">
          {/* OneTeam logo — sinematik intro + halo nefes */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-amber-400/20 blur-3xl pointer-events-none animate-halo-breath" />
            <img
              src="/logos/oneteam-logo.png"
              alt="OneTeam"
              className="relative w-24 sm:w-28 md:w-32 h-auto animate-logo-cinema"
            />
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-4 animate-fade-in">
            <div className="h-px w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-5 leading-tight animate-fade-in">
            {tr.baslikSol} <span className="text-gold-shimmer font-bold">{tr.baslikSag}</span>
          </h1>

          {/* #1 — Manifesto tonlu intro */}
          <p className="text-purple-100/90 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto animate-fade-in italic">
            {tr.intro}
          </p>

          {/* #3 — Canlı sayılar */}
          <LiveCounter
            className="mt-6 sm:mt-8"
            items={[
              { deger: YURUTME_KURULU.length, etiket: 'Lider' },
              { deger: KOMISYONLAR.length, etiket: 'Komisyon' },
              { deger: egitmenSayisi, etiket: 'Eğitmen' },
              { deger: takvim?.length || 65, etiket: 'Eğitim', sonek: '+' },
            ]}
          />
        </div>

        {/* Ekosistem Sekmeleri — 3 EŞIT kart + avatar/ikon önizleme korunur */}
        <section className="mb-10 sm:mb-14">
          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 sm:w-16 bg-amber-400/50" />
            <span className="text-amber-300 text-[11px] sm:text-sm uppercase tracking-[0.5em] font-bold whitespace-nowrap">
              {tr.sekmelerKicker}
            </span>
            <div className="h-px w-12 sm:w-16 bg-amber-400/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* YÜRÜTME KURULU */}
            <button
              onClick={() => navigate('/yurutmekurulu')}
              className="group relative bg-gradient-to-br from-white/[0.10] to-white/[0.03] hover:from-white/[0.15] hover:to-white/[0.05] backdrop-blur-md border-2 border-amber-300/30 hover:border-amber-300/70 rounded-3xl p-6 sm:p-7 transition-all duration-300 spring-tap text-left shadow-2xl hover:shadow-amber-500/25 overflow-hidden hover:-translate-y-1 flex flex-col"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-400/10 group-hover:bg-amber-400/25 blur-3xl transition-colors pointer-events-none" />
              <div className="relative flex flex-col flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg mb-4 group-hover:scale-105 transition-transform">
                  <Crown className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
                </div>
                <h3 className="text-white font-bold text-xl sm:text-2xl mb-2 leading-tight">
                  {tr.yurutmeBaslik}
                </h3>
                <p className="text-purple-100/85 text-sm leading-relaxed mb-4 flex-1">
                  {tr.yurutmeAciklama}
                </p>
                {/* Lider yüzleri önizleme */}
                <div className="flex items-center justify-between pt-3 border-t border-amber-300/20">
                  <AvatarOverlap items={liderAvatarlar} max={4} size="w-8 h-8 sm:w-9 sm:h-9" />
                  <ArrowRight className="w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1.5" />
                </div>
              </div>
            </button>

            {/* KOMISYONLAR */}
            <button
              onClick={() => navigate('/komisyonlar')}
              className="group relative bg-gradient-to-br from-white/[0.10] to-white/[0.03] hover:from-white/[0.15] hover:to-white/[0.05] backdrop-blur-md border-2 border-amber-300/30 hover:border-amber-300/70 rounded-3xl p-6 sm:p-7 transition-all duration-300 spring-tap text-left shadow-2xl hover:shadow-amber-500/25 overflow-hidden hover:-translate-y-1 flex flex-col"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-400/10 group-hover:bg-amber-400/25 blur-3xl transition-colors pointer-events-none" />
              <div className="relative flex flex-col flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg mb-4 group-hover:scale-105 transition-transform">
                  <Building2 className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
                </div>
                <h3 className="text-white font-bold text-xl sm:text-2xl mb-2 leading-tight">
                  {tr.komisyonlarBaslik}
                </h3>
                <p className="text-purple-100/85 text-sm leading-relaxed mb-4 flex-1">
                  {tr.komisyonlarAciklama}
                </p>
                {/* Komisyon ikonları önizleme */}
                <div className="flex items-center justify-between pt-3 border-t border-amber-300/20">
                  <div className="flex items-center gap-1.5">
                    {komisyonIkonlar.slice(0, 4).map((k, i) => {
                      const Icon = k.icon;
                      return (
                        <div key={k.id} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-400/15 border border-amber-300/30 flex items-center justify-center"
                          style={{ opacity: 0.55 + (i * 0.1) }}>
                          <Icon className="w-3.5 h-3.5 text-amber-300" />
                        </div>
                      );
                    })}
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1.5" />
                </div>
              </div>
            </button>

            {/* EGITMENLER */}
            <button
              onClick={() => navigate('/konusmacilar')}
              className="group relative bg-gradient-to-br from-white/[0.10] to-white/[0.03] hover:from-white/[0.15] hover:to-white/[0.05] backdrop-blur-md border-2 border-amber-300/30 hover:border-amber-300/70 rounded-3xl p-6 sm:p-7 transition-all duration-300 spring-tap text-left shadow-2xl hover:shadow-amber-500/25 overflow-hidden hover:-translate-y-1 flex flex-col"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-400/10 group-hover:bg-amber-400/25 blur-3xl transition-colors pointer-events-none" />
              <div className="relative flex flex-col flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg mb-4 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
                </div>
                <h3 className="text-white font-bold text-xl sm:text-2xl mb-2 leading-tight">
                  {tr.egitmenlerBaslik}
                </h3>
                <p className="text-purple-100/85 text-sm leading-relaxed mb-4 flex-1">
                  {tr.egitmenlerAciklama}
                </p>
                {/* Eğitmen yüzleri önizleme */}
                <div className="flex items-center justify-between pt-3 border-t border-amber-300/20">
                  <AvatarOverlap items={egitmenAvatarlar} max={4} size="w-8 h-8 sm:w-9 sm:h-9" />
                  <ArrowRight className="w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1.5" />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* #2 — MİSYON: sayfanın kalbi, tam genişlik editorial */}
        <section className="mb-10 sm:mb-14">
          <div className="relative bg-gradient-to-br from-amber-500/[0.08] via-purple-900/30 to-white/[0.02] backdrop-blur-md border border-amber-300/30 rounded-3xl p-7 sm:p-10 overflow-hidden shadow-2xl">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-amber-400/12 blur-3xl pointer-events-none" />
            <div className="relative decorative-quote">
              <div className="flex items-center gap-3 mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg">
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
                </div>
                <div>
                  <div className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold mb-1">
                    Misyon
                  </div>
                  <div className="h-px w-16 bg-gradient-to-r from-amber-400/60 to-transparent" />
                </div>
              </div>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-light leading-tight tracking-tight">
                {tr.misyonMetin1}
                <span className="text-gold-shimmer font-bold text-2xl sm:text-3xl md:text-4xl">
                  {tr.misyonVurgu}
                </span>
                {tr.misyonMetin2}
              </p>
            </div>
          </div>
        </section>

        {/* #2 — VİZYON: sayfanın kalbi, tam genişlik editorial */}
        <section className="mb-10 sm:mb-14">
          <div className="relative bg-gradient-to-br from-purple-700/30 via-purple-900/30 to-amber-500/[0.06] backdrop-blur-md border border-amber-300/30 rounded-3xl p-7 sm:p-10 overflow-hidden shadow-2xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-400/12 blur-3xl pointer-events-none" />
            <div className="relative decorative-quote">
              <div className="flex items-center gap-3 mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg">
                  <Compass className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
                </div>
                <div>
                  <div className="text-amber-300 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold mb-1">
                    Vizyon
                  </div>
                  <div className="h-px w-16 bg-gradient-to-r from-amber-400/60 to-transparent" />
                </div>
              </div>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-light leading-tight tracking-tight">
                {tr.vizyonMetin1}
                <span className="text-gold-shimmer font-bold text-2xl sm:text-3xl md:text-4xl">
                  {tr.vizyonVurgu}
                </span>
                {tr.vizyonMetin2}
              </p>
            </div>
          </div>
        </section>

        {/* Bonus: Liderlerden Bir Söz / Manifesto */}
        <section className="mb-10 sm:mb-14">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-10 bg-amber-400/40" />
              <span className="text-amber-300/90 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold whitespace-nowrap inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                {tr.altKicker}
              </span>
              <div className="h-px w-10 bg-amber-400/40" />
            </div>
            <p className="text-purple-100/90 text-base sm:text-lg leading-relaxed italic">
              {tr.altMetin}
            </p>
          </div>
        </section>


        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-purple-300/60 text-xs tracking-wider">
            {tr.copyright}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HakkimizdaSayfasi;
