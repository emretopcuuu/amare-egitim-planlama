import React, { useState } from 'react';
import { X, Bell, Clock, Mail, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useTranslation } from '../context/LanguageContext';

const ZAMAN_KEYS = [
  { id: '5dk', key: 'reminder_5min', dk: 5 },
  { id: '10dk', key: 'reminder_10min', dk: 10 },
  { id: '4saat', key: 'reminder_4h', dk: 240 },
  { id: '8saat', key: 'reminder_8h', dk: 480 },
  { id: '12saat', key: 'reminder_12h', dk: 720 },
  { id: '24saat', key: 'reminder_24h', dk: 1440 },
];

const parseTarih = (t) => { if (!t) return null; const [d,m,y] = t.split('.').map(Number); return new Date(y,m-1,d); };

const HatirlatmaKayitModal = ({ egitim, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [seciliZamanlar, setSeciliZamanlar] = useState(new Set(['24saat']));
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [hata, setHata] = useState(null);

  const egitimTarih = parseTarih(egitim.tarih);
  const [saat = 0, dakika = 0] = (egitim.saat || '0:0').split(':').map(Number);
  const egitimBaslangic = egitimTarih ? new Date(egitimTarih) : null;
  if (egitimBaslangic) egitimBaslangic.setHours(saat, dakika, 0, 0);

  const zoomMatch = (egitim.yer || '').match(/(\d[\d\s]{6,})/);
  const zoomId = zoomMatch ? zoomMatch[1].replace(/\s/g, '') : null;
  const zoomLink = zoomId ? `https://zoom.us/j/${zoomId}` : null;

  const simdi = new Date();

  const toggleZaman = (id) => {
    setSeciliZamanlar(prev => {
      const yeni = new Set(prev);
      yeni.has(id) ? yeni.delete(id) : yeni.add(id);
      return yeni;
    });
  };

  const isGecmis = (dk) => {
    if (!egitimBaslangic) return true;
    const gonderimZamani = new Date(egitimBaslangic.getTime() - dk * 60000);
    return simdi >= gonderimZamani;
  };

  const emailGecerli = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleKaydet = async () => {
    if (!emailGecerli) { setHata(t('reminder_err_email')); return; }
    if (seciliZamanlar.size === 0) { setHata(t('reminder_err_time')); return; }
    setKaydediliyor(true);
    setHata(null);

    try {
      const seciliListe = [...seciliZamanlar].filter(id => {
        const z = ZAMAN_KEYS.find(z => z.id === id);
        return z && !isGecmis(z.dk);
      });

      if (seciliListe.length === 0) { setHata(t('reminder_err_past')); setKaydediliyor(false); return; }

      for (const zamanId of seciliListe) {
        const zaman = ZAMAN_KEYS.find(z => z.id === zamanId);
        const gonderilecekZaman = new Date(egitimBaslangic.getTime() - zaman.dk * 60000);

        const q = query(
          collection(db, 'hatirlatmalar'),
          where('egitimId', '==', egitim.id),
          where('email', '==', email.trim().toLowerCase()),
          where('hatirlatmaZamani', '==', zamanId)
        );
        const existing = await getDocs(q);
        if (!existing.empty) continue;

        await addDoc(collection(db, 'hatirlatmalar'), {
          egitimId: egitim.id,
          egitimAdi: egitim.egitim,
          tarih: egitim.tarih,
          saat: egitim.saat,
          bitisSaati: egitim.bitisSaati || '',
          egitmen: egitim.egitmen || '',
          yer: egitim.yer || '',
          email: email.trim().toLowerCase(),
          hatirlatmaZamani: zamanId,
          gonderilecekZaman: Timestamp.fromDate(gonderilecekZaman),
          gonderildi: false,
          kayitZamani: Timestamp.now(),
          zoomLink: zoomLink || '',
        });
      }

      setBasarili(true);
    } catch (err) {
      setHata(t('reminder_err_save') + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (basarili) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-scaleIn" onClick={e => e.stopPropagation()}>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('reminder_success_title')}</h3>
          <p className="text-gray-500 text-sm mb-1">{t('reminder_success_desc').replace('{email}', email)}</p>
          <p className="text-gray-400 text-xs mb-6">{t('reminder_success_sub')}</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition">{t('ok')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-t-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h2 className="text-lg font-bold">{t('reminder_title')}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-3">
            <h3 className="font-bold text-base">{egitim.egitim}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-purple-200">
              <Clock className="w-3.5 h-3.5" />
              {egitim.tarih} {egitim.gun} • {egitim.saat}{egitim.bitisSaati ? `–${egitim.bitisSaati}` : ''}
            </div>
            {egitim.egitmen && <div className="text-sm text-purple-200 mt-0.5">🎤 {egitim.egitmen}</div>}
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-purple-500" />{t('reminder_email')}
            </label>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setHata(null); }}
              placeholder="ornek@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('reminder_when')}</label>
            <div className="grid grid-cols-2 gap-2">
              {ZAMAN_KEYS.map(z => {
                const gecmis = isGecmis(z.dk);
                const secili = seciliZamanlar.has(z.id);
                return (
                  <button key={z.id} onClick={() => !gecmis && toggleZaman(z.id)} disabled={gecmis}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      gecmis ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-400'
                        : secili ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      secili ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {secili && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {t(z.key)}
                  </button>
                );
              })}
            </div>
          </div>

          {hata && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{hata}
            </div>
          )}

          <button onClick={handleKaydet}
            disabled={kaydediliyor || !emailGecerli || seciliZamanlar.size === 0}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 transition-all shadow-lg">
            {kaydediliyor
              ? <><Loader2 className="w-5 h-5 animate-spin" />{t('reminder_saving')}</>
              : <><Bell className="w-5 h-5" />{t('reminder_save')}</>}
          </button>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            {t('reminder_info')} {zoomLink && t('reminder_zoom_info')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HatirlatmaKayitModal;
