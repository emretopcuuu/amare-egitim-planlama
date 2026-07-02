// Konuşmacı takip et — yeni eğitimleri olduğunda email gelir
import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, Loader2, Mail, AlertCircle } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { guvenliGetDocs } from '../utils/guvenliVeri';

const KonusmaciTakipModal = ({ konusmaciAd, onClose }) => {
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [hata, setHata] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setHata('Geçerli email girin');
      return;
    }
    setYukleniyor(true);
    setHata(null);
    try {
      // Aynı email + konuşmacı zaten varsa eklemiyoruz
      try {
        const q = query(
          collection(db, 'konusmaci_aboneleri'),
          where('email', '==', email.trim().toLowerCase()),
          where('konusmaciAd', '==', konusmaciAd)
        );
        const snap = await guvenliGetDocs(q);
        if (!snap.empty) {
          setBasarili(true);
          return;
        }
      } catch {}

      await addDoc(collection(db, 'konusmaci_aboneleri'), {
        email: email.trim().toLowerCase(),
        konusmaciAd,
        kayitZamani: Timestamp.now(),
        aktif: true,
      });
      setBasarili(true);
    } catch (err) {
      setHata('Kayıt edilemedi: ' + err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}>
      <div className="bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-scaleIn" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Kapat"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 spring-tap">
          <X className="w-6 h-6" />
        </button>

        {basarili ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Takip ediyorsun!</h3>
            <p className="text-gray-600 text-sm">
              <strong>{konusmaciAd}</strong> yeni bir eğitim verdiğinde email ile haber vereceğiz.
            </p>
            <button onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all spring-tap">
              Tamam
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Eğitmeni Takip Et</h3>
                <p className="text-sm text-gray-500">{konusmaciAd}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{konusmaciAd}</strong> yeni bir eğitim verdiğinde email ile sana haber vereceğiz. KVKK uyarınca email adresin sadece bu amaçla saklanır, istediğin zaman silebilirsin.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@adresin.com" required
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
              </div>
              {hata && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {hata}
                </div>
              )}
              <button type="submit" disabled={yukleniyor}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all spring-tap">
                {yukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : <><UserPlus className="w-4 h-4" />Takip Et</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default KonusmaciTakipModal;
