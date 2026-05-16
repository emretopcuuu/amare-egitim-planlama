// Profile sayfası ana bölümü — Eğitim Yolum
// Kullanıcının rank'ine göre kişisel curriculum gösterir:
// - Mevcut rank: aktif, içeride video listesi (aç-kapan)
// - Önceki rank'ler: otomatik tamamlanmış (kapalı başlar, tıkla aç)
// - Sonraki rank'ler: kilitli (tıklanmaz)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  RANK_SIRALAMA, getRankByKey, rankStringToKey, classifyRanks, rankRenkClass,
} from '../utils/rankSchema';
import { useWatchProgress } from '../utils/watchProgress';
import {
  Trophy, Lock, CheckCircle2, ChevronDown, ChevronUp, Video, Play,
  Sparkles, Award,
} from 'lucide-react';
import RankIcon from './RankIcon';

const EgitimYolumBlok = ({ uid, isAnonymous, kullaniciRankString }) => {
  const navigate = useNavigate();
  const watchProgress = useWatchProgress();

  // Mevcut rank → key
  const aktifRankKey = useMemo(() => rankStringToKey(kullaniciRankString), [kullaniciRankString]);
  const { tamamlanan, aktif, kilitli } = useMemo(
    () => classifyRanks(aktifRankKey),
    [aktifRankKey]
  );

  // Tüm curriculum'ları toplu çek
  const [curriculums, setCurriculums] = useState({}); // { rankKey: { zorunluVideolar, onerilenVideolar } }
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acikRankler, setAcikRankler] = useState(() => new Set([aktifRankKey])); // mevcut rank açık başlar

  useEffect(() => {
    if (!aktifRankKey) { setYukleniyor(false); return; }
    setAcikRankler(new Set([aktifRankKey]));

    let cancelled = false;
    (async () => {
      try {
        const promises = RANK_SIRALAMA.map(r => getDoc(doc(db, 'egitim_yollari', r.key)));
        const snaps = await Promise.allSettled(promises);
        if (cancelled) return;
        const map = {};
        snaps.forEach((s, i) => {
          if (s.status === 'fulfilled' && s.value.exists()) {
            map[RANK_SIRALAMA[i].key] = s.value.data();
          }
        });
        setCurriculums(map);
      } catch (e) {
        console.warn('[egitim-yolum] fetch err:', e.message);
      } finally {
        !cancelled && setYukleniyor(false);
      }
    })();
    return () => { cancelled = true; };
  }, [aktifRankKey]);

  const toggleRank = (rankKey, kilitliMi) => {
    if (kilitliMi) return;
    setAcikRankler(prev => {
      const next = new Set(prev);
      if (next.has(rankKey)) next.delete(rankKey);
      else next.add(rankKey);
      return next;
    });
  };

  // Yardımcı: bir rank'in tamamlanma yüzdesi
  const getTamamlanmaPct = (rankKey, autoComplete = false) => {
    if (autoComplete) return 100;
    const c = curriculums[rankKey];
    if (!c || !c.zorunluVideolar?.length) return 0;
    const liste = c.zorunluVideolar;
    let izlenmis = 0;
    for (const v of liste) {
      const p = watchProgress.get(v.vimeoId);
      if (p && p.pct >= 95) izlenmis++;
    }
    return Math.round((izlenmis / liste.length) * 100);
  };

  if (!aktifRankKey) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
        <Award className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-50" />
        <p className="text-purple-200 text-sm">Eğitim yolun belirleniyor...</p>
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl border border-white/10 skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* AKTİF RANK — geniş, açık */}
      <RankKart
        rank={aktif}
        kilitli={false}
        otoTamamlandi={false}
        acik={acikRankler.has(aktif.key)}
        durum="aktif"
        curriculum={curriculums[aktif.key]}
        tamamlanmaPct={getTamamlanmaPct(aktif.key, false)}
        watchProgress={watchProgress}
        onToggle={() => toggleRank(aktif.key, false)}
        onVideoOynat={(id, t) => navigate(`/kayitli-egitimler?v=${encodeURIComponent(id)}${t ? '&t=' + t : ''}`)}
      />

      {/* ÖNCEKİ RANK'LER — accordion: tek bir özet butona basınca açılır */}
      {tamamlanan.length > 0 && (
        <TamamlananlarAccordion
          tamamlanan={tamamlanan}
          acikRankler={acikRankler}
          curriculums={curriculums}
          watchProgress={watchProgress}
          onToggle={toggleRank}
          onVideoOynat={(id, t) => navigate(`/kayitli-egitimler?v=${encodeURIComponent(id)}${t ? '&t=' + t : ''}`)}
        />
      )}

      {/* KİLİTLİ RANK'LER — sıralı, açılamaz */}
      {kilitli.slice(0, 3).map(r => (
        <RankKart
          key={r.key}
          rank={r}
          kilitli={true}
          otoTamamlandi={false}
          acik={false}
          durum="kilitli"
          curriculum={null}
          tamamlanmaPct={0}
          watchProgress={null}
          onToggle={() => {}}
          onVideoOynat={() => {}}
        />
      ))}
      {kilitli.length > 3 && (
        <div className="text-center text-purple-300/60 text-xs pt-2">
          + {kilitli.length - 3} daha gelecek rank
        </div>
      )}
    </div>
  );
};

