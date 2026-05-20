// Komisyon Detay Sayfası — /komisyonlar/:id
//
// Public görünüm: komisyonun ne yaptığı, üyeler, iletişim.
// Admin (Emre s.emretopcu@gmail.com) için inline edit modu.
// İçerik Firestore'da komisyonlar/{id} doc'unda saklanır.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Sparkles, Users, Edit3, Save, X, Plus, Trash2,
  Loader2, Phone, Lock, AlertCircle, CheckCircle2, Pencil, Hammer, ExternalLink, Award,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import KomisyonSoruFormu from '../components/KomisyonSoruFormu';
import { useData, makeCoreId } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { db, auth, googleProvider } from '../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getKomisyon, canEditKomisyon, turetAdminEmails } from '../utils/komisyonlar';

const I18N = {
  tr: {
    komisyonlar: 'Komisyonlar',
    duzenle: 'Düzenle',
    aktifKomisyon: 'Aktif Komisyon',
    kurulumAsamasinda: 'Kurulum Aşamasında',
    bulunamadiBaslik: 'Komisyon bulunamadı',
    bulunamadiMetin: 'Aradığınız komisyon mevcut değil.',
    geriDon: 'Komisyonlara Dön',
    iceriYukleniyor: 'İçerik yükleniyor...',
    neYapar: 'Bu Komisyon Ne Yapar?',
    ozetPlaceholder: 'Komisyonun genel açıklamasını yaz...',
    iceriYok: 'Henüz içerik eklenmemiş.',
    sorumluluk: 'Sorumluluk Alanları',
    maddeEkle: 'Madde Ekle',
    maddePlaceholder: 'Sorumluluk maddesi...',
    maddeYokDuzenle: '"Madde Ekle" ile sorumluluk alanları ekleyebilirsin.',
    maddeYok: 'Henüz madde eklenmemiş.',
    uyeler: 'Komisyon Üyeleri',
    uyeEkle: 'Üye Ekle',
    uyeYokDuzenle: '"Üye Ekle" ile komisyon üyelerini ekleyebilirsin.',
    uyeYok: 'Henüz üye eklenmemiş.',
    adPlaceholder: 'Ad Soyad',
    unvanPlaceholder: 'Unvan / Görev',
    telefonPlaceholder: 'Telefon (opsiyonel)',
    emailPlaceholder: 'E-posta (admin yetkisi için)',
    fotoUrlPlaceholder: 'Foto URL (opsiyonel)',
    uyeySil: 'Üyeyi sil',
    adminPaneli: 'Komisyon Admin Paneli',
    adminAciklama: 'Komisyon görevlileri için yönetim',
    adminGirisi: 'Admin Girişi',
    egitimAdminPaneli: 'Eğitim Takvimi Admin Paneli',
    egitimAdminAciklama: 'Eğitim takvimi ve eğitmen yönetimi',
    egitimAdminAc: 'Paneli Aç',
    uyeMi: 'Komisyon Üyesi misin?',
    uyeAciklama: 'Bu komisyonun üyesiysen Google hesabınla giriş yap, içerikleri düzenleyebilirsin.',
    googleGiris: 'Google ile Giriş Yap',
    yetkiYokBaslik: 'Yetkili olduğunuz komisyon değil',
    yetkiYokMetin: 'Bu komisyonun üyesi değilsin. Üyeyseniz başkanınızdan email kaydınızı talep edebilirsin.',
    kurulumBaslik: 'Bu Komisyon Kurulum Aşamasında',
    kurulumMetin: 'Komisyonun admin paneli ve detayları yakında aktif olacak.',
    duzenlemeModunda: 'Düzenleme modunda — değişiklikleri kaydet',
    iptal: 'İptal',
    kaydet: 'Kaydet',
    kaydediliyor: 'Kaydediliyor',
    kaydedildi: 'Kaydedildi',
    kayitHata: 'Kayıt başarısız: ',
  },
  en: {
    komisyonlar: 'Committees',
    duzenle: 'Edit',
    aktifKomisyon: 'Active Committee',
    kurulumAsamasinda: 'Being Established',
    bulunamadiBaslik: 'Committee not found',
    bulunamadiMetin: 'The committee you are looking for does not exist.',
    geriDon: 'Back to Committees',
    iceriYukleniyor: 'Loading content...',
    neYapar: 'What Does This Committee Do?',
    ozetPlaceholder: 'Write a general description of the committee...',
    iceriYok: 'No content yet.',
    sorumluluk: 'Areas of Responsibility',
    maddeEkle: 'Add Item',
    maddePlaceholder: 'Responsibility item...',
    maddeYokDuzenle: 'Add areas of responsibility with "Add Item".',
    maddeYok: 'No items yet.',
    uyeler: 'Committee Members',
    uyeEkle: 'Add Member',
    uyeYokDuzenle: 'Add committee members with "Add Member".',
    uyeYok: 'No members yet.',
    adPlaceholder: 'Full Name',
    unvanPlaceholder: 'Title / Role',
    telefonPlaceholder: 'Phone (optional)',
    emailPlaceholder: 'Email (for admin access)',
    fotoUrlPlaceholder: 'Photo URL (optional)',
    uyeySil: 'Remove member',
    adminPaneli: 'Committee Admin Panel',
    adminAciklama: 'Management for committee officers',
    adminGirisi: 'Admin Login',
    egitimAdminPaneli: 'Training Calendar Admin Panel',
    egitimAdminAciklama: 'Training calendar and trainer management',
    egitimAdminAc: 'Open Panel',
    uyeMi: 'Are you a committee member?',
    uyeAciklama: 'If you are a member of this committee, sign in with your Google account to edit content.',
    googleGiris: 'Sign in with Google',
    yetkiYokBaslik: 'Not authorized for this committee',
    yetkiYokMetin: 'You are not a member of this committee. If you are, please ask the chair to add your email.',
    kurulumBaslik: 'This Committee Is Being Established',
    kurulumMetin: 'The admin panel and details for this committee will be active soon.',
    duzenlemeModunda: 'Edit mode — save changes',
    iptal: 'Cancel',
    kaydet: 'Save',
    kaydediliyor: 'Saving',
    kaydedildi: 'Saved',
    kayitHata: 'Save failed: ',
  },
  de: {
    komisyonlar: 'Ausschüsse',
    duzenle: 'Bearbeiten',
    aktifKomisyon: 'Aktiver Ausschuss',
    kurulumAsamasinda: 'Im Aufbau',
    bulunamadiBaslik: 'Ausschuss nicht gefunden',
    bulunamadiMetin: 'Der gesuchte Ausschuss existiert nicht.',
    geriDon: 'Zurück zu Ausschüssen',
    iceriYukleniyor: 'Inhalt wird geladen...',
    neYapar: 'Was macht dieser Ausschuss?',
    ozetPlaceholder: 'Allgemeine Beschreibung des Ausschusses...',
    iceriYok: 'Noch kein Inhalt.',
    sorumluluk: 'Verantwortungsbereiche',
    maddeEkle: 'Eintrag hinzufügen',
    maddePlaceholder: 'Verantwortungseintrag...',
    maddeYokDuzenle: 'Mit "Eintrag hinzufügen" können Sie Bereiche hinzufügen.',
    maddeYok: 'Noch keine Einträge.',
    uyeler: 'Ausschussmitglieder',
    uyeEkle: 'Mitglied hinzufügen',
    uyeYokDuzenle: 'Mit "Mitglied hinzufügen" können Sie Mitglieder hinzufügen.',
    uyeYok: 'Noch keine Mitglieder.',
    adPlaceholder: 'Vor- und Nachname',
    unvanPlaceholder: 'Titel / Rolle',
    telefonPlaceholder: 'Telefon (optional)',
    emailPlaceholder: 'E-Mail (für Admin-Zugriff)',
    fotoUrlPlaceholder: 'Foto-URL (optional)',
    uyeySil: 'Mitglied entfernen',
    adminPaneli: 'Ausschuss-Admin-Panel',
    adminAciklama: 'Verwaltung für Ausschussverantwortliche',
    adminGirisi: 'Admin-Anmeldung',
    egitimAdminPaneli: 'Schulungskalender Admin-Panel',
    egitimAdminAciklama: 'Verwaltung von Schulungskalender und Trainern',
    egitimAdminAc: 'Panel öffnen',
    uyeMi: 'Sind Sie Ausschussmitglied?',
    uyeAciklama: 'Wenn Sie Mitglied dieses Ausschusses sind, melden Sie sich mit Google an, um Inhalte zu bearbeiten.',
    googleGiris: 'Mit Google anmelden',
    yetkiYokBaslik: 'Nicht autorisiert für diesen Ausschuss',
    yetkiYokMetin: 'Sie sind kein Mitglied dieses Ausschusses. Bitten Sie ggf. den Vorsitz, Ihre E-Mail einzutragen.',
    kurulumBaslik: 'Dieser Ausschuss befindet sich im Aufbau',
    kurulumMetin: 'Das Admin-Panel und die Details sind bald verfügbar.',
    duzenlemeModunda: 'Bearbeitungsmodus — Änderungen speichern',
    iptal: 'Abbrechen',
    kaydet: 'Speichern',
    kaydediliyor: 'Wird gespeichert',
    kaydedildi: 'Gespeichert',
    kayitHata: 'Speichern fehlgeschlagen: ',
  },
  nl: {
    komisyonlar: 'Commissies',
    duzenle: 'Bewerken',
    aktifKomisyon: 'Actieve Commissie',
    kurulumAsamasinda: 'In Opbouw',
    bulunamadiBaslik: 'Commissie niet gevonden',
    bulunamadiMetin: 'De gezochte commissie bestaat niet.',
    geriDon: 'Terug naar Commissies',
    iceriYukleniyor: 'Inhoud wordt geladen...',
    neYapar: 'Wat doet deze commissie?',
    ozetPlaceholder: 'Algemene beschrijving van de commissie...',
    iceriYok: 'Nog geen inhoud.',
    sorumluluk: 'Verantwoordelijkheidsgebieden',
    maddeEkle: 'Item toevoegen',
    maddePlaceholder: 'Verantwoordelijkheidsitem...',
    maddeYokDuzenle: 'Voeg gebieden toe met "Item toevoegen".',
    maddeYok: 'Nog geen items.',
    uyeler: 'Commissieleden',
    uyeEkle: 'Lid toevoegen',
    uyeYokDuzenle: 'Voeg leden toe met "Lid toevoegen".',
    uyeYok: 'Nog geen leden.',
    adPlaceholder: 'Volledige naam',
    unvanPlaceholder: 'Titel / Functie',
    telefonPlaceholder: 'Telefoon (optioneel)',
    emailPlaceholder: 'E-mail (voor admin-toegang)',
    fotoUrlPlaceholder: 'Foto-URL (optioneel)',
    uyeySil: 'Lid verwijderen',
    adminPaneli: 'Commissie Admin Paneel',
    adminAciklama: 'Beheer voor commissiebeheerders',
    adminGirisi: 'Admin Inloggen',
    egitimAdminPaneli: 'Trainingsagenda Admin Paneel',
    egitimAdminAciklama: 'Trainingsagenda en trainersbeheer',
    egitimAdminAc: 'Paneel openen',
    uyeMi: 'Bent u commissielid?',
    uyeAciklama: 'Als u lid bent van deze commissie, log in met Google om de inhoud te bewerken.',
    googleGiris: 'Inloggen met Google',
    yetkiYokBaslik: 'Niet bevoegd voor deze commissie',
    yetkiYokMetin: 'U bent geen lid van deze commissie. Indien wel, vraag de voorzitter om uw e-mailadres toe te voegen.',
    kurulumBaslik: 'Deze Commissie is in Opbouw',
    kurulumMetin: 'Het admin paneel en de details zijn binnenkort beschikbaar.',
    duzenlemeModunda: 'Bewerkmodus — wijzigingen opslaan',
    iptal: 'Annuleren',
    kaydet: 'Opslaan',
    kaydediliyor: 'Opslaan...',
    kaydedildi: 'Opgeslagen',
    kayitHata: 'Opslaan mislukt: ',
  },
};

