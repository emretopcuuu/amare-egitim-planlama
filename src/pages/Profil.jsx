// /profil — Tek scroll, 4 blok.
// Anonim kullanıcı → "Üye Girişi" CTA placeholder
// Login kullanıcı → Hero + Üyelik / Onboarding / Favoriler / Aktivite

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, LogIn, LogOut, Phone, Mail, Hash, CalendarDays, Award,
  MessageCircle, Heart, Video, Bell, Clock, ChevronRight, Loader2,
  RefreshCw, Trophy, TrendingUp,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import UyeGirisModal from '../components/UyeGirisModal';
import ProfilAvatar from '../components/ProfilAvatar';
import { egitmenFotosuBul } from '../utils/egitmenFotoMatch';
import { maskPhone, normalizePhoneForWa } from '../utils/mask';
import { useTakipEgitmenler } from '../utils/takip';

const PROFIL_CACHE_KEY = 'amare_profil_v1';
const PROFIL_CACHE_TTL = 5 * 60 * 1000; // 5dk

function loadProfilCache(amareId) {
  try {
    const raw = localStorage.getItem(PROFIL_CACHE_KEY + '_' + amareId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed._ts || 0) > PROFIL_CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}
function saveProfilCache(amareId, data) {
  try {
    localStorage.setItem(PROFIL_CACHE_KEY + '_' + amareId, JSON.stringify({ _ts: Date.now(), data }));
  } catch {}
}

function formatTarih(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

const Profil = () => {
  const navigate = useNavigate();
  const { currentUser, uid, isAnonymous, isAuthenticated, displayName, email, ready } = useAuth();
  const { konusmacilar } = useData();
  const { t } = useTranslation();
  const { takipSet } = useTakipEgitmenler();

  const [girisModalAcik, setGirisModalAcik] = useState(false);
  const [profilVerisi, setProfilVerisi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [userDoc, setUserDoc] = useState(null);
  const [abonelikler, setAbonelikler] = useState({ bulten: false, push: false, takip: 0 });
  const [hatirlatmalar, setHatirlatmalar] = useState([]);
  const [videoFav, setVideoFav] = useState(new Set());

  // Local favori eğitimler
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('amare_video_favoriler') || '[]');
      setVideoFav(new Set(arr));
    } catch {}
  }, []);

  // users/{uid} dinle — fotoURL, amareId, displayName güncel kalır
  useEffect(() => {
    if (!uid || isAnonymous) { setUserDoc(null); return; }
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUserDoc(snap.exists() ? snap.data() : null);
    }, (err) => console.warn('[profil] users snapshot err:', err.message));
    return () => unsub();
  }, [uid, isAnonymous]);

  // Profil-veri backend çağrısı
  const profilVerisiFetch = async (force = false) => {
    if (!currentUser || isAnonymous) return;
    const amareId = userDoc?.amareId;
    if (!amareId) return;

    // Cache
    if (!force) {
      const cached = loadProfilCache(amareId);
      if (cached) { setProfilVerisi(cached); return; }
    }

    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/profil-veri', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setHata(data.error || 'Profil verisi yüklenemedi');
        setProfilVerisi(null);
      } else {
        setProfilVerisi(data);
        saveProfilCache(amareId, data);
      }
    } catch (err) {
      console.error('[profil] fetch hata:', err);
      setHata(err.message || 'Bağlantı hatası');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (userDoc?.amareId) profilVerisiFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.amareId]);

  // Firestore — abonelikler + hatırlatmalar (email ile filtreli)
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const [bultenSnap, pushSnap, hatSnap] = await Promise.all([
          getDocs(query(collection(db, 'bulten_aboneleri'), where('email', '==', email))),
          getDocs(query(collection(db, 'web_push_aboneleri'), where('email', '==', email))),
          getDocs(query(collection(db, 'hatirlatmalar'), where('email', '==', email))),
        ]);
        setAbonelikler({
          bulten: !bultenSnap.empty,
          push: !pushSnap.empty,
          takip: takipSet.size,
        });
        setHatirlatmalar(hatSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('[profil] abonelik fetch:', e.message);
      }
    })();
  }, [email, takipSet.size]);

  // Avatar foto kaynağı (3 fallback)
  const fullName = profilVerisi?.amare?.full_name || profilVerisi?.member?.full_name || userDoc?.displayName || displayName || '';
  const userFoto = userDoc?.fotoURL || null;
  const egitmenFoto = useMemo(() => egitmenFotosuBul(fullName, konusmacilar), [fullName, konusmacilar]);
  const finalFoto = userFoto || egitmenFoto || null;

  // Career data parse
  const careerData = useMemo(() => {
    const cd = profilVerisi?.member?.career_data;
    if (!cd) return null;
    if (typeof cd === 'string') { try { return JSON.parse(cd); } catch { return null; } }
    return cd;
  }, [profilVerisi]);

  // Loading state — auth henüz hazır değilse
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Anonim placeholder
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 pb-24">
        <button onClick={() => navigate(-1)} className="text-purple-200 hover:text-white text-sm font-semibold inline-flex items-center gap-1 mb-6 mt-4">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="max-w-md mx-auto mt-12 bg-gradient-to-br from-purple-800/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white/20">
            <LogIn className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Profilini gör</h1>
          <p className="text-purple-200 text-sm mb-8 leading-relaxed">
            Favoriler, kurduğun hatırlatmalar, onboarding ilerlemen ve üyelik bilgilerin burada görünür.
          </p>
          <button onClick={() => setGirisModalAcik(true)}
            className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3.5 rounded-xl spring-tap inline-flex items-center justify-center gap-2 shadow-lg mb-3">
            <LogIn className="w-5 h-5" /> Üye Girişi Yap
          </button>
          <p className="text-purple-300/70 text-xs mt-4">
            Henüz Amare üyesi değilsen <a href="https://oneteamglobal.ai" className="text-amber-300 underline">oneteamglobal.ai</a>
          </p>
        </div>
        <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
      </div>
    );
  }

  // Login state — full profile
  const a = profilVerisi?.amare;
  const m = profilVerisi?.member;
  const u = profilVerisi?.uyelikSuresi;
  const sponsorAd = a?.sponsor_full_name;
  const sponsorTel = a?.sponsor_phone;
  const sponsorWa = normalizePhoneForWa(sponsorTel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-purple-200 hover:text-white text-sm font-semibold inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => profilVerisiFetch(true)} disabled={yukleniyor}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition disabled:opacity-50"
            title="Yenile">
            <RefreshCw className={`w-4 h-4 ${yukleniyor ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => signOut(auth).then(() => navigate('/takvim'))}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl transition"
            title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-4 pt-6 pb-8 text-center">
        <ProfilAvatar uid={uid} fullName={fullName} fotoURL={finalFoto} size="xl" editable={true} />
        <h1 className="text-2xl font-bold text-white mt-4">{fullName || 'Profilim'}</h1>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          {a?.rank && (
            <span className="inline-flex items-center gap-1 bg-amber-400/20 border border-amber-300/40 text-amber-100 px-3 py-1 rounded-full text-xs font-semibold">
              <Trophy className="w-3 h-3" /> {a.rank}
            </span>
          )}
          {u && (
            <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-purple-100 px-3 py-1 rounded-full text-xs font-semibold">
              <CalendarDays className="w-3 h-3" /> {u.yil > 0 ? `${u.yil} yıl ${u.ay} ay` : `${u.toplamAy} ay`} üye
            </span>
          )}
        </div>
        {hata && (
          <p className="text-red-300 text-xs mt-3 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 inline-block">
            {hata}
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* BLOK 1 — Üyelik bilgileri */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" /> Üyelik Bilgilerim
          </h2>
          <div className="space-y-2.5 text-sm">
            <InfoRow icon={Phone} label="Telefon" value={a?.phone || '—'} />
            <InfoRow icon={Mail} label="E-posta" value={a?.email || email || '—'} />
            <InfoRow icon={Hash} label="Amare ID" value={profilVerisi?.amareId || userDoc?.amareId || '—'} />
            <InfoRow icon={CalendarDays} label="Kayıt tarihi" value={formatTarih(a?.register_date)} />
          </div>

          {/* Sponsor */}
          {sponsorAd && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-purple-300/80 text-xs uppercase tracking-wider mb-2">Sponsorum</div>
              <div className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(sponsorAd || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{sponsorAd}</div>
                    <div className="text-purple-300/70 text-xs">{maskPhone(sponsorTel) || 'Telefon yok'}</div>
                  </div>
                </div>
                {sponsorWa && (
                  <a href={`https://wa.me/${sponsorWa}`} target="_blank" rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-400 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" /> İletişime geç
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* BLOK 2 — Onboarding kariyer planı (varsa) */}
        {(careerData || m?.onboarding_completed_at) && (
          <section className="bg-gradient-to-br from-amber-400/10 to-orange-500/10 backdrop-blur-md border border-amber-300/30 rounded-2xl p-5">
            <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Kariyer Planım
            </h2>
            {careerData && (
              <div className="space-y-2">
                {careerData.rank && (
                  <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-purple-300/80 text-xs">Hedef</div>
                      <div className="text-white font-bold text-lg">{careerData.rank}</div>
                    </div>
                    <Award className="w-8 h-8 text-amber-400" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {careerData.income && <Stat label="Aylık" value={`${careerData.income} TL`} />}
                  {careerData.time && <Stat label="Süre" value={careerData.time} />}
                  {careerData.hours && <Stat label="Günlük" value={careerData.hours} />}
                  {careerData.roi && <Stat label="ROI" value={`${careerData.roi} ay`} />}
                </div>
              </div>
            )}
            {m?.progress_pct != null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-200">Onboarding ilerleme</span>
                  <span className="text-amber-300 font-bold">%{m.progress_pct}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${m.progress_pct}%` }} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* BLOK 3 — Favorilerim */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" /> Favorilerim
          </h2>

          {/* Takip eğitmenleri */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm">Takip ettiğim eğitmenler</span>
              <span className="text-white font-bold text-sm">{takipSet.size}</span>
            </div>
            {takipSet.size > 0 ? (
              <button onClick={() => navigate('/konusmacilar?fav=1')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-400/70 text-xs italic">Henüz takip ettiğin eğitmen yok</p>
            )}
          </div>

          {/* Video favorileri */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm">Favori kayıtlı eğitimler</span>
              <span className="text-white font-bold text-sm">{videoFav.size}</span>
            </div>
            {videoFav.size > 0 ? (
              <button onClick={() => navigate('/kayitli-egitimler?fav=1')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-purple-100 text-sm font-semibold flex items-center justify-between transition">
                <span>Tümünü gör</span> <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-purple-400/70 text-xs italic">Henüz favori eğitimin yok</p>
            )}
          </div>
        </section>

        {/* BLOK 4 — Aktivitem */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" /> Aktivitem
          </h2>

          {/* Abonelikler */}
          <div className="space-y-2 mb-4">
            <AbonelikChip aktif={abonelikler.bulten} label="Haftalık bülten" onClick={() => navigate('/takvim?bulten=1')} />
            <AbonelikChip aktif={abonelikler.push} label="Web push bildirimi" onClick={() => navigate('/takvim?push=1')} />
            <AbonelikChip aktif={abonelikler.takip > 0} label={`Konuşmacı takip (${abonelikler.takip})`} onClick={() => navigate('/konusmacilar?fav=1')} />
          </div>

          {/* Hatırlatmalar */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-200 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Kurduğum hatırlatmalar
              </span>
              <span className="text-white font-bold text-sm">{hatirlatmalar.length}</span>
            </div>
            {hatirlatmalar.length === 0 ? (
              <p className="text-purple-400/70 text-xs italic">Henüz hatırlatma kurmadın</p>
            ) : (
              <div className="space-y-1.5">
                {hatirlatmalar.slice(0, 5).map(h => (
                  <div key={h.id} className="bg-white/5 rounded-lg px-3 py-2 text-xs">
                    <div className="text-white font-semibold truncate">{h.egitimAdi || h.title || 'Eğitim'}</div>
                    <div className="text-purple-300/70 mt-0.5">
                      {h.zaman ? new Date(h.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      {h.tip && <span className="ml-2 text-purple-400">• {h.tip}</span>}
                    </div>
                  </div>
                ))}
                {hatirlatmalar.length > 5 && (
                  <p className="text-purple-400/70 text-xs text-center mt-2">+{hatirlatmalar.length - 5} daha</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <UyeGirisModal acik={girisModalAcik} onClose={() => setGirisModalAcik(false)} />
    </div>
  );
};

// Helpers
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-1.5">
    <Icon className="w-4 h-4 text-purple-300 flex-shrink-0" />
    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
      <span className="text-purple-300/80 text-xs">{label}</span>
      <span className="text-white font-medium text-sm truncate">{value}</span>
    </div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg px-3 py-2">
    <div className="text-purple-300/70 text-[10px] uppercase tracking-wider">{label}</div>
    <div className="text-white font-bold text-sm mt-0.5">{value}</div>
  </div>
);

const AbonelikChip = ({ aktif, label, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
      aktif ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-100' : 'bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10'
    }`}>
    <span className="text-sm font-medium flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${aktif ? 'bg-emerald-400' : 'bg-purple-500/40'}`} />
      {label}
    </span>
    <ChevronRight className="w-4 h-4 opacity-60" />
  </button>
);

export default Profil;
