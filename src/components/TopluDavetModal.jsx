// Toplu davet modal — sponsor seçili üyelere magic link / WhatsApp gönderir
// Şablon: yeni / egitim / kontrol / custom

import React, { useEffect, useState } from 'react';
import { X, Mail, MessageCircle, Loader2, Check, AlertCircle, Send, Users, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SABLONLAR = [
  {
    kod: 'yeni',
    baslik: '🚀 Yeni Davet',
    ozet: 'Henüz site kullanıcısı değilse',
    preview: 'Selam {ad}, One Team Eğitim Takvimi\'ne seni davet ediyorum...',
  },
  {
    kod: 'egitim',
    baslik: '📚 Eğitim Hatırlat',
    ozet: 'Bu hafta yeni eğitimler var',
    preview: '{ad}, bu hafta kaçırma — yeni eğitimler eklendi...',
  },
  {
    kod: 'kontrol',
    baslik: '👋 Kontrol Et',
    ozet: 'Uzun süredir görüşmediysen',
    preview: '{ad}, bir süredir görüşmedik. Nasıl gidiyor?',
  },
  {
    kod: 'custom',
    baslik: '✏️ Özel Mesaj',
    ozet: 'Kendi yazını gönder',
    preview: '',
  },
];

const KANALLAR = [
  { kod: 'both', baslik: 'Email + WhatsApp', detay: 'Email varsa magic link, ayrıca WhatsApp linki' },
  { kod: 'email', baslik: 'Sadece Email', detay: 'Magic link ile direkt giriş' },
  { kod: 'whatsapp', baslik: 'Sadece WhatsApp', detay: 'wa.me ile mesaj hazırla' },
];

const TopluDavetModal = ({ acik, uyeler, onClose, onTamamlandi }) => {
  const { currentUser } = useAuth();
  const [sablon, setSablon] = useState('yeni');
  const [kanal, setKanal] = useState('both');
  const [customMesaj, setCustomMesaj] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (acik) {
      setSonuc(null);
      setHata('');
    }
  }, [acik]);

  if (!acik) return null;

  const emailli = uyeler.filter(u => u.emailVar).length;
  const whatsappli = uyeler.filter(u => u.phoneVar).length;
  const eksik = uyeler.filter(u => !u.emailVar && !u.phoneVar).length;

  async function gonder() {
    if (uyeler.length === 0) return;
    setGonderiliyor(true);
    setHata('');
    setSonuc(null);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/ekip-davet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amareIds: uyeler.map(u => u.amareId),
          sablon: sablon === 'custom' ? 'yeni' : sablon,
          kanal,
          mesaj: sablon === 'custom' ? customMesaj : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sistem hatası');
      setSonuc(data);
      onTamamlandi?.();
    } catch (e) {
      setHata(e.message);
    } finally {
      setGonderiliyor(false);
    }
  }

  // WhatsApp linklerini birer birer aç (popup blocker'a takılmamak için butonla)
  function waLinkAc(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function tumWaLinkleriAc() {
    if (!sonuc?.sonuc) return;
    const linkler = sonuc.sonuc
      .flatMap(s => s.kanallar || [])
      .filter(k => k.tip === 'whatsapp' && k.durum === 'hazir')
      .map(k => k.url);
    linkler.forEach((url, i) => setTimeout(() => waLinkAc(url), i * 400));
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[95dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-300" />
              Toplu Davet
            </h2>
            <p className="text-purple-200/70 text-xs mt-0.5">{uyeler.length} kişiye gönderilecek</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik — başarı ekranı veya seçim ekranı */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {sonuc ? (
            <SonucEkrani sonuc={sonuc} onWaAc={waLinkAc} onHepsiniAc={tumWaLinkleriAc} />
          ) : (
            <>
              {/* Ön analitik */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 text-center">
                  <div className="text-amber-200 font-extrabold text-xl">{emailli}</div>
                  <div className="text-amber-300/80 text-[10px] uppercase tracking-wider mt-1">Email</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-3 text-center">
                  <div className="text-emerald-200 font-extrabold text-xl">{whatsappli}</div>
                  <div className="text-emerald-300/80 text-[10px] uppercase tracking-wider mt-1">WhatsApp</div>
                </div>
                <div className="bg-rose-500/10 border border-rose-400/30 rounded-xl p-3 text-center">
                  <div className="text-rose-200 font-extrabold text-xl">{eksik}</div>
                  <div className="text-rose-300/80 text-[10px] uppercase tracking-wider mt-1">Eksik</div>
                </div>
              </div>

              {/* Şablon seç */}
              <div className="mb-5">
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider">Şablon</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SABLONLAR.map(s => (
                    <button key={s.kod} onClick={() => setSablon(s.kod)}
                      className={`text-left p-3 rounded-xl border-2 transition spring-tap ${
                        sablon === s.kod
                          ? 'bg-amber-400/15 border-amber-400/60'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                      <div className="text-white font-bold text-sm">{s.baslik}</div>
                      <div className="text-purple-200/70 text-[11px] mt-0.5">{s.ozet}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom mesaj */}
              {sablon === 'custom' && (
                <div className="mb-5">
                  <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider">Mesajın</div>
                  <textarea value={customMesaj} onChange={e => setCustomMesaj(e.target.value)}
                    rows={4} maxLength={600}
                    placeholder="Selam {ad}, ...&#10;&#10;{ad} → ön adı, {link} → magic link otomatik yerleşir"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60" />
                  <div className="text-purple-200/50 text-[10px] mt-1">
                    {customMesaj.length}/600 · {`{ad}`} = ön ad · {`{link}`} = magic link
                  </div>
                </div>
              )}

              {/* Kanal seç */}
              <div className="mb-5">
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider">Kanal</div>
                <div className="space-y-2">
                  {KANALLAR.map(k => (
                    <label key={k.kod}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        kanal === k.kod
                          ? 'bg-amber-400/15 border-amber-400/60'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                      <input type="radio" checked={kanal === k.kod} onChange={() => setKanal(k.kod)} className="hidden" />
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${kanal === k.kod ? 'border-amber-400' : 'border-white/40'}`}>
                        {kanal === k.kod && <div className="w-full h-full rounded-full bg-amber-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-sm">{k.baslik}</div>
                        <div className="text-purple-200/70 text-[11px] mt-0.5">{k.detay}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hedef üyeler listesi */}
              <div className="mb-2">
                <div className="text-white/90 text-xs font-bold mb-2 uppercase tracking-wider">Hedef ({uyeler.length})</div>
                <div className="max-h-32 overflow-y-auto bg-black/20 rounded-xl border border-white/10 p-2 space-y-1">
                  {uyeler.map(u => (
                    <div key={u.amareId} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <span className="text-white truncate flex-1">{u.adSoyad}</span>
                      <div className="flex gap-1">
                        {u.emailVar && <Mail className="w-3 h-3 text-amber-300" />}
                        {u.phoneVar && <MessageCircle className="w-3 h-3 text-emerald-300" />}
                        {!u.emailVar && !u.phoneVar && <AlertCircle className="w-3 h-3 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {hata && (
                <div className="mt-3 bg-rose-500/15 border border-rose-400/30 text-rose-100 text-xs rounded-xl px-3 py-2">
                  {hata}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2 flex-shrink-0">
          {sonuc ? (
            <button onClick={onClose}
              className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl spring-tap text-sm">
              Tamam
            </button>
          ) : (
            <>
              <button onClick={onClose} disabled={gonderiliyor}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl spring-tap text-sm disabled:opacity-50">
                İptal
              </button>
              <button onClick={gonder}
                disabled={gonderiliyor || uyeler.length === 0 || (sablon === 'custom' && customMesaj.length < 10)}
                className="flex-[2] bg-amber-400 hover:bg-amber-300 disabled:bg-white/20 disabled:text-white/50 text-purple-900 font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-2">
                {gonderiliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {gonderiliyor ? 'Gönderiliyor...' : `${uyeler.length} kişiye gönder`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sonuç ekranı ────────────────────────────────────────────────────────
const SonucEkrani = ({ sonuc, onWaAc, onHepsiniAc }) => {
  const { ozet, sonuc: detay } = sonuc;
  const waLinkler = detay.flatMap(s => s.kanallar || []).filter(k => k.tip === 'whatsapp' && k.durum === 'hazir');

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-3 text-center">
          <div className="text-emerald-200 font-extrabold text-2xl">{ozet.basarili}</div>
          <div className="text-emerald-300/80 text-[10px] uppercase tracking-wider mt-1">Başarılı</div>
        </div>
        <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl p-3 text-center">
          <div className="text-amber-200 font-extrabold text-2xl">{ozet.atlanan}</div>
          <div className="text-amber-300/80 text-[10px] uppercase tracking-wider mt-1">Atlandı</div>
        </div>
        <div className="bg-rose-500/15 border border-rose-400/30 rounded-xl p-3 text-center">
          <div className="text-rose-200 font-extrabold text-2xl">{ozet.hata}</div>
          <div className="text-rose-300/80 text-[10px] uppercase tracking-wider mt-1">Hata</div>
        </div>
      </div>

      {/* WhatsApp linkleri varsa toplu aç butonu */}
      {waLinkler.length > 0 && (
        <button onClick={onHepsiniAc}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl spring-tap text-sm inline-flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {waLinkler.length} WhatsApp linkini sırayla aç
        </button>
      )}

      {/* Detay */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {detay.map((s, i) => (
          <SonucSatir key={i} satir={s} onWaAc={onWaAc} />
        ))}
      </div>
    </div>
  );
};

const SonucSatir = ({ satir, onWaAc }) => {
  const renkler = {
    ok: { bg: 'bg-emerald-500/10 border-emerald-400/30', text: 'text-emerald-100', icon: <Check className="w-3.5 h-3.5 text-emerald-300" /> },
    skip: { bg: 'bg-amber-500/10 border-amber-400/30', text: 'text-amber-100', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-300" /> },
    fail: { bg: 'bg-rose-500/10 border-rose-400/30', text: 'text-rose-100', icon: <X className="w-3.5 h-3.5 text-rose-300" /> },
  }[satir.durum] || { bg: 'bg-white/5 border-white/10', text: 'text-white', icon: null };

  const wa = (satir.kanallar || []).find(k => k.tip === 'whatsapp' && k.durum === 'hazir');

  return (
    <div className={`${renkler.bg} border rounded-xl px-3 py-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {renkler.icon}
          <span className={`${renkler.text} text-xs font-semibold truncate`}>{satir.ad || satir.amareId}</span>
        </div>
        {wa && (
          <button onClick={() => onWaAc(wa.url)}
            className="bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 text-[10px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 spring-tap">
            <ExternalLink className="w-3 h-3" />WA
          </button>
        )}
      </div>
      {satir.sebep && (
        <div className={`${renkler.text} opacity-70 text-[10px] mt-1 ml-5.5`}>{satir.sebep}</div>
      )}
      {(satir.kanallar || []).map((k, i) => (
        k.durum !== 'hazir' && (
          <div key={i} className={`${renkler.text} opacity-70 text-[10px] mt-1 flex items-center gap-1.5 ml-5`}>
            {k.tip === 'email' ? <Mail className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
            <span>
              {k.tip}: {k.durum} {k.emailMask ? `(${k.emailMask})` : ''} {k.sebep || ''}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

export default TopluDavetModal;
