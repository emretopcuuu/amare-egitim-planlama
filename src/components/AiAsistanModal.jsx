// AI sponsor asistanı modal — Gemini ile haftalık 3-5 öncelikli öneri

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Loader2, MessageCircle, Send, ExternalLink, RefreshCw, AlertCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EYLEM_META = {
  wp_mesaj:    { renk: 'emerald', etiket: '💬 WhatsApp', icon: MessageCircle },
  davet:       { renk: 'amber',   etiket: '🚀 Davet',     icon: Send },
  tebrik:      { renk: 'emerald', etiket: '🎉 Tebrik',    icon: Sparkles },
  egitim_oner: { renk: 'sky',     etiket: '📚 Eğitim',    icon: ExternalLink },
  rank_itki:   { renk: 'amber',   etiket: '🎯 Rank İtki', icon: Send },
  kontrol:     { renk: 'rose',    etiket: '⚠️ Kontrol',   icon: AlertCircle },
};

const RENK_MAP = {
  emerald: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100',
  amber:   'bg-amber-500/15 border-amber-400/40 text-amber-100',
  sky:     'bg-sky-500/15 border-sky-400/40 text-sky-100',
  rose:    'bg-rose-500/15 border-rose-400/40 text-rose-100',
};

const AiAsistanModal = ({ acik, ekip, onClose }) => {
  const { currentUser } = useAuth();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (acik && currentUser && !veri) cek(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, currentUser?.uid]);

  async function cek(force = false) {
    if (yukleniyor) return;
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/.netlify/functions/ekip-ai-asistan${force ? '?force=1' : ''}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail ? `${data.error || 'Hata'}: ${data.detail}` : (data.error || 'Yüklenemedi');
        throw new Error(msg);
      }
      setVeri(data);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  if (!acik) return null;

  const oneriler = veri?.oneriler || [];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[95dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              AI Asistan
            </h2>
            <p className="text-purple-200/70 text-xs mt-0.5">
              {veri?.cached ? `${veri.yas} dakika önce hesaplandı · 6 saatte bir yenilenir` : 'Bu hafta neyi öncelemelisin?'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {veri && (
              <button onClick={() => cek(true)} disabled={yukleniyor}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-xl spring-tap disabled:opacity-50"
                title="Yenile">
                <RefreshCw className={`w-4 h-4 ${yukleniyor ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {yukleniyor && !veri && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-purple-200 text-sm">AI ekibini analiz ediyor...</p>
              <p className="text-purple-300/60 text-[11px]">Gemini 2.5 Flash · ~10 saniye</p>
            </div>
          )}
          {hata && (
            <div className="bg-rose-500/15 border border-rose-400/30 text-rose-100 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{hata}</span>
            </div>
          )}
          {veri && oneriler.length === 0 && (
            <div className="text-center py-12 text-purple-300/70 text-sm">
              <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
              {veri.sebep || 'Şu an aksiyon önerisi yok'}
            </div>
          )}
          {oneriler.length > 0 && (
            <>
              <TopluWaButonu oneriler={oneriler} ekip={ekip} />
              <div className="space-y-3">
                {oneriler
                  .sort((a, b) => (a.oncelik || 5) - (b.oncelik || 5))
                  .map((o, i) => (
                    <OneriKart key={i} oneri={o} ekip={ekip} sira={i + 1} />
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <p className="text-purple-300/50 text-[10px] text-center">
            AI önerileri kişiselleşmiş analizdir — kararı sen ver. Veri kullanan üye sayın artıkça öneriler daha keskinleşir.
          </p>
        </div>
      </div>
    </div>
  );
};

// Tüm AI önerilerini WhatsApp linkleri olarak tek tek aç (popup blocker'dan kaçar)
const TopluWaButonu = ({ oneriler, ekip }) => {
  const [aciliyor, setAciliyor] = useState(false);
  const [acilan, setAcilan] = useState(0);

  // WhatsApp linki olabilenleri filtrele
  const waliOneriler = (oneriler || [])
    .filter(o => o.mesaj && (ekip || []).find(u => u.amareId === o.amareId)?.phone);

  if (waliOneriler.length < 2) return null;

  function hepsiniAc() {
    setAciliyor(true);
    setAcilan(0);
    waliOneriler.forEach((o, i) => {
      setTimeout(() => {
        const uye = (ekip || []).find(u => u.amareId === o.amareId);
        if (!uye) return;
        let wa = String(uye.phone || '').replace(/\D/g, '');
        if (wa.length === 11 && wa[0] === '0') wa = '90' + wa.slice(1);
        else if (wa.length === 10) wa = '90' + wa;
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(o.mesaj)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setAcilan(i + 1);
        if (i === waliOneriler.length - 1) {
          setTimeout(() => { setAciliyor(false); setAcilan(0); }, 1000);
        }
      }, i * 500); // 500ms gecikme — popup blocker'a karşı
    });
  }

  return (
    <button onClick={hepsiniAc} disabled={aciliyor}
      className="w-full mb-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
      <MessageCircle className="w-4 h-4" />
      {aciliyor
        ? `WhatsApp açılıyor... (${acilan}/${waliOneriler.length})`
        : `${waliOneriler.length} mesajı sırayla WhatsApp'ta aç`}
    </button>
  );
};

const OneriKart = ({ oneri, ekip, sira }) => {
  const meta = EYLEM_META[oneri.eylem] || EYLEM_META.wp_mesaj;
  const renkClass = RENK_MAP[meta.renk] || RENK_MAP.emerald;
  const uye = (ekip || []).find(u => u.amareId === oneri.amareId);
  const wa = uye?.phone ? String(uye.phone).replace(/\D/g, '') : null;
  const waUrl = wa && oneri.mesaj
    ? `https://wa.me/${wa.length === 11 && wa[0] === '0' ? '90' + wa.slice(1) : (wa.length === 10 ? '90' + wa : wa)}?text=${encodeURIComponent(oneri.mesaj)}`
    : null;

  const [kopyalandi, setKopyalandi] = useState(false);
  function kopyala() {
    navigator.clipboard?.writeText(oneri.mesaj || '');
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  }

  return (
    <div className={`${renkClass} border rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {sira}. öncelik {oneri.oncelik || 5}
          </span>
          <span className="text-white font-bold text-base">{oneri.ad}</span>
          <span className="bg-white/10 text-white/80 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
            {meta.etiket}
          </span>
        </div>
      </div>
      <p className="text-white/80 text-xs mb-3 leading-relaxed">{oneri.sebep}</p>
      {oneri.mesaj && (
        <div className="bg-black/30 border border-white/10 rounded-xl p-3 mb-3">
          <div className="text-white/50 text-[10px] uppercase tracking-wider font-bold mb-1">Önerilen mesaj</div>
          <p className="text-white text-xs leading-relaxed whitespace-pre-wrap">{oneri.mesaj}</p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-3 py-2 rounded-lg spring-tap inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />WhatsApp
          </a>
        )}
        {oneri.mesaj && (
          <button onClick={kopyala}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-lg spring-tap inline-flex items-center gap-1.5">
            {kopyalandi ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {kopyalandi ? 'Kopyalandı' : 'Mesajı kopyala'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AiAsistanModal;
