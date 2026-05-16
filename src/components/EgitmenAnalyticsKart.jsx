// Eğitmen analytics kartı — eğitmenin kendi profilinde gösterilir
// Sadece eğitmen kendisi veya admin görebilir

import React, { useEffect, useState } from 'react';
import { BarChart3, Eye, Star, MessageSquare, Clock, Tag, Loader2, Award, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EgitmenProfilDuzenleyici from './EgitmenProfilDuzenleyici';

const EgitmenAnalyticsKart = ({ coreId }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [duzenleyiciAcik, setDuzenleyiciAcik] = useState(false);

  useEffect(() => {
    if (!currentUser || isAnonymous || !coreId) {
      setYukleniyor(false);
      return;
    }
    (async () => {
      setYukleniyor(true);
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/.netlify/functions/egitmen-analytics?coreId=${encodeURIComponent(coreId)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) return; // Yetkisiz — sessizce gösterme
          throw new Error(data.error || 'Yüklenemedi');
        }
        setVeri(data);
      } catch (e) {
        setHata(e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [coreId, currentUser?.uid, isAnonymous]);

  if (yukleniyor) return null;
  if (hata || !veri) return null;
  if (veri.toplamVideo === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/30 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-indigo-300" />
        <div className="flex-1">
          <h3 className="text-white font-extrabold text-base">Eğitim İstatistiklerin</h3>
          <p className="text-indigo-200/70 text-[11px]">Sadece sen ve admin görebilir</p>
        </div>
        <button onClick={() => setDuzenleyiciAcik(true)}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg spring-tap inline-flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5" />Profili düzenle
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <Stat icon={<BarChart3 className="w-4 h-4" />} label="Video" value={veri.toplamVideo} />
        <Stat icon={<Eye className="w-4 h-4" />} label="İzlenme" value={formatNum(veri.toplamPlays)} />
        <Stat icon={<Star className="w-4 h-4" fill="currentColor" />} label="Puan" value={veri.ortalamaPuan ? `${veri.ortalamaPuan}/5` : '—'} />
        <Stat icon={<MessageSquare className="w-4 h-4" />} label="Yorum" value={veri.toplamYorum} />
      </div>

      {veri.ortalamaSure > 0 && (
        <div className="text-purple-200/70 text-[11px] mb-3 inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Ortalama video süresi: <strong className="text-white">{veri.ortalamaSureMetin}</strong>
        </div>
      )}

      {/* Top izlenen */}
      {veri.topIzlenen?.length > 0 && (
        <div className="mb-4">
          <div className="text-indigo-200/80 text-[10px] uppercase tracking-wider font-bold mb-2">En Çok İzlenen 5</div>
          <div className="space-y-1.5">
            {veri.topIzlenen.map((v, i) => (
              <div key={v.vimeoId} className="flex items-center gap-2 text-xs bg-black/20 rounded-lg p-2">
                <span className="text-amber-300 font-bold w-5 text-center">{i + 1}</span>
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="w-12 h-7 rounded object-cover" />
                ) : null}
                <span className="text-white flex-1 truncate">{v.baslik}</span>
                <span className="inline-flex items-center gap-1 text-white/70">
                  <Eye className="w-3 h-3" />{formatNum(v.plays)}
                </span>
                {v.puanSayisi > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    <Star className="w-3 h-3" fill="currentColor" />{v.puanOrt}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top kategoriler */}
      {veri.topKategoriler?.length > 0 && (
        <div>
          <div className="text-indigo-200/80 text-[10px] uppercase tracking-wider font-bold mb-2 inline-flex items-center gap-1">
            <Tag className="w-3 h-3" />Uzmanlık Alanların
          </div>
          <div className="flex flex-wrap gap-1.5">
            {veri.topKategoriler.map(k => (
              <span key={k.kategori} className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full">
                {k.kategori} <span className="text-white/50">({k.sayi})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Düzenleyici modal */}
      {duzenleyiciAcik && (
        <EgitmenProfilDuzenleyici coreId={coreId} onClose={() => setDuzenleyiciAcik(false)} />
      )}
    </div>
  );
};

const Stat = ({ icon, label, value }) => (
  <div className="bg-black/20 rounded-xl p-2.5 text-center">
    <div className="text-indigo-300 mx-auto mb-1 inline-flex">{icon}</div>
    <div className="text-white font-extrabold text-lg leading-none">{value}</div>
    <div className="text-purple-200/70 text-[9px] uppercase tracking-wider font-semibold mt-1">{label}</div>
  </div>
);

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export default EgitmenAnalyticsKart;
