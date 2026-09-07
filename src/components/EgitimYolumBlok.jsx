// Profile sayfası ana bölümü — Eğitim Yolum
// Kullanıcının rank'ine göre kişisel curriculum gösterir:
// - Mevcut rank: aktif, içeride video listesi (aç-kapan)
// - Önceki rank'ler: otomatik tamamlanmış (accordion içinde)
// - Sonraki rank'ler: AÇILABİLİR — ilki "sıradaki hedefin", gerisi "gelecek"
//
// 2026-09-07: üst rütbeler eskiden KİLİTLİ idi (tıklanmıyordu). Kilit yanıltıcıydı:
// o videolar Kayıtlı Eğitimler'de zaten herkese açık (orada tek şart giriş yapmak),
// yani kilit içeriği değil sadece LİSTEYİ saklıyordu. Üstelik üyelerin %75'i
// Brand Partner — yani çoğunluk tek açık kart + arkasında kilit duvarı görüyordu.
// Bir üst rütbeye çıkaracak eğitimi, çıkana kadar saklamanın anlamı yok.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { RANK_SIRALAMA, rankStringToKey, classifyRanks, rankRenkClass } from '../utils/rankSchema';
import { useWatchProgress } from '../utils/watchProgress';
import { useTranslation } from '../context/LanguageContext';
import { CheckCircle2, ChevronDown, ChevronUp, Video, Play, Target, Award } from 'lucide-react';
import RankIcon from './RankIcon';

// Hedeften sonra kaç gelecek rütbe doğrudan listelensin (gerisi "daha göster" ardında)
const ONDEN_GOSTER = 2;

