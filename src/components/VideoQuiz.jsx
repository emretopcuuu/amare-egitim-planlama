// Video sonu mini quiz — 3-5 MCQ soru
// Doğru cevap + açıklama gösterir, sonunda yüzde verir
// Kullanıcı skoru kaydedilir: users/{uid}/quiz_sonuclari/{vimeoId}

import React, { useState } from 'react';
import { ClipboardCheck, Loader2, Check, X, Sparkles, Award } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const VideoQuiz = ({ video }) => {
  const { currentUser, isAnonymous } = useAuth();
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [sorular, setSorular] = useState(null);
  const [cevaplar, setCevaplar] = useState({}); // {soruIdx: secenekIdx}
  const [tamamlandi, setTamamlandi] = useState(false);

  async function quizYukle() {
    if (!currentUser || isAnonymous) {
      setHata('Quiz için üye girişi yap');
      return;
    }
    setYukleniyor(true);
    setHata('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/quiz-uret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          vimeoId: video.vimeoId || video.id,
          baslik: video.baslik,
          aciklama: video.aciklama,
          transcript: video.transcript,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quiz yüklenemedi');
      setSorular(data.sorular || []);
      setAcik(true);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  function cevapla(soruIdx, secenekIdx) {
    if (tamamlandi) return;
    setCevaplar(c => ({ ...c, [soruIdx]: secenekIdx }));
  }

  async function bitir() {
    setTamamlandi(true);
    const skor = sorular.filter((s, i) => cevaplar[i] === s.dogruIndex).length;
    const toplam = sorular.length;
    const yuzde = Math.round((skor / toplam) * 100);
    // Sonucu kaydet
    if (currentUser && !isAnonymous) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/quiz_sonuclari/${video.vimeoId || video.id}`), {
          vimeoId: String(video.vimeoId || video.id),
          baslik: video.baslik,
          skor, toplam, yuzde,
          tarih: serverTimestamp(),
        }, { merge: true });
      } catch (e) { console.warn('[quiz] save err:', e.message); }
    }
  }

  function sifirla() {
    setCevaplar({});
    setTamamlandi(false);
  }

  if (!currentUser || isAnonymous) return null;

  // Açılmamış — buton göster
  if (!acik) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-400/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">Mini Quiz</h4>
            <p className="text-purple-200/70 text-[11px]">3-5 soruyla bu eğitimi pekiştir</p>
          </div>
          <button onClick={quizYukle} disabled={yukleniyor}
            className="bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold text-xs px-3 py-2 rounded-lg spring-tap disabled:opacity-50 inline-flex items-center gap-1.5">
            {yukleniyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {yukleniyor ? 'AI hazırlıyor...' : 'Quiz Aç'}
          </button>
        </div>
        {hata && <p className="text-rose-300 text-[11px] mt-2">{hata}</p>}
      </div>
    );
  }

  // Sonuç ekranı
  if (tamamlandi) {
    const skor = sorular.filter((s, i) => cevaplar[i] === s.dogruIndex).length;
    const toplam = sorular.length;
    const yuzde = Math.round((skor / toplam) * 100);
    const renk = yuzde >= 80 ? 'emerald' : yuzde >= 50 ? 'amber' : 'rose';
    const renkClass = {
      emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40',
      amber:   'text-amber-300 bg-amber-500/10 border-amber-400/40',
      rose:    'text-rose-300 bg-rose-500/10 border-rose-400/40',
    }[renk];
    return (
      <div className={`${renkClass} border rounded-lg p-4`}>
        <div className="flex items-center gap-3 mb-3">
          <Award className="w-8 h-8" />
          <div>
            <div className="font-extrabold text-2xl">{skor}/{toplam}</div>
            <div className="text-sm opacity-80">%{yuzde} — {yuzde >= 80 ? 'Mükemmel!' : yuzde >= 50 ? 'İyi gidiyorsun' : 'Tekrar et!'}</div>
          </div>
        </div>
        <div className="space-y-2 mb-3">
          {sorular.map((s, i) => {
            const dogru = cevaplar[i] === s.dogruIndex;
            return (
              <div key={i} className="bg-black/20 rounded p-2 text-xs">
                <div className="flex items-center gap-2">
                  {dogru ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-white font-semibold">{s.soru}</span>
                </div>
                {!dogru && (
                  <div className="mt-1 ml-5 text-white/70">
                    Doğru: <strong className="text-emerald-300">{s.secenekler[s.dogruIndex]}</strong>
                  </div>
                )}
                {s.aciklama && (
                  <div className="mt-1 ml-5 text-white/60 italic">{s.aciklama}</div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={sifirla} className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded spring-tap">
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Sorular ekranı
  const cevaplanan = Object.keys(cevaplar).length;
  return (
    <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-bold text-sm inline-flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-purple-300" />
          Quiz · {cevaplanan}/{sorular.length}
        </h4>
        <button onClick={() => setAcik(false)} className="text-white/40 hover:text-white text-xs">
          Kapat
        </button>
      </div>
      <div className="space-y-3">
        {sorular.map((s, i) => (
          <div key={i} className="bg-black/20 rounded-lg p-3">
            <div className="text-white text-sm font-semibold mb-2">{i + 1}. {s.soru}</div>
            <div className="space-y-1.5">
              {s.secenekler.map((sec, idx) => {
                const aktif = cevaplar[i] === idx;
                return (
                  <button key={idx} onClick={() => cevapla(i, idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition spring-tap ${
                      aktif
                        ? 'bg-amber-400 text-purple-900 font-bold'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}>
                    {String.fromCharCode(65 + idx)}. {sec}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button onClick={bitir} disabled={cevaplanan < sorular.length}
        className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg spring-tap disabled:opacity-50 disabled:bg-white/10">
        {cevaplanan === sorular.length ? 'Quiz Bitir' : `${sorular.length - cevaplanan} soru kaldı`}
      </button>
    </div>
  );
};

export default VideoQuiz;
