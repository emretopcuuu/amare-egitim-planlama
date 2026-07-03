// /ara — Site içi TEK arama (herkese açık).
// Tek kutu, dört kaynak:
//   📅 Takvim eğitimleri (ad/eğitmen/kategori/şehir)  → /e/{id}
//   🎬 Kayıtlı videolar (başlık/eğitmen/tema)          → /kayitli-egitimler?q=
//   👤 Liderler (ad/unvan)                             → /lider/{id}
//   📝 Konuşma içi (transkript) — butonla tetiklenir   → mevcut transcript-search.mjs
// Veri: takvim+konusmacilar context'ten; kayıtlı liste veri-proxy'den (hafif, CDN cache'li).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Video, User, FileText, Loader2, ChevronRight } from 'lucide-react';
import { useData, makeCoreId } from '../context/DataContext';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { trackEvent } from '../utils/analytics';

const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFC');
const parseTarih = (t) => { const p = String(t || '').split('.').map(Number); if (p.length !== 3 || p.some(isNaN)) return null; const d = new Date(p[2], p[1] - 1, p[0]); return isNaN(d.getTime()) ? null : d; };

export default function AraSayfasi() {
  useDocumentTitle('Ara', 'Eğitim, video, lider ve konuşmalarda ara');
  const navigate = useNavigate();
  const { takvim, konusmacilar } = useData();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') || '');
  const [videolar, setVideolar] = useState(null); // null = yükleniyor
  const [trSonuc, setTrSonuc] = useState(null);   // null = aranmadı, [] = sonuç yok
  const [trAraniyor, setTrAraniyor] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setTrSonuc(null); }, [debouncedQ]); // yeni terim → eski transkript sonucu temizle
  useEffect(() => {
    if (debouncedQ.trim().length >= 2) { try { trackEvent('site_arama', { q: debouncedQ.trim().slice(0, 60) }); } catch {} }
  }, [debouncedQ]);

  // Kayıtlı video listesi (hafif alanlar; transcript içermez)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/.netlify/functions/veri-proxy?col=kayitli');
        const j = await r.json();
        setVideolar(Array.isArray(j.docs) ? j.docs : []);
      } catch { setVideolar([]); }
    })();
  }, []);

  const ql = norm(debouncedQ.trim());
  const aktif = ql.length >= 2;

  const egitimSonuc = useMemo(() => {
    if (!aktif) return [];
    return (takvim || [])
      .filter(e => [e.egitim, e.egitmen, e.kategori, e.sehir].some(a => norm(a).includes(ql)))
      .map(e => ({ ...e, _d: parseTarih(e.tarih) }))
      .sort((a, b) => (b._d || 0) - (a._d || 0))
      .slice(0, 8);
  }, [aktif, ql, takvim]);

  const videoSonuc = useMemo(() => {
    if (!aktif || !videolar) return [];
    return videolar
      .filter(v => [v.baslik, v.egitmenAdlari, v.ozet?.anaTema, (v.kategoriler || []).join(' ')].some(a => norm(Array.isArray(a) ? a.join(' ') : a).includes(ql)))
      .slice(0, 8);
  }, [aktif, ql, videolar]);

  const liderSonuc = useMemo(() => {
    if (!aktif) return [];
    return (konusmacilar || [])
      .filter(k => [k.ad, k.unvan, k.meslek].some(a => norm(a).includes(ql)))
      .slice(0, 6);
  }, [aktif, ql, konusmacilar]);

  // Konuşma içi arama — pahalı, butonla tetiklenir (mevcut transcript-search.mjs)
  const transkriptAra = async () => {
    if (!aktif || !videolar?.length || trAraniyor) return;
    setTrAraniyor(true); setTrSonuc(null);
    try {
      const r = await fetch('/.netlify/functions/transcript-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: debouncedQ.trim(), videoIds: videolar.map(v => String(v.id)) }),
      });
      const j = await r.json();
      const byId = Object.fromEntries((videolar || []).map(v => [String(v.id), v]));
      setTrSonuc((j.results || []).slice(0, 10).map(x => ({ ...x, video: byId[String(x.id)] })));
    } catch { setTrSonuc([]); }
    finally { setTrAraniyor(false); }
  };

  const videoyaGit = () => {
    try { localStorage.setItem('amare_transcript_search', '1'); } catch {}
    navigate(`/kayitli-egitimler?q=${encodeURIComponent(debouncedQ.trim())}`);
  };

  const Grup = ({ icon: Icon, baslik, n, children }) => (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <h2 className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{baslik}{n != null && <span className="text-white/40">({n})</span>}</h2>
      {children}
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/takvim" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6"><ArrowLeft className="w-4 h-4" />Takvim</Link>
        <h1 className="text-2xl font-extrabold mb-1 inline-flex items-center gap-2"><Search className="w-6 h-6 text-amber-300" />Ara</h1>
        <p className="text-purple-200/70 text-sm mb-5">Eğitim, kayıtlı video, lider — hatta eğitimlerde <b>konuşulanların içinde</b> ara.</p>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300/60" />
          <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Örn: itiraz karşılama, stres, kazanç planı..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400/60 text-base" />
        </div>

        {!aktif && <p className="text-purple-300/50 text-sm text-center py-8">En az 2 harf yaz — sonuçlar anında gelir.</p>}

        {aktif && (
          <div className="space-y-4">
            {egitimSonuc.length > 0 && (
              <Grup icon={Calendar} baslik="Eğitimler" n={egitimSonuc.length}>
                <div className="space-y-1.5">
                  {egitimSonuc.map(e => (
                    <Link key={e.id} to={`/e/${e.id}`} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2.5 transition-colors">
                      <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{e.egitim}</div><div className="text-[11px] text-purple-300/60">{e.tarih} · {e.egitmen}</div></div>
                      <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </Grup>
            )}

            {videoSonuc.length > 0 && (
              <Grup icon={Video} baslik="Kayıtlı Videolar" n={videoSonuc.length}>
                <div className="space-y-1.5">
                  {videoSonuc.map(v => (
                    <button key={v.id} onClick={videoyaGit} className="w-full text-left flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2.5 transition-colors">
                      <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{v.baslik}</div><div className="text-[11px] text-purple-300/60 truncate">{v.egitmenAdlari || v.ozet?.anaTema || ''}</div></div>
                      <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </Grup>
            )}

            {liderSonuc.length > 0 && (
              <Grup icon={User} baslik="Liderler" n={liderSonuc.length}>
                <div className="flex flex-wrap gap-2">
                  {liderSonuc.map(k => (
                    <Link key={k.id || k.ad} to={`/lider/${k.id || makeCoreId(k.ad)}`} className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-1.5 pr-3 py-1.5 transition-colors">
                      {k.fotoURL ? <img src={k.fotoURL} alt="" className="w-7 h-7 rounded-full object-cover" /> : <span className="w-7 h-7 rounded-full bg-purple-500/40 flex items-center justify-center text-xs font-bold">{(k.ad || '?')[0]}</span>}
                      <span className="text-sm font-bold">{k.ad}</span>
                    </Link>
                  ))}
                </div>
              </Grup>
            )}

            {/* Konuşma içi arama */}
            <Grup icon={FileText} baslik="Konuşmaların İçinde">
              {trSonuc === null && !trAraniyor && (
                <button onClick={transkriptAra} disabled={!videolar?.length}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl text-sm disabled:opacity-50 spring-tap">
                  🔍 "{debouncedQ.trim()}" eğitim konuşmalarında geçiyor mu? Ara
                </button>
              )}
              {trAraniyor && <div className="flex items-center justify-center gap-2 py-4 text-purple-200/70 text-sm"><Loader2 className="w-4 h-4 animate-spin" />918 eğitimin konuşma metinleri taranıyor…</div>}
              {Array.isArray(trSonuc) && trSonuc.length === 0 && !trAraniyor && <p className="text-purple-300/50 text-sm text-center py-2">Konuşmalarda geçmiyor.</p>}
              {Array.isArray(trSonuc) && trSonuc.length > 0 && (
                <div className="space-y-1.5">
                  {trSonuc.map(r => (
                    <button key={r.id} onClick={videoyaGit} className="w-full text-left bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2.5 transition-colors">
                      <div className="font-bold text-sm truncate">{r.video?.baslik || `Video ${r.id}`}</div>
                      {r.matches?.[0] && <div className="text-[11px] text-purple-200/70 mt-0.5 line-clamp-2">…{r.matches[0].snippet || r.matches[0].text}…</div>}
                    </button>
                  ))}
                  <p className="text-purple-300/40 text-[11px] text-center pt-1">Tıklayınca video arşivinde açılır — orada dakikasına gidebilirsin.</p>
                </div>
              )}
            </Grup>

            {egitimSonuc.length === 0 && videoSonuc.length === 0 && liderSonuc.length === 0 && videolar !== null && (
              <p className="text-purple-300/50 text-sm text-center py-4">Eğitim/video/lider bulunamadı — yine de "Konuşmaların İçinde" aramayı dene.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