// ─── Tamamlanan rank'ler accordion ───
// Tek özet kutu: "X rank tamamlandı" → tıkla → genişler
const TamamlananlarAccordion = ({ tamamlanan, acikRankler, curriculums, watchProgress, onToggle, onVideoOynat }) => {
  const [genislemis, setGenislemis] = useState(false);
  const sayi = tamamlanan.length;

  return (
    <div className="bg-emerald-500/8 border border-emerald-400/25 rounded-2xl overflow-hidden">
      <button onClick={() => setGenislemis(g => !g)}
        className="w-full p-4 flex items-center gap-3 hover:bg-emerald-500/10 transition spring-tap text-left">
        <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm">
            ✓ {sayi} rank tamamlandı
          </div>
          <div className="text-emerald-200/70 text-[11px] mt-0.5">
            {tamamlanan.slice().reverse().slice(0, 3).map(r => r.label).join(' · ')}
            {sayi > 3 && ` +${sayi - 3} daha`}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-300/70 transition-transform flex-shrink-0 ${genislemis ? 'rotate-180' : ''}`} />
      </button>

      {genislemis && (
        <div className="border-t border-emerald-400/15 p-2 space-y-2">
          {tamamlanan.slice().reverse().map(r => (
            <RankKart
              key={r.key}
              rank={r}
              kilitli={false}
              otoTamamlandi={true}
              acik={acikRankler.has(r.key)}
              durum="tamamlandi"
              curriculum={curriculums[r.key]}
              tamamlanmaPct={100}
              watchProgress={watchProgress}
              onToggle={() => onToggle(r.key, false)}
              onVideoOynat={onVideoOynat}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tek Rank Kartı ───
const RankKart = ({ rank, kilitli, otoTamamlandi, acik, durum, curriculum, tamamlanmaPct, watchProgress, onToggle, onVideoOynat }) => {
  const renk = rankRenkClass(rank);
  const zorunlu = curriculum?.zorunluVideolar || [];
  const onerilen = curriculum?.onerilenVideolar || [];
  const toplamVideo = zorunlu.length + onerilen.length;

  return (
    <div className={`rounded-2xl border backdrop-blur-md transition-all ${
      durum === 'aktif'   ? 'bg-white/10 border-amber-300/40 shadow-xl' :
      durum === 'tamamlandi' ? 'bg-white/5 border-emerald-400/25' :
      'bg-white/[0.03] border-white/10 opacity-60'
    }`}>
      <button onClick={onToggle} disabled={kilitli}
        className={`w-full p-4 flex items-center gap-3 ${!kilitli ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed'} transition rounded-2xl`}>
        {/* Rank icon — logo PNG veya fallback */}
        <div className="relative flex-shrink-0">
          <RankIcon rank={rank} size={44} kilitli={kilitli} />
          {otoTamamlandi && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-purple-900 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Title + state */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm ${durum === 'kilitli' ? 'text-purple-300/60' : 'text-white'}`}>
              {rank.label}
            </span>
            {durum === 'aktif' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 bg-amber-400/15 border border-amber-300/40 rounded px-1.5 py-0.5">
                Aktif
              </span>
            )}
            {durum === 'tamamlandi' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 bg-emerald-400/15 border border-emerald-300/40 rounded px-1.5 py-0.5">
                ✓ Tamamlandı
              </span>
            )}
            {durum === 'kilitli' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300/60 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                🔒 Kilitli
              </span>
            )}
          </div>
          {!kilitli && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden max-w-[200px]">
                <div className={`h-full bg-gradient-to-r ${renk.bg} transition-all`} style={{ width: `${tamamlanmaPct}%` }} />
              </div>
              <span className="text-[10px] text-purple-200/70 font-semibold whitespace-nowrap">
                %{tamamlanmaPct} {toplamVideo > 0 && `· ${toplamVideo} video`}
              </span>
            </div>
          )}
          {kilitli && (
            <div className="text-[11px] text-purple-300/50 mt-0.5">
              Rank atladığında açılacak
            </div>
          )}
        </div>

        {!kilitli && (
          <div className="text-white/40 flex-shrink-0">
            {acik ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Açıldığında video listesi */}
      {acik && !kilitli && (
        <div className="px-4 pb-4 space-y-1.5">
          {zorunlu.length === 0 && onerilen.length === 0 ? (
            <div className="text-center py-6 text-purple-300/50 text-xs italic">
              Bu rank için henüz curriculum tanımlanmadı.
            </div>
          ) : (
            <>
              {zorunlu.length > 0 && (
                <div>
                  <div className="text-amber-300/80 text-[10px] uppercase tracking-wider font-bold mb-1.5 px-1">
                    Zorunlu ({zorunlu.length})
                  </div>
                  <div className="space-y-1.5">
                    {zorunlu.map((v, i) => (
                      <VideoSatir key={v.vimeoId} video={v} no={i + 1}
                        watchProgress={watchProgress}
                        otoTamam={otoTamamlandi}
                        onOynat={onVideoOynat} />
                    ))}
                  </div>
                </div>
              )}
              {onerilen.length > 0 && (
                <div className="mt-3">
                  <div className="text-purple-300/70 text-[10px] uppercase tracking-wider font-bold mb-1.5 px-1">
                    Önerilen ({onerilen.length})
                  </div>
                  <div className="space-y-1.5">
                    {onerilen.map((v, i) => (
                      <VideoSatir key={v.vimeoId} video={v} no={i + 1}
                        watchProgress={watchProgress}
                        otoTamam={otoTamamlandi}
                        onOynat={onVideoOynat} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tek Video Satırı ───
const VideoSatir = ({ video, no, watchProgress, otoTamam, onOynat }) => {
  const progress = watchProgress?.get?.(video.vimeoId);
  const tamamlanmis = otoTamam || (progress && progress.pct >= 95);
  const yarimKalan = progress && progress.pct > 0 && progress.pct < 95;

  return (
    <button onClick={() => onOynat(video.vimeoId, yarimKalan ? progress.t : null)}
      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-300/30 rounded-lg p-2 flex items-center gap-3 transition group spring-tap">
      <div className="text-[10px] font-bold text-white/40 w-5 text-center flex-shrink-0">{no}</div>
      {/* Status */}
      <div className="flex-shrink-0">
        {tamamlanmis ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : yarimKalan ? (
          <Play className="w-4 h-4 text-amber-400" fill="currentColor" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-white/30" />
        )}
      </div>
      {/* Thumbnail */}
      {video.thumbnailUrl ? (
        <img src={video.thumbnailUrl} alt="" className="w-14 h-8 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-8 bg-black/30 rounded flex items-center justify-center flex-shrink-0">
          <Video className="w-3.5 h-3.5 text-white/30" />
        </div>
      )}
      {/* Title */}
      <div className="flex-1 min-w-0 text-left">
        <div className={`text-xs font-semibold line-clamp-1 ${tamamlanmis ? 'text-white/60' : 'text-white'}`}>
          {video.baslik}
        </div>
        {yarimKalan && (
          <div className="text-[10px] text-amber-300 mt-0.5 font-semibold">
            ▶ Devam et · %{progress.pct}
          </div>
        )}
        {!yarimKalan && !tamamlanmis && video.egitmenAdlari?.[0] && (
          <div className="text-[10px] text-purple-300/60 truncate">{video.egitmenAdlari[0]}</div>
        )}
      </div>
      {/* CTA */}
      <div className="text-amber-300/80 group-hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition">
        {yarimKalan ? 'Devam' : tamamlanmis ? 'Tekrar' : 'İzle'} →
      </div>
    </button>
  );
};

export default EgitimYolumBlok;
