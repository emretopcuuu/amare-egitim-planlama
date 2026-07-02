// /zoom-analiz — Zoom GERÇEK katılım analizi (yalnız admin).
// Veri: takvim doc'larındaki zoomGercekKatilim / zoomOrtDakika (gece cron'u yazar).
// 3 blok: Eğitmen Karnesi · Gün×Saat ısı haritası · En kalabalık eğitimler.
import React, { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, Clock, Flame, Trophy } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useDocumentTitle } from '../utils/useDocumentTitle';

const splitEgitmen = (e) => {
  if (!e) return [];
  return e.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};
const parseTarih = (t) => { const p = String(t || '').split('.').map(Number); if (p.length !== 3 || p.some(isNaN)) return null; const d = new Date(p[2], p[1] - 1, p[0]); return isNaN(d.getTime()) ? null : d; };
const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
// saat dilimleri: sabah erken / gündüz / akşam / gece — takvimdeki gerçek dağılıma uygun
const SAAT_GRUP = [
  { ad: '06–10', min: 6, max: 10 },
  { ad: '10–14', min: 10, max: 14 },
  { ad: '14–18', min: 14, max: 18 },
  { ad: '18–21', min: 18, max: 21 },
  { ad: '21–24', min: 21, max: 24 },
];

export default function ZoomAnaliz() {
  useDocumentTitle('Zoom Katılım Analizi', 'Gerçek katılım verisi');
  const { takvim, isAdmin, loading } = useData();

  const veriler = useMemo(() => (takvim || [])
    .filter(e => e.zoomGercekKatilim > 0)
    .map(e => ({ ...e, _d: parseTarih(e.tarih) }))
    .filter(e => e._d), [takvim]);

  // ── Eğitmen karnesi ──
  const karne = useMemo(() => {
    const acc = {};
    veriler.forEach(e => {
      splitEgitmen(e.egitmen).forEach(ad => {
        const k = ad.toLocaleUpperCase('tr-TR');
        (acc[k] || (acc[k] = { ad, egitim: 0, katilim: 0, dk: 0 }));
        acc[k].egitim++; acc[k].katilim += e.zoomGercekKatilim; acc[k].dk += e.zoomOrtDakika || 0;
      });
    });
    return Object.values(acc)
      .filter(x => x.egitim >= 2) // tek eğitimle karne olmaz
      .map(x => ({ ...x, ortKatilim: Math.round(x.katilim / x.egitim), ortDk: Math.round(x.dk / x.egitim) }))
      .sort((a, b) => b.ortKatilim - a.ortKatilim);
  }, [veriler]);

  // ── Gün × Saat ısı haritası ──
  const isi = useMemo(() => {
    const hucre = {}; // `${gunIdx}_${grupIdx}` -> {toplam, n}
    veriler.forEach(e => {
      const gunIdx = (e._d.getDay() + 6) % 7; // Pzt=0
      const saat = parseInt(String(e.saat || '').split(':')[0], 10);
      if (!Number.isFinite(saat)) return;
      const gIdx = SAAT_GRUP.findIndex(g => saat >= g.min && saat < g.max);
      if (gIdx < 0) return;
      const key = `${gunIdx}_${gIdx}`;
      (hucre[key] || (hucre[key] = { toplam: 0, n: 0 }));
      hucre[key].toplam += e.zoomGercekKatilim; hucre[key].n++;
    });
    let max = 0;
    const sonuc = {};
    Object.entries(hucre).forEach(([k, v]) => { sonuc[k] = { ort: Math.round(v.toplam / v.n), n: v.n }; if (sonuc[k].ort > max) max = sonuc[k].ort; });
    return { sonuc, max };
  }, [veriler]);

  // ── En kalabalıklar ──
  const top = useMemo(() => [...veriler].sort((a, b) => b.zoomGercekKatilim - a.zoomGercekKatilim).slice(0, 10), [veriler]);

  if (!loading && !isAdmin) return <Navigate to="/takvim" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/takvim" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6"><ArrowLeft className="w-4 h-4" />Takvim</Link>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-7 h-7 text-amber-300" />
          <h1 className="text-2xl font-extrabold">Zoom Katılım Analizi</h1>
        </div>
        <p className="text-purple-200/70 text-sm mb-6">{veriler.length} eğitimin GERÇEK Zoom katılım verisi (kim tıkladı değil, kim girdi). Her gece otomatik güncellenir. Yalnız admin görür.</p>

        {/* ── Eğitmen Karnesi ── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="font-extrabold text-lg inline-flex items-center gap-2 mb-1"><Trophy className="w-5 h-5 text-amber-300" />Eğitmen Karnesi</h2>
          <p className="text-purple-200/60 text-xs mb-4">Ortalama gerçek katılıma göre sıralı (en az 2 eğitim). "Ort. dk" = izleyicinin ortalama kalma süresi — dinletme gücü.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-purple-300/70 text-xs uppercase tracking-wide text-left">
                <th className="py-2 pr-2">#</th><th className="py-2 pr-4">Eğitmen</th>
                <th className="py-2 pr-4 text-right">Eğitim</th>
                <th className="py-2 pr-4 text-right">Ort. Katılım</th>
                <th className="py-2 text-right">Ort. Kalma</th>
              </tr></thead>
              <tbody>
                {karne.slice(0, 25).map((k, i) => (
                  <tr key={k.ad} className="border-t border-white/8">
                    <td className="py-2 pr-2 text-purple-300/60">{i + 1}</td>
                    <td className="py-2 pr-4 font-bold">{k.ad}</td>
                    <td className="py-2 pr-4 text-right text-purple-200/80">{k.egitim}</td>
                    <td className="py-2 pr-4 text-right font-extrabold text-amber-300">{k.ortKatilim}</td>
                    <td className="py-2 text-right text-purple-200/80">{k.ortDk} dk</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Isı Haritası ── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="font-extrabold text-lg inline-flex items-center gap-2 mb-1"><Flame className="w-5 h-5 text-amber-300" />Hangi Gün · Hangi Saat?</h2>
          <p className="text-purple-200/60 text-xs mb-4">Hücre = o gün/saatteki eğitimlerin ortalama gerçek katılımı. Koyu altın = kalabalık. Takvimi buna göre planla.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead><tr>
                <th className="py-1"></th>
                {SAAT_GRUP.map(g => <th key={g.ad} className="py-1 text-purple-300/70">{g.ad}</th>)}
              </tr></thead>
              <tbody>
                {GUNLER.map((gun, gi) => (
                  <tr key={gun}>
                    <td className="py-1 pr-2 text-left font-bold text-purple-200/80">{gun}</td>
                    {SAAT_GRUP.map((g, si) => {
                      const h = isi.sonuc[`${gi}_${si}`];
                      const yog = h && isi.max ? h.ort / isi.max : 0;
                      return (
                        <td key={g.ad} className="p-1">
                          {h ? (
                            <div className="rounded-lg py-2 font-bold" title={`${h.n} eğitim · ort ${h.ort} kişi`}
                              style={{ background: `rgba(251,191,36,${0.12 + yog * 0.75})`, color: yog > 0.55 ? '#3b0764' : '#fde68a' }}>
                              {h.ort}<div className="text-[9px] font-normal opacity-70">{h.n} eğt</div>
                            </div>
                          ) : <div className="rounded-lg py-2 bg-white/4 text-white/20">–</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── En Kalabalıklar ── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-extrabold text-lg inline-flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-amber-300" />En Kalabalık 10 Eğitim</h2>
          <div className="space-y-2">
            {top.map((e, i) => (
              <Link key={e.id} to={`/e/${e.id}`} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl px-3 py-2.5 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${i < 3 ? 'bg-amber-400 text-purple-900' : 'bg-white/10 text-white/70'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{e.egitim}</div>
                  <div className="text-[11px] text-purple-300/60">{e.tarih} · {e.egitmen}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-extrabold text-amber-300">{e.zoomGercekKatilim}</div>
                  <div className="text-[10px] text-purple-300/60 inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{e.zoomOrtDakika} dk</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
