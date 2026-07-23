"use client";

import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { iyisinDevamGoster } from "@/lib/iyisinDevam";
import GorevYanitFormu from "./GorevYanitFormu";

const t = tr.gorevler;

const TUR_RENK: Record<string, string> = {
  gozlem: "bg-royal/30 text-royal-light",
  cesaret: "bg-orange-500/20 text-orange-300",
  yansima: "bg-emerald-500/20 text-emerald-300",
  gizli: "bg-fuchsia-500/20 text-fuchsia-300",
  tahmin: "bg-sky-500/20 text-sky-300",
  simulasyon: "bg-rose-500/20 text-rose-300",
  bag: "bg-teal-500/20 text-teal-300",
  soz: "bg-gold/20 text-gold-light",
};

export type GecmisGorev = {
  id: string;
  kind: string;
  title: string;
  status: string;
  ai_score: number | null;
  spark_points: number;
  ai_comment: string | null;
  scored_at: string | null;
  issued_at: string;
  trait_id: number | null;
  gozlem: string | null;
  response_text: string | null;
  neden: string | null;
  fayda: string | null;
  // [FAZ 3 · U18] Yansıma turu: kişinin yazdığı + AYNA'nın cevabı. Gönderim anında
  // zaten görünüyordu; tekrar ziyarette kaybolmasın diye geçmişte de gösterilir.
  reflection_text: string | null;
  reflection_reply: string | null;
  // [E#39] Kullanıcının "işine yaradı mı?" oyu (null = henüz oy yok).
  yararli: boolean | null;
};

type Filtre = "tum" | "yuksek" | "kacan";