const EgitimYolumBlok = ({ uid, isAnonymous, kullaniciRankString }) => {
  const navigate = useNavigate();
  const watchProgress = useWatchProgress();
  const { t, lang } = useTranslation();

  // Mevcut rank → key
  const aktifRankKey = useMemo(() => rankStringToKey(kullaniciRankString), [kullaniciRankString]);
  const { tamamlanan, aktif, kilitli: gelecek } = useMemo(
    () => classifyRanks(aktifRankKey),
    [aktifRankKey]
  );

  // Tüm curriculum'ları toplu çek
  const [curriculums, setCurriculums] = useState({}); // { rankKey: { zorunluVideolar, onerilenVideolar } }
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acikRankler, setAcikRankler] = useState(() => new Set([aktifRankKey])); // mevcut rank açık başlar
  const [hepsiniGoster, setHepsiniGoster] = useState(false);

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

  const toggleRank = (rankKey) => {
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

  // Yuzde bicimi dile gore: TR '%50', digerleri '50%'
  const yuzdeYaz = (n) => (lang === 'tr' ? `%${n}` : `${n}%`);

  const videoyaGit = (id, zaman) =>
    navigate(`/kayitli-egitimler?v=${encodeURIComponent(id)}${zaman ? '&t=' + zaman : ''}`);

  if (!aktifRankKey) {
    // Rütbe eşleşmedi (Amare kaydında henüz kariyer rütbesi yok/senkron olmadı).
    // "belirleniyor..." sonsuza kadar yükleniyormuş izlenimi veriyordu — dürüst mesaja çevrildi.
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
        <Award className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-50" />
        <p className="text-purple-200 text-sm">{t('ey_no_rank')}</p>
        <p className="text-purple-300/60 text-xs mt-1.5">{t('ey_no_rank_sub')}</p>
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

  const hedef = gelecek[0] || null;
  const sonrakiler = gelecek.slice(1);
  const gorunenSonrakiler = hepsiniGoster ? sonrakiler : sonrakiler.slice(0, ONDEN_GOSTER);
  const gizliSayi = sonrakiler.length - gorunenSonrakiler.length;

  const kartOrtak = (r, durum) => ({
    rank: r,
    durum,
    otoTamamlandi: false,
    acik: acikRankler.has(r.key),
    curriculum: curriculums[r.key],
    tamamlanmaPct: getTamamlanmaPct(r.key, false),
    watchProgress,
    t,
    yuzdeYaz,
    onToggle: () => toggleRank(r.key),
    onVideoOynat: videoyaGit,
  });

  return (
    <div className="space-y-2">
      {/* AKTİF RANK — geniş, açık */}
      <RankKart {...kartOrtak(aktif, 'aktif')} />

      {/* ÖNCEKİ RANK'LER — accordion: tek bir özet butona basınca açılır */}
      {tamamlanan.length > 0 && (
        <TamamlananlarAccordion
          tamamlanan={tamamlanan}
          acikRankler={acikRankler}
          curriculums={curriculums}
          watchProgress={watchProgress}
          t={t}
          yuzdeYaz={yuzdeYaz}
          onToggle={toggleRank}
          onVideoOynat={videoyaGit}
        />
      )}

      {/* SIRADAKİ HEDEF — açılabilir, şimdiden izlenebilir */}
      {hedef && <RankKart {...kartOrtak(hedef, 'hedef')} />}

      {/* GELECEK RANK'LER — kilitli değil, sadece sönük */}
      {gorunenSonrakiler.map(r => (
        <RankKart key={r.key} {...kartOrtak(r, 'gelecek')} />
      ))}

      {gizliSayi > 0 && (
        <button onClick={() => setHepsiniGoster(true)}
          className="w-full text-center text-purple-300/70 hover:text-purple-200 text-xs pt-2 pb-1 transition">
          + {gizliSayi} {t('ey_show_more')}
        </button>
      )}
      {hepsiniGoster && sonrakiler.length > ONDEN_GOSTER && (
        <button onClick={() => setHepsiniGoster(false)}
          className="w-full text-center text-purple-300/60 hover:text-purple-200 text-xs pt-2 pb-1 transition">
          {t('ey_show_less')}
        </button>
      )}
    </div>
  );
};

// ─── Tamamlanan rank'ler accordion ───
// Tek özet kutu: "X rütbe tamamlandı" → tıkla → genişler
const TamamlananlarAccordion = ({ tamamlanan, acikRankler, curriculums, watchProgress, t, yuzdeYaz, onToggle, onVideoOynat }) => {
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
            ✓ {sayi} {t('ey_ranks_done')}
          </div>
          <div className="text-emerald-200/70 text-[11px] mt-0.5">
            {tamamlanan.slice().reverse().slice(0, 3).map(r => r.label).join(' · ')}
            {sayi > 3 && ` +${sayi - 3} ${t('ey_more')}`}
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
              durum="tamamlandi"
              otoTamamlandi={true}
              acik={acikRankler.has(r.key)}
              curriculum={curriculums[r.key]}
              tamamlanmaPct={100}
              watchProgress={watchProgress}
              t={t}
              yuzdeYaz={yuzdeYaz}
              onToggle={() => onToggle(r.key)}
              onVideoOynat={onVideoOynat}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tek Rank Kartı ───
const RankKart = ({ rank, durum, otoTamamlandi, acik, curriculum, tamamlanmaPct, watchProgress, t, yuzdeYaz, onToggle, onVideoOynat }) => {
  const renk = rankRenkClass(rank);
  const zorunlu = curriculum?.zorunluVideolar || [];
  const onerilen = curriculum?.onerilenVideolar || [];
  const toplamVideo = zorunlu.length + onerilen.length;

  const cerceve =
    durum === 'aktif'      ? 'bg-white/10 border-amber-300/40 shadow-xl' :
    durum === 'tamamlandi' ? 'bg-white/5 border-emerald-400/25' :
    durum === 'hedef'      ? 'bg-white/[0.07] border-sky-300/35' :
                             'bg-white/[0.03] border-white/10';

  return (
    <div className={`rounded-2xl border backdrop-blur-md transition-all ${cerceve}`}>
      <button onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition rounded-2xl">
        {/* Rank icon — logo PNG veya fallback */}
        <div className={`relative flex-shrink-0 ${durum === 'gelecek' ? 'opacity-70' : ''}`}>
          <RankIcon rank={rank} size={44} kilitli={false} />
          {otoTamamlandi && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-purple-900 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Title + state */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm ${durum === 'gelecek' ? 'text-purple-100/75' : 'text-white'}`}>
              {rank.label}
            </span>
            {durum === 'aktif' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 bg-amber-400/15 border border-amber-300/40 rounded px-1.5 py-0.5">
                {t('ey_active')}
              </span>
            )}
            {durum === 'tamamlandi' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 bg-emerald-400/15 border border-emerald-300/40 rounded px-1.5 py-0.5">
                ✓ {t('ey_done')}
              </span>
            )}
            {durum === 'hedef' && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-sky-200 bg-sky-400/15 border border-sky-300/40 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                <Target className="w-2.5 h-2.5" /> {t('ey_next_goal')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden max-w-[200px]">
              <div className={`h-full bg-gradient-to-r ${renk.bg} transition-all`} style={{ width: `${tamamlanmaPct}%` }} />
            </div>
            <span className="text-[10px] text-purple-200/70 font-semibold whitespace-nowrap">
              {yuzdeYaz(tamamlanmaPct)} {toplamVideo > 0 && `· ${toplamVideo} ${t(toplamVideo === 1 ? 'ey_video_one' : 'ey_video')}`}
            </span>
          </div>

          {(durum === 'hedef' || durum === 'gelecek') && (
            <div className="text-[11px] text-sky-200/60 mt-1">
              {t('ey_preview_note')}
            </div>
          )}
        </div>

        <div className="text-white/40 flex-shrink-0">
          {acik ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Açıldığında video listesi */}
      {acik && (
        <div className="px-4 pb-4 space-y-1.5">
          {zorunlu.length === 0 && onerilen.length === 0 ? (
            <div className="text-center py-6 text-purple-300/50 text-xs italic">
              {t('ey_no_curriculum')}
            </div>
          ) : (
            <>
              {zorunlu.length > 0 && (
                <div>
                  <div className="text-amber-300/80 text-[10px] uppercase tracking-wider font-bold mb-1.5 px-1">
                    {t('ey_required')} ({zorunlu.length})
                  </div>
                  <div className="space-y-1.5">
                    {zorunlu.map((v, i) => (
                      <VideoSatir key={v.vimeoId} video={v} no={i + 1}
                        watchProgress={watchProgress}
                        otoTamam={otoTamamlandi}
                        t={t}
                        yuzdeYaz={yuzdeYaz}
                        onOynat={onVideoOynat} />
                    ))}
                  </div>
                </div>
              )}
              {onerilen.length > 0 && (
                <div className="mt-3">
                  <div className="text-purple-300/70 text-[10px] uppercase tracking-wider font-bold mb-1.5 px-1">
                    {t('ey_suggested')} ({onerilen.length})
                  </div>
                  <div className="space-y-1.5">
                    {onerilen.map((v, i) => (
                      <VideoSatir key={v.vimeoId} video={v} no={i + 1}
                        watchProgress={watchProgress}
                        otoTamam={otoTamamlandi}
                        t={t}
                        yuzdeYaz={yuzdeYaz}
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
const VideoSatir = ({ video, no, watchProgress, otoTamam, t, yuzdeYaz, onOynat }) => {
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
            ▶ {t('ey_continue')} · {yuzdeYaz(progress.pct)}
          </div>
        )}
        {!yarimKalan && !tamamlanmis && video.egitmenAdlari?.[0] && (
          <div className="text-[10px] text-purple-300/60 truncate">{video.egitmenAdlari[0]}</div>
        )}
      </div>
      {/* CTA */}
      <div className="text-amber-300/80 group-hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition">
        {yarimKalan ? t('ey_continue_short') : tamamlanmis ? t('ey_again') : t('ey_watch')} →
      </div>
    </button>
  );
};

export default EgitimYolumBlok;
