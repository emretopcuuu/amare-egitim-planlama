// One Team Liderlik Konseyi sayfası — 15 asıl üye, alfabetik, fotoğraflı.
//
// 27 Ekim 2026: Konsey seçimi sonuçlandı (üç tur). Kural (seçim anketi K-079): yalnız seçilen
// 15 isim ada göre sıralı gösterilir; oy sayıları, sıralama ve yedekler GÖSTERİLMEZ.
// Tasarım ve foto çözümü Yönetim Kurulu sayfasıyla (YurutmekuruluSayfasi) aynıdır.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Vote } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { LIDERLIK_KONSEYI } from '../utils/liderlikKonseyi';
import { db } from '../utils/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { makeCoreId } from '../context/DataContext';
import { useSmartBack } from '../utils/navigation';
import { yuzOdak } from '../utils/yuzOdak';

const I18N = {
  tr: {
    geri: 'Geri',
    kicker: 'OneTeam Liderleri',
    baslik: 'One Team Liderlik Konseyi',
    aciklama: 'Diamond ve üstü liderlerin seçtiği 15 kişilik kurul. Görev süresi 1 yıl.',
    rozet: 'Seçimle belirlendi · 1 Kasım’da göreve başlıyor',
    uye: 'üye',
    sira: 'Alfabetik sıra',
    altMetin: 'Konsey üyeleri 2026 seçiminde üç turlu gizli oylamayla belirlendi. Liste ada göre sıralıdır.',
  },
  en: {
    geri: 'Back',
    kicker: 'OneTeam Leaders',
    baslik: 'One Team Leadership Council',
    aciklama: 'A 15-member council elected by Diamond and above leaders. One-year term.',
    rozet: 'Elected · takes office on 1 November',
    uye: 'members',
    sira: 'Alphabetical order',
    altMetin: 'The Council members were elected in the 2026 election by secret ballot over three rounds. The list is in alphabetical order.',
  },
  de: {
    geri: 'Zurück',
    kicker: 'OneTeam-Führung',
    baslik: 'One Team Führungsrat',
    aciklama: 'Ein 15-köpfiger Rat, gewählt von Diamond-Führungskräften und höher. Amtszeit 1 Jahr.',
    rozet: 'Gewählt · Amtsantritt am 1. November',
    uye: 'Mitglieder',
    sira: 'Alphabetische Reihenfolge',
    altMetin: 'Die Ratsmitglieder wurden bei der Wahl 2026 in geheimer Abstimmung über drei Runden gewählt. Die Liste ist alphabetisch sortiert.',
  },
  nl: {
    geri: 'Terug',
    kicker: 'OneTeam Leiders',
    baslik: 'One Team Leiderschapsraad',
    aciklama: 'Een raad van 15 leden, gekozen door Diamond-leiders en hoger. Termijn 1 jaar.',
    rozet: 'Gekozen · start op 1 november',
    uye: 'leden',
    sira: 'Alfabetische volgorde',
    altMetin: 'De raadsleden zijn bij de verkiezing van 2026 in drie rondes met geheime stemming gekozen. De lijst staat op alfabetische volgorde.',
  },
};

const LiderlikKonseyiSayfasi = () => {
  const navigate = useNavigate();
  const geri = useSmartBack('/hakkimizda');
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;
  // coreId → konuşmacı kaydı (yalnız 15 üye; tüm koleksiyon çekilmez)
  const [kayitlar, setKayitlar] = useState({});

  useEffect(() => {
    let iptal = false;
    (async () => {
      const harita = {};
      await Promise.all(LIDERLIK_KONSEYI.map(async (u) => {
        const cid = u.coreId || makeCoreId(u.ad);
        try {
          const s = await getDoc(doc(db, 'konusmacilar', cid));
          if (s.exists()) harita[cid] = { id: cid, ...s.data() };
        } catch (e) {
          console.warn('[konsey] foto okunamadı:', cid, e.message);
        }
      }));
      if (!iptal) setKayitlar(harita);
    })();
    return () => { iptal = true; };
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(125,211,252,0.16)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-6xl">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={geri}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.geri}
          </button>
          <LanguageSwitcher />
        </div>

        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 animate-fade-in">
          <div className="relative inline-block mb-4">
            <div className="absolute -inset-4 bg-sky-400/20 blur-2xl pointer-events-none" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-400/30 to-sky-600/15 border border-sky-300/50 shadow-2xl">
              <Vote className="w-8 h-8 sm:w-10 sm:h-10 text-sky-200" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-sky-300/50" />
            <span className="text-sky-200 text-[10px] sm:text-xs uppercase tracking-[0.4em] font-semibold whitespace-nowrap">{tr.kicker}</span>
            <div className="h-px w-10 bg-sky-300/50" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-3 leading-tight">{tr.baslik}</h1>
          <p className="text-purple-100/85 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-4">{tr.aciklama}</p>
          <span className="inline-block mb-3 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-sky-100 bg-sky-400/20 border border-sky-300/40 rounded-full px-3 py-1">
            {tr.rozet}
          </span>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
              <span className="text-white font-semibold"><strong className="font-bold">{LIDERLIK_KONSEYI.length}</strong> {tr.uye}</span>
            </div>
            <div className="inline-flex items-center bg-white/5 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 text-xs text-purple-100/80">
              {tr.sira}
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 list-none p-0 m-0">
          {LIDERLIK_KONSEYI.map((u) => {
            const cid = u.coreId || makeCoreId(u.ad);
            const foto = kayitlar[cid]?.fotoURL || null;
            return (
              <li key={u.ad}>
                <button onClick={() => navigate(`/lider/${cid}`)}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-sky-300/60 rounded-xl p-4 transition-all duration-300 text-center shadow-lg group hover:shadow-sky-500/20 hover:bg-white/15">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
                    {foto ? (
                      <img src={foto} alt={u.ad} loading="lazy" decoding="async"
                        className="w-full h-full rounded-full object-cover border-2 border-sky-300/50 shadow-md group-hover:border-sky-200 transition-colors"
                        style={{ objectPosition: yuzOdak(cid, makeCoreId(u.ad)) }} />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-400/30 to-sky-600/15 border-2 border-sky-300/40 flex items-center justify-center">
                        <span className="text-sky-100 font-bold text-base">
                          {u.ad.split(' ').map((p) => p[0]).join('').slice(0, 2).toLocaleUpperCase('tr')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-white font-bold text-xs sm:text-sm leading-tight">{u.ad}</div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="text-center mt-12 mb-12">
          <p className="text-purple-200/60 text-xs max-w-2xl mx-auto leading-relaxed">{tr.altMetin}</p>
        </div>
      </div>
    </div>
  );
};

export default LiderlikKonseyiSayfasi;