// A8 (filtre + özet) + A2 (liderlik kası) — görev geçmişi: gün gruplu zaman
// çizelgesi, üstte toplam/ortalama özet ve tümü/yüksek/kaçan filtresi.
export default function GorevGecmisi({
  gorevler,
  ozellikAd,
}: {
  gorevler: GecmisGorev[];
  ozellikAd: Record<number, string>;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tum");
  // "Geliştir ve yeniden gönder" açık olan görev (puanı artırmak için tekrar dene).
  const [gelistirId, setGelistirId] = useState<string | null>(null);
  // PERFORMANS: geçmiş çok uzunsa (ör. yoğun günler) tüm kartları birden basmak
  // — her biri backdrop-blur — düşük bellekli uygulama-içi tarayıcıyı çökertir.
  // Varsayılan ilk N kart; gerisi "daha fazla" ile açılır.
  const [hepsiGoster, setHepsiGoster] = useState(false);
  // [E#39] "İşine yaradı mı?" oyları — sunucudan gelen başlangıç + tıklayınca güncelle.
  const [faydaOy, setFaydaOy] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(gorevler.filter((g) => g.yararli != null).map((g) => [g.id, g.yararli as boolean]))
  );
  async function faydaVer(id: string, yararli: boolean) {
    setFaydaOy((m) => ({ ...m, [id]: yararli }));
    try {
      await fetch("/api/gorev-fayda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId: id, yararli }),
      });
    } catch {
      // sessiz — oy görsel olarak kaldı; kritik değil
    }
  }

  // Özet: tamamlanan (scored) sayısı + ortalama puan + kaçan sayısı.
  const ozet = useMemo(() => {
    const scored = gorevler.filter((g) => g.status === "scored");
    const puanli = scored.filter((g) => typeof g.ai_score === "number");
    const ort =
      puanli.length > 0
        ? puanli.reduce((s, g) => s + (g.ai_score ?? 0), 0) / puanli.length
        : null;
    const kacan = gorevler.filter((g) => g.status === "expired").length;
    return { tamam: scored.length, ort, kacan };
  }, [gorevler]);

  // UX #8: kas haritası — tamamlanan görevlerin çalıştırdığı liderlik kasları.
  const kasHaritasi = useMemo(() => {
    const say = new Map<number, number>();
    for (const g of gorevler) {
      if (g.status === "scored" && g.trait_id != null && ozellikAd[g.trait_id]) {
        say.set(g.trait_id, (say.get(g.trait_id) ?? 0) + 1);
      }
    }
    const liste = [...say.entries()]
      .map(([id, n]) => ({ ad: ozellikAd[id], n }))
      .sort((a, b) => b.n - a.n);
    const enCok = liste[0]?.n ?? 1;
    return { liste, enCok };
  }, [gorevler, ozellikAd]);

  const suzulmus = useMemo(() => {
    if (filtre === "yuksek")
      return gorevler.filter((g) => g.status === "scored" && (g.ai_score ?? 0) >= 8);
    if (filtre === "kacan") return gorevler.filter((g) => g.status === "expired");
    return gorevler;
  }, [gorevler, filtre]);

  const LISTE_LIMIT = 20;
  const kesilmis = useMemo(
    () => (hepsiGoster ? suzulmus : suzulmus.slice(0, LISTE_LIMIT)),
    [suzulmus, hepsiGoster]
  );
  const gizliSayi = suzulmus.length - kesilmis.length;

  const gruplar = useMemo(() => {
    const gunEtiket = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const gunAnahtar = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });
    const out: { anahtar: string; etiket: string; gorevler: GecmisGorev[] }[] = [];
    for (const g of kesilmis) {
      const zaman = new Date(g.scored_at ?? g.issued_at);
      const anahtar = gunAnahtar.format(zaman);
      let grup = out.find((x) => x.anahtar === anahtar);
      if (!grup) {
        grup = { anahtar, etiket: gunEtiket.format(zaman), gorevler: [] };
        out.push(grup);
      }
      grup.gorevler.push(g);
    }
    return out;
  }, [kesilmis]);

  const cipler: { ad: Filtre; etiket: string }[] = [
    { ad: "tum", etiket: t.filtreTum },
    { ad: "yuksek", etiket: t.filtreYuksek },
    { ad: "kacan", etiket: t.filtreKacan },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gold-light">{t.gecmisBaslik}</h2>
        {ozet.tamam > 0 && (
          <p className="text-xs text-slate-400">
            {t.gecmisOzet(ozet.tamam, ozet.ort, ozet.kacan)}
          </p>
        )}
      </div>

      {gorevler.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t.gecmisYok}</p>
      ) : (
        <>
          {/* UX #8: kas haritası — hangi liderlik kasını ne kadar çalıştın */}
          {kasHaritasi.liste.length > 0 && (
            <div className="mt-4 rounded-2xl border border-royal/25 bg-midnight-card/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                💪 {t.kasHaritasi}
              </p>
              <div className="mt-3 space-y-1.5">
                {kasHaritasi.liste.map((k) => (
                  <div key={k.ad} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-slate-300">{k.ad}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold"
                        style={{ width: `${Math.round((k.n / kasHaritasi.enCok) * 100)}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-medium text-slate-400">
                      {k.n}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtre çipleri */}
          <div className="mt-3 flex gap-1.5">
            {cipler.map((c) => (
              <button
                key={c.ad}
                type="button"
                onClick={() => setFiltre(c.ad)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filtre === c.ad
                    ? "border-gold/50 bg-gold/15 text-gold-light"
                    : "border-royal-light/25 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c.etiket}
              </button>
            ))}
          </div>

          {gruplar.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t.filtreBos}</p>
          ) : (
            <div className="mt-4 space-y-6">
              {gruplar.map((grup) => (
                <div key={grup.anahtar}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {grup.etiket}
                  </p>
                  <ul className="relative space-y-3 border-l border-royal/25 pl-5">
                    {grup.gorevler.map((g) => (
                      <li key={g.id} className="relative">
                        <span
                          className={`absolute -left-[1.46rem] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-midnight ${
                            g.status === "expired"
                              ? "bg-slate-600"
                              : (g.ai_score ?? 0) >= 8
                                ? "bg-gold"
                                : "bg-royal-light"
                          }`}
                          aria-hidden
                        />
                        <div
                          className={`kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 backdrop-blur ${
                            g.status === "expired" ? "opacity-60 ring-royal/20" : "ring-royal/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span
                              className={`rounded-md px-2 py-0.5 font-medium ${TUR_RENK[g.kind] ?? "text-slate-400"}`}
                            >
                              {t.turler[g.kind as keyof typeof t.turler] ?? g.kind}
                            </span>
                            {g.status === "scored" && g.ai_score !== null ? (
                              <span className="font-bold text-gold">
                                {t.puanin(g.ai_score)} · +{g.spark_points} ⚡
                                {/* Ekip sloganı — iyi puanlı görevlerin bir kısmında ARA
                                    ARA (bkz. lib/iyisinDevam.ts); her yerde göstermek
                                    anlamını kaybettirir. Görev id'sine bağlı deterministik. */}
                                {g.ai_score >= 8 && iyisinDevamGoster(g.id) && (
                                  <span className="ml-1.5 font-semibold text-gold-light">
                                    · {tr.ortak.iyisinDevam}
                                  </span>
                                )}
                              </span>
                            ) : g.status === "scored" ? (
                              <span className="font-bold text-gold">+{g.spark_points} ⚡</span>
                            ) : (
                              <span className="text-slate-500">
                                {t.durumlar[g.status as keyof typeof t.durumlar]}
                              </span>
                            )}
                          </div>
                          {/* Katılımcı isteği: kart kapalı gelsin, dokununca detaylar
                              (neden/fayda/yorum/gözlem) açılsın — başlık her zaman görünür. */}
                          <details className="group mt-1.5">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-100">{g.title}</span>
                              <span
                                className="shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                                aria-hidden
                              >
                                ▾
                              </span>
                            </summary>
                            <div className="mt-1.5 space-y-1.5">
                              {/* A2: çalıştırılan liderlik kası */}
                              {g.trait_id != null && ozellikAd[g.trait_id] && (
                                <p className="text-xs text-royal-light/80">💪 {ozellikAd[g.trait_id]}</p>
                              )}
                              {/* Neden sen + fayda: geçmişte de görünür kalır (süre geçse de anlam kaybolmaz) */}
                              {g.neden && (
                                <div className="rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2">
                                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/80">✨ Neden sana?</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{g.neden}</p>
                                </div>
                              )}
                              {g.fayda && (
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2">
                                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-emerald-400/80">💡 Katkısı</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{g.fayda}</p>
                                </div>
                              )}
                              {g.ai_comment && (
                                <p className="rounded-xl bg-midnight-soft p-3 text-sm italic text-slate-300">
                                  “{g.ai_comment}”
                                </p>
                              )}
                              {g.gozlem && (
                                <p className="rounded-xl border border-royal-light/25 bg-midnight/40 p-3 text-sm text-slate-200">
                                  <span className="mr-1 text-xs font-semibold text-royal-light">
                                    {t.tanikGelenEtiket}
                                  </span>
                                  “{g.gozlem}”
                                </p>
                              )}
                              {/* [FAZ 3 · U18] Yansıma turu — kişinin yansıması + AYNA'nın cevabı. */}
                              {g.reflection_text && (
                                <div className="space-y-1.5 rounded-xl border border-royal/25 bg-midnight-soft/50 p-3">
                                  <p className="text-sm text-slate-200">
                                    <span className="mr-1 text-xs font-semibold text-slate-400">Yansıman:</span>
                                    “{g.reflection_text}”
                                  </p>
                                  {g.reflection_reply && (
                                    <p className="text-sm italic leading-relaxed text-royal-light/90">
                                      🪞 {g.reflection_reply}
                                    </p>
                                  )}
                                </div>
                              )}
                              {/* Görev türüne göre neden/fayda/yorum/kas hiçbiri
                                  dolmamış olabilir (statik şablonlu türler: söz,
                                  senkron, şahit, mentorluk, serbest, domino, sesli
                                  mektup — kaçan görevde zaten yorum hiç oluşmaz).
                                  Panel asla boş kalmasın — en az bir satır göster. */}
                              {!(g.trait_id != null && ozellikAd[g.trait_id]) &&
                                !g.neden &&
                                !g.fayda &&
                                !g.ai_comment &&
                                !g.gozlem &&
                                !g.reflection_text && (
                                  <p className="text-xs text-slate-500">
                                    {g.status === "expired" ? t.gecmisNotYokKacan : t.gecmisNotYok}
                                  </p>
                                )}
                              {/* [E#39] İşine yaradı mı? — tek dokunuş; görev üretimini besler. */}
                              {g.status === "scored" && g.kind !== "soz" && g.kind !== "senkron" && (
                                g.id in faydaOy ? (
                                  <p className="text-center text-xs text-slate-500">
                                    {faydaOy[g.id] ? "👍 İşine yaradığını not aldım." : "👎 Not aldım — daha iyisini üreteceğim."}
                                  </p>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 pt-1">
                                    <span className="text-xs text-slate-500">İşine yaradı mı?</span>
                                    <button
                                      type="button"
                                      onClick={() => void faydaVer(g.id, true)}
                                      aria-label="İşine yaradı"
                                      className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-sm hover:bg-emerald-500/20"
                                    >
                                      👍
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void faydaVer(g.id, false)}
                                      aria-label="İşine yaramadı"
                                      className="rounded-lg bg-white/5 px-2.5 py-1 text-sm hover:bg-white/10"
                                    >
                                      👎
                                    </button>
                                  </div>
                                )
                              )}
                              {/* Geliştir ve yeniden gönder — puanı artırmak için aynı görevi
                                  tekrar dene (söz/senkron hariç puanlanmış görevler). */}
                              {g.status === "scored" && g.kind !== "soz" && g.kind !== "senkron" && (
                                gelistirId === g.id ? (
                                  <div>
                                    <GorevYanitFormu
                                      gorevId={g.id}
                                      gorevBaslik={g.title}
                                      baslangicYanit={g.response_text ?? ""}
                                    />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setGelistirId(g.id)}
                                    className="w-full text-center text-xs font-medium text-gold-light/80 underline-offset-4 transition-colors hover:text-gold-light"
                                  >
                                    🔁 {t.gelistirYeniden}
                                  </button>
                                )
                              )}
                            </div>
                          </details>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {/* Çok uzun geçmişte kalan kartları talep üzerine aç (bellek dostu) */}
              {gizliSayi > 0 && (
                <button
                  type="button"
                  onClick={() => setHepsiGoster(true)}
                  className="mx-auto block rounded-full border border-royal-light/30 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
                >
                  {gizliSayi} görev daha göster
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
