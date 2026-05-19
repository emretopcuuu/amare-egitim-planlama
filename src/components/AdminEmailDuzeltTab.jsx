// Admin: Email Düzeltme Talepleri
// Bozuk/eksik email Supabase'de olan kullanıcıların talep listesi.
// Admin onaylar → Supabase service_role ile güncellenir.

import React, { useEffect, useState } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Mail, Loader2, Check, X as XIcon, RotateCw, Phone, User, AlertCircle, CheckCircle2, Clock, Hash } from 'lucide-react';

const AdminEmailDuzeltTab = () => {
  const [talepler, setTalepler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('beklemede'); // beklemede | onaylandi | reddedildi | tumu
  const [islemTalepId, setIslemTalepId] = useState(null);
  const [sonIslem, setSonIslem] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'email_duzeltme_talepleri'), orderBy('olusturulmaTarihi', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTalepler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setYukleniyor(false);
    }, (err) => {
      console.warn('[email-duzelt] err:', err.message);
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const islem = async (talepId, aksiyon) => {
    if (!confirm(`Bu talep ${aksiyon === 'onayla' ? 'ONAYLANACAK ve Supabase güncellenecek' : 'REDDEDİLECEK'}. Emin misin?`)) return;
    setIslemTalepId(talepId);
    setSonIslem(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/admin-email-duzelt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ talepId, aksiyon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'İşlem hatası');
      setSonIslem({
        ok: true,
        msg: aksiyon === 'onayla'
          ? `✓ Onaylandı — ${data.guncellenenler} Supabase kaydı güncellendi`
          : '✓ Reddedildi',
      });
    } catch (e) {
      setSonIslem({ ok: false, msg: '✗ ' + e.message });
    } finally {
      setIslemTalepId(null);
      setTimeout(() => setSonIslem(null), 5000);
    }
  };

  const filtrelenmis = talepler.filter(t => filtre === 'tumu' || t.durum === filtre);

  const istatistik = {
    beklemede: talepler.filter(t => t.durum === 'beklemede').length,
    onaylandi: talepler.filter(t => t.durum === 'onaylandi').length,
    reddedildi: talepler.filter(t => t.durum === 'reddedildi').length,
  };

  if (yukleniyor) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Talepler yükleniyor...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-amare-purple" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Email Düzeltme Talepleri</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Kullanıcı email'i Supabase'de bozuk/yok ise buradan talep eder. Onayda Supabase güncellenir.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Toplam: <strong>{talepler.length}</strong></span>
            {istatistik.beklemede > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                {istatistik.beklemede} bekleyen
              </span>
            )}
          </div>
        </div>

        {/* Filtre chip'leri */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { kod: 'beklemede', label: `Beklemede (${istatistik.beklemede})`, renk: 'amber' },
            { kod: 'onaylandi', label: `Onaylanan (${istatistik.onaylandi})`, renk: 'emerald' },
            { kod: 'reddedildi', label: `Reddedilen (${istatistik.reddedildi})`, renk: 'rose' },
            { kod: 'tumu', label: 'Tümü', renk: 'slate' },
          ].map(f => {
            const aktif = filtre === f.kod;
            const aktifRenk = {
              amber: 'bg-amber-500 text-white',
              emerald: 'bg-emerald-500 text-white',
              rose: 'bg-rose-500 text-white',
              slate: 'bg-gray-700 text-white',
            }[f.renk];
            return (
              <button key={f.kod} onClick={() => setFiltre(f.kod)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  aktif ? aktifRenk + ' shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Son işlem mesajı */}
        {sonIslem && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            sonIslem.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {sonIslem.msg}
          </div>
        )}

        {/* Liste */}
        {filtrelenmis.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>{filtre === 'beklemede' ? 'Bekleyen talep yok 🎉' : 'Bu filtrede talep yok'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrelenmis.map(t => {
              const tarih = t.olusturulmaTarihi?.toDate?.()
                ? t.olusturulmaTarihi.toDate().toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';
              const durumRenk = {
                beklemede: 'bg-amber-100 text-amber-800 border-amber-300',
                onaylandi: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                reddedildi: 'bg-rose-100 text-rose-800 border-rose-300',
              }[t.durum] || 'bg-gray-100 text-gray-700 border-gray-300';

              return (
                <div key={t.id} className={`bg-gray-50 border-2 ${durumRenk.split(' ').pop()} rounded-xl p-4`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${durumRenk}`}>
                          {t.durum}
                        </span>
                        <span className="text-gray-500 text-xs inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />{tarih}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-800">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <strong>{t.ad}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Hash className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-mono text-xs">{t.lookup || '—'}</span>
                          {t.telefon && (
                            <>
                              <Phone className="w-3.5 h-3.5 text-gray-500 ml-2" />
                              <span className="font-mono text-xs">{t.telefon}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-amare-purple font-bold">
                          <Mail className="w-3.5 h-3.5" />
                          {t.yeniEmail}
                        </div>
                        {t.sebep && (
                          <div className="text-gray-600 text-xs italic pl-5 pt-1 border-l-2 border-gray-300">
                            "{t.sebep}"
                          </div>
                        )}
                        {t.durum !== 'beklemede' && t.islemYapan && (
                          <div className="text-gray-500 text-[11px] pl-5 pt-1">
                            İşlem: {t.islemYapan}
                            {t.guncellenenKayitSayisi != null && ` · ${t.guncellenenKayitSayisi} Supabase kaydı güncellendi`}
                          </div>
                        )}
                      </div>
                    </div>
                    {t.durum === 'beklemede' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => islem(t.id, 'reddet')} disabled={islemTalepId === t.id}
                          className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                          <XIcon className="w-3.5 h-3.5" /> Reddet
                        </button>
                        <button onClick={() => islem(t.id, 'onayla')} disabled={islemTalepId === t.id}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                          {islemTalepId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Onayla
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmailDuzeltTab;