const BOS_ICERIK = {
  ozet: '',
  yaptigiIsler: [],
  uyeler: [], // [{ ad, unvan, telefon?, email?, fotoURL?, coreId? }]
  adminEmails: [], // Firestore rules için türetilmiş email listesi
};

const KomisyonDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useData();
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;
  const user = currentUser;
  const k = useMemo(() => getKomisyon(id), [id]);

  const [icerik, setIcerik] = useState(BOS_ICERIK);
  const [orijinalIcerik, setOrijinalIcerik] = useState(BOS_ICERIK);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [duzenleme, setDuzenleme] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  // Konuşmacılar collection'ından güncel fotoğraflar (coreId → fotoURL)
  // Komisyon doc'unda saklanan snapshot foto'yu override eder
  const [freshFotolar, setFreshFotolar] = useState({});

  // Yetki kontrolü artık komisyon içeriğine de bakar (uyeler.email)
  const duzenleyebilir = canEditKomisyon(user?.email, icerik);

  // Firestore'dan içerik yükle
  useEffect(() => {
    if (!id) return;
    let iptal = false;
    (async () => {
      setYukleniyor(true);
      try {
        const snap = await getDoc(doc(db, 'komisyonlar', id));
        const data = snap.exists() ? snap.data() : BOS_ICERIK;
        const normalize = {
          ozet: data.ozet || '',
          yaptigiIsler: Array.isArray(data.yaptigiIsler) ? data.yaptigiIsler : [],
          uyeler: Array.isArray(data.uyeler) ? data.uyeler : [],
          adminEmails: Array.isArray(data.adminEmails) ? data.adminEmails : [],
        };
        if (!iptal) {
          setIcerik(normalize);
          setOrijinalIcerik(normalize);
        }
      } catch (e) {
        console.warn('[komisyon-detay] icerik yuklenemedi:', e.message);
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [id]);

  // Üyenin etkili coreId'si — kaydedilmiş yoksa ad'dan üret
  const getEffectiveCoreId = (u) => u?.coreId || makeCoreId(u?.ad) || null;

  // Üyelerin güncel fotoğraflarını konuşmacılar collection'ından çek
  // (komisyon doc'undaki fotoURL eski olabilir — konuşmacı tarafı güncellenince burası da güncellensin)
  useEffect(() => {
    const coreIds = [...new Set(
      (icerik.uyeler || []).map(u => getEffectiveCoreId(u)).filter(Boolean)
    )];
    if (coreIds.length === 0) return;
    let iptal = false;
    (async () => {
      const map = {};
      await Promise.all(coreIds.map(async (cid) => {
        try {
          const snap = await getDoc(doc(db, 'konusmacilar', cid));
          if (snap.exists()) {
            const k = snap.data();
            if (k.fotoURL) map[cid] = { fotoURL: k.fotoURL, ad: k.ad };
          }
        } catch {}
      }));
      if (!iptal) setFreshFotolar(map);
    })();
    return () => { iptal = true; };
  }, [icerik.uyeler?.length, (icerik.uyeler || []).map(u => getEffectiveCoreId(u)).join(',')]);

  // Üyenin güncel fotoğrafı (varsa konuşmacılar'dan, yoksa snapshot)
  const getUyeFoto = (u) => {
    const cid = getEffectiveCoreId(u);
    return (cid && freshFotolar[cid]?.fotoURL) || u?.fotoURL || null;
  };

  // Komisyon bulunamadıysa
  if (!k) {
    return (
      <div className="min-h-[100dvh] bg-purple-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{tr.bulunamadiBaslik}</h2>
          <p className="text-purple-200 mb-6">{tr.bulunamadiMetin}</p>
          <button onClick={() => navigate('/komisyonlar')}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 px-5 py-2.5 rounded-xl font-bold spring-tap">
            {tr.geriDon}
          </button>
        </div>
      </div>
    );
  }

  const Icon = k.icon;

  const kaydet = async () => {
    if (!duzenleyebilir) return;
    setKaydediliyor(true);
    setMesaj(null);
    try {
      // adminEmails'i uyeler.email'lerinden otomatik türet (Firestore rules için)
      const adminEmails = turetAdminEmails(icerik.uyeler);
      const yeniIcerik = { ...icerik, adminEmails };
      await setDoc(doc(db, 'komisyonlar', id), {
        ...yeniIcerik,
        guncellemeTarihi: serverTimestamp(),
        guncelleyenEmail: user?.email,
      }, { merge: true });
      setOrijinalIcerik(yeniIcerik);
      setIcerik(yeniIcerik);
      setDuzenleme(false);
      setMesaj({ tip: 'ok', metin: tr.kaydedildi });
      setTimeout(() => setMesaj(null), 3000);
    } catch (e) {
      console.error('[komisyon-detay] kaydet:', e);
      setMesaj({ tip: 'hata', metin: tr.kayitHata + e.message });
    } finally {
      setKaydediliyor(false);
    }
  };

  const iptal = () => {
    setIcerik(orijinalIcerik);
    setDuzenleme(false);
    setMesaj(null);
  };

  // Google ile giriş — komisyon admin paneli için
  const komisyonGiris = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // currentUser otomatik güncellenir; duzenleyebilir useEffect ile yenilenir
    } catch (e) {
      console.error('[komisyon-giris]:', e);
      setMesaj({ tip: 'hata', metin: 'Giriş başarısız: ' + (e.message || '').slice(0, 80) });
    }
  };

  // Yaptığı işler listesi yardımcıları
  const isEkle = () => setIcerik(p => ({ ...p, yaptigiIsler: [...p.yaptigiIsler, ''] }));
  const isSil = (i) => setIcerik(p => ({ ...p, yaptigiIsler: p.yaptigiIsler.filter((_, idx) => idx !== i) }));
  const isGuncelle = (i, v) => setIcerik(p => ({
    ...p,
    yaptigiIsler: p.yaptigiIsler.map((s, idx) => idx === i ? v : s),
  }));

  // Üye yardımcıları
  const uyeEkle = () => setIcerik(p => ({ ...p, uyeler: [...p.uyeler, { ad: '', unvan: '', telefon: '' }] }));
  const uyeSil = (i) => setIcerik(p => ({ ...p, uyeler: p.uyeler.filter((_, idx) => idx !== i) }));
  const uyeGuncelle = (i, alan, v) => setIcerik(p => ({
    ...p,
    uyeler: p.uyeler.map((u, idx) => {
      if (idx !== i) return u;
      const yeni = { ...u, [alan]: v };
      // Ad değişince coreId otomatik üret — fotoğraf eşlemesi için
      if (alan === 'ad') yeni.coreId = makeCoreId(v) || null;
      return yeni;
    }),
  }));
  // Üye sırasını değiştir (swap)
  const uyeYukari = (i) => setIcerik(p => {
    if (i === 0) return p;
    const yeni = [...p.uyeler];
    [yeni[i - 1], yeni[i]] = [yeni[i], yeni[i - 1]];
    return { ...p, uyeler: yeni };
  });
  const uyeAsagi = (i) => setIcerik(p => {
    if (i === p.uyeler.length - 1) return p;
    const yeni = [...p.uyeler];
    [yeni[i + 1], yeni[i]] = [yeni[i], yeni[i + 1]];
    return { ...p, uyeler: yeni };
  });

  const renkSinifi = {
    amber: 'from-amber-400/30 to-amber-600/15 border-amber-300/50',
    blue: 'from-blue-400/30 to-blue-600/15 border-blue-300/50',
    emerald: 'from-emerald-400/30 to-emerald-600/15 border-emerald-300/50',
    cyan: 'from-cyan-400/30 to-cyan-600/15 border-cyan-300/50',
    rose: 'from-rose-400/30 to-rose-600/15 border-rose-300/50',
    indigo: 'from-indigo-400/30 to-indigo-600/15 border-indigo-300/50',
    purple: 'from-purple-400/30 to-purple-600/15 border-purple-300/50',
    green: 'from-green-400/30 to-green-600/15 border-green-300/50',
    slate: 'from-slate-400/30 to-slate-600/15 border-slate-300/50',
    orange: 'from-orange-400/30 to-orange-600/15 border-orange-300/50',
  }[k.renk] || 'from-amber-400/30 to-amber-600/15 border-amber-300/50';

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Dekor */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-32 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={() => navigate('/komisyonlar')}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.komisyonlar}
          </button>
          <div className="flex items-center gap-2">
            {/* Düzenle butonu — sadece Emre görür */}
            {duzenleyebilir && !duzenleme && (
              <button onClick={() => setDuzenleme(true)}
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 px-3 py-2 rounded-full text-xs font-bold transition spring-tap shadow-lg">
                <Pencil className="w-3.5 h-3.5" /> {tr.duzenle}
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* HERO */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in">
          {/* Komisyon iconu + OneTeam rozeti */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-amber-400/25 blur-3xl pointer-events-none" />
            <div className={`relative inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br ${renkSinifi} border-2 backdrop-blur-md shadow-2xl`}>
              <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
            </div>
            {/* OneTeam mini rozet */}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-purple-900 border-2 border-purple-700 overflow-hidden flex items-center justify-center shadow-xl">
              <img src="/logos/oneteam-logo.png" alt="OneTeam" className="w-7 h-7 object-contain" />
            </div>
          </div>

          {/* Aktif rozeti */}
          {k.aktif ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-emerald-200 text-[11px] uppercase tracking-wider font-bold">{tr.aktifKomisyon}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
              <Lock className="w-3 h-3 text-purple-200" />
              <span className="text-purple-200 text-[11px] uppercase tracking-wider font-bold">{tr.kurulumAsamasinda}</span>
            </div>
          )}

          {/* Başlık */}
          <h1 className="text-2xl sm:text-4xl font-light text-white tracking-tight mb-3 leading-tight">
            {k.ad}
          </h1>

          <p className="text-purple-100/90 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {k.tagline}
          </p>
        </div>

        {/* Mesaj banner */}
        {mesaj && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
            mesaj.tip === 'ok'
              ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-200'
              : 'bg-rose-500/15 border border-rose-400/40 text-rose-200'
          }`}>
            {mesaj.tip === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {mesaj.metin}
          </div>
        )}

        {yukleniyor ? (
          <div className="text-center py-12 text-purple-200">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            {tr.iceriYukleniyor}
          </div>
        ) : (
          <>
            {/* Bu Komisyon Ne Yapar */}
            <section className="mb-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h2 className="text-white font-bold text-lg sm:text-xl">{tr.neYapar}</h2>
              </div>
              {duzenleme ? (
                <textarea
                  value={icerik.ozet}
                  onChange={(e) => setIcerik(p => ({ ...p, ozet: e.target.value }))}
                  rows={5}
                  placeholder={tr.ozetPlaceholder}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm leading-relaxed placeholder-purple-300/40 focus:border-amber-400/60 outline-none resize-y"
                />
              ) : icerik.ozet ? (
                <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {icerik.ozet}
                </p>
              ) : (
                <p className="text-purple-300/50 text-sm italic">
                  {tr.iceriYok}
                </p>
              )}
            </section>

            {/* Sorumluluk Alanları */}
            <section className="mb-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <h2 className="text-white font-bold text-lg sm:text-xl">{tr.sorumluluk}</h2>
                </div>
                {duzenleme && (
                  <button onClick={isEkle}
                    className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 spring-tap">
                    <Plus className="w-3 h-3" /> {tr.maddeEkle}
                  </button>
                )}
              </div>
              {icerik.yaptigiIsler.length > 0 ? (
                <ul className="space-y-2">
                  {icerik.yaptigiIsler.map((is, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-amber-300 text-xs font-bold">{i + 1}</span>
                      </div>
                      {duzenleme ? (
                        <>
                          <input
                            value={is}
                            onChange={(e) => isGuncelle(i, e.target.value)}
                            placeholder={tr.maddePlaceholder}
                            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm placeholder-purple-300/40 focus:border-amber-400/60 outline-none"
                          />
                          <button onClick={() => isSil(i)}
                            className="text-rose-300 hover:text-rose-200 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-purple-100/90 text-sm sm:text-base leading-relaxed flex-1">{is}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-purple-300/50 text-sm italic">
                  {duzenleme ? tr.maddeYokDuzenle : tr.maddeYok}
                </p>
              )}
            </section>

            {/* Komisyon Üyeleri */}
            <section className="mb-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-200" />
                  <h2 className="text-white font-bold text-lg sm:text-xl">{tr.uyeler}</h2>
                  {icerik.uyeler.length > 0 && (
                    <span className="bg-white/10 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {icerik.uyeler.length}
                    </span>
                  )}
                </div>
                {duzenleme && (
                  <button onClick={uyeEkle}
                    className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 spring-tap">
                    <Plus className="w-3 h-3" /> {tr.uyeEkle}
                  </button>
                )}
              </div>

              {icerik.uyeler.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {icerik.uyeler.map((u, i) => {
                    const baskanMi = u.unvan === 'Komisyon Başkanı';
                    return (
                    <div key={i} className={`bg-white/5 border rounded-xl p-4 flex items-start gap-3 ${
                      baskanMi ? 'border-amber-300/40 bg-gradient-to-br from-amber-400/10 to-transparent' : 'border-white/15'
                    }`}>
                      {/* Avatar — güncel fotoğraf (konuşmacılar'dan) varsa göster, yoksa initial */}
                      <div className="relative w-14 h-14 flex-shrink-0">
                        {getUyeFoto(u) ? (
                          <img src={getUyeFoto(u)} alt={u.ad}
                            loading="lazy" decoding="async"
                            className="w-14 h-14 rounded-full object-cover border-2 border-amber-300/40 shadow-md"
                            style={{ objectPosition: 'center 25%' }} />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/20 border-2 border-amber-300/30 flex items-center justify-center">
                            <span className="text-amber-200 font-bold text-base">
                              {(u.ad || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {/* Başkan rozeti */}
                        {baskanMi && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-purple-900 flex items-center justify-center shadow-md">
                            <Award className="w-3 h-3 text-purple-900" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {duzenleme ? (
                          <div className="space-y-1.5">
                            <input
                              value={u.ad}
                              onChange={(e) => uyeGuncelle(i, 'ad', e.target.value)}
                              placeholder={tr.adPlaceholder}
                              className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-sm placeholder-purple-300/40 outline-none focus:border-amber-400/60"
                            />
                            <input
                              value={u.unvan || ''}
                              onChange={(e) => uyeGuncelle(i, 'unvan', e.target.value)}
                              placeholder={tr.unvanPlaceholder}
                              className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-purple-200 text-xs placeholder-purple-300/40 outline-none focus:border-amber-400/60"
                            />
                            <input
                              value={u.telefon || ''}
                              onChange={(e) => uyeGuncelle(i, 'telefon', e.target.value)}
                              placeholder={tr.telefonPlaceholder}
                              className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-purple-200 text-xs placeholder-purple-300/40 outline-none focus:border-amber-400/60"
                            />
                            <input
                              type="email"
                              value={u.email || ''}
                              onChange={(e) => uyeGuncelle(i, 'email', e.target.value)}
                              placeholder={tr.emailPlaceholder}
                              className="w-full bg-white/5 border border-amber-300/30 rounded px-2 py-1 text-amber-100 text-xs placeholder-amber-300/40 outline-none focus:border-amber-400/80"
                            />
                            <input
                              value={u.fotoURL || ''}
                              onChange={(e) => uyeGuncelle(i, 'fotoURL', e.target.value)}
                              placeholder={tr.fotoUrlPlaceholder}
                              className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-purple-200 text-xs placeholder-purple-300/40 outline-none focus:border-amber-400/60"
                            />
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <button onClick={() => uyeSil(i)}
                                className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 text-xs">
                                <Trash2 className="w-3 h-3" /> {tr.uyeySil}
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => uyeYukari(i)} disabled={i === 0}
                                  title="Yukarı"
                                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border border-white/15">
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => uyeAsagi(i)} disabled={i === icerik.uyeler.length - 1}
                                  title="Aşağı"
                                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border border-white/15">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-white font-bold text-sm truncate">{u.ad || '—'}</div>
                            {u.unvan && <div className={`text-xs truncate font-semibold ${baskanMi ? 'text-amber-300' : 'text-amber-300/80'}`}>{u.unvan}</div>}
                            {u.telefon && (
                              <a href={`tel:${u.telefon}`} className="inline-flex items-center gap-1 text-purple-200 text-xs hover:text-amber-300 mt-1">
                                <Phone className="w-3 h-3" /> {u.telefon}
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              ) : (
                <p className="text-purple-300/50 text-sm italic">
                  {duzenleme ? tr.uyeYokDuzenle : tr.uyeYok}
                </p>
              )}
            </section>

            {/* İletişim / Soru Formu — düşük eşik etkileşim */}
            <KomisyonSoruFormu komisyonId={id} komisyonAd={k.ad} />

            {/* Komisyon Admin Girişi — TÜM komisyonlar için, 3 duruma göre */}
            {!duzenleyebilir && (
              <section className="mb-8 bg-gradient-to-br from-amber-400/15 to-amber-600/5 border border-amber-300/30 rounded-2xl p-6 shadow-xl">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {!user ? (
                      <>
                        <h3 className="text-white font-bold text-base mb-1">{tr.uyeMi}</h3>
                        <p className="text-purple-200/80 text-xs mb-3">{tr.uyeAciklama}</p>
                        <button onClick={komisyonGiris}
                          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg spring-tap">
                          {tr.googleGiris} <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-white font-bold text-base mb-1">{tr.yetkiYokBaslik}</h3>
                        <p className="text-purple-200/80 text-xs">{tr.yetkiYokMetin}</p>
                        <p className="text-amber-300/70 text-[11px] mt-2 font-mono">
                          {user.email}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Eğitim Takvimi Admin Paneli — sadece Eğitim Komisyonu, yetkili user için */}
            {duzenleyebilir && k.aktif && k.adminRota && (
              <section className="mb-8 bg-gradient-to-br from-emerald-400/15 to-teal-600/5 border border-emerald-300/30 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">{tr.egitimAdminPaneli}</h3>
                      <p className="text-purple-200/80 text-xs">{tr.egitimAdminAciklama}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(k.adminRota)}
                    className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-purple-900 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg spring-tap">
                    {tr.egitimAdminAc} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* Kurulum aşamasında bilgi — sadece pasif + yetkisiz user için */}
            {!k.aktif && !duzenleyebilir && !user && (
              <section className="mb-8 bg-white/5 border border-white/15 rounded-2xl p-6 text-center">
                <Hammer className="w-10 h-10 text-amber-300 mx-auto mb-3 opacity-70" />
                <h3 className="text-white font-bold text-lg mb-1">{tr.kurulumBaslik}</h3>
                <p className="text-purple-200/70 text-sm">
                  {tr.kurulumMetin}
                </p>
              </section>
            )}
          </>
        )}

        {/* Düzenle modu — sticky alt bar */}
        {duzenleme && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-purple-950/95 backdrop-blur-md border-t border-amber-400/30 shadow-2xl">
            <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-semibold">
                <Edit3 className="w-4 h-4" />
                {tr.duzenlemeModunda}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={iptal} disabled={kaydediliyor}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 spring-tap disabled:opacity-50">
                  <X className="w-4 h-4" /> {tr.iptal}
                </button>
                <button onClick={kaydet} disabled={kaydediliyor}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-900 px-5 py-2 rounded-xl text-sm font-bold spring-tap shadow-lg disabled:opacity-50">
                  {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {kaydediliyor ? tr.kaydediliyor : tr.kaydet}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KomisyonDetay;
