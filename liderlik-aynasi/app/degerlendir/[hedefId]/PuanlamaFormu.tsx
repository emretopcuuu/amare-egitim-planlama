"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

type Ozellik = { id: number; name: string; observation_hint: string };
type Girdi = { puan: number | null; yorum: string };
type Props = {
  dalgaId: number;
  dalgaAdi: string;
  hedefId: string;
  hedefAd: string;
  hedefTakim: string | null;
  kendisi: boolean;
  ozellikler: Ozellik[];
  mevcut: { ozellikId: number; puan: number; yorum: string }[];
};

const YORUM_MAX = 500;

// Kamp wifi'ı güvenilmez: her değişiklik localStorage'a taslak yazılır,
// başarılı gönderimde silinir. Taslak, sunucudaki kayıtlı puanlardan
// daha yenidir (gönderilmemiş düzenleme), bu yüzden önceliklidir.
function taslakAnahtari(dalgaId: number, hedefId: string) {
  return `la_taslak_v1:${dalgaId}:${hedefId}`;
}

export default function PuanlamaFormu({
  dalgaId,
  dalgaAdi,
  hedefId,
  hedefAd,
  hedefTakim,
  kendisi,
  ozellikler,
  mevcut,
}: Props) {
  const router = useRouter();

  const [girdiler, setGirdiler] = useState<Record<number, Girdi>>(() => {
    const ilk: Record<number, Girdi> = {};
    for (const o of ozellikler) ilk[o.id] = { puan: null, yorum: "" };
    for (const m of mevcut) ilk[m.ozellikId] = { puan: m.puan, yorum: m.yorum };
    return ilk;
  });
  const [taslakGeldi, setTaslakGeldi] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const yuklendi = useRef(false);

  // Taslağı yalnızca ilk yüklemede geri al (hydration sonrası, SSR uyumsuzluğu olmasın).
  useEffect(() => {
    if (yuklendi.current) return;
    yuklendi.current = true;
    try {
      const ham = localStorage.getItem(taslakAnahtari(dalgaId, hedefId));
      if (!ham) return;
      const taslak = JSON.parse(ham) as Record<number, Girdi>;
      // localStorage SSR'da okunamaz; taslak ancak hydration sonrası tek seferlik
      // geri yüklenebilir. Bilinçli istisna — kascading render yok, tek setState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGirdiler((eski) => {
        const yeni = { ...eski };
        for (const o of ozellikler) {
          const t = taslak[o.id];
          if (t && (t.puan !== null || t.yorum)) yeni[o.id] = t;
        }
        return yeni;
      });
      setTaslakGeldi(true);
    } catch {
      // bozuk taslak yok sayılır
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function guncelle(ozellikId: number, degisim: Partial<Girdi>) {
    setHata(null);
    setGirdiler((eski) => {
      const yeni = { ...eski, [ozellikId]: { ...eski[ozellikId], ...degisim } };
      try {
        localStorage.setItem(taslakAnahtari(dalgaId, hedefId), JSON.stringify(yeni));
      } catch {
        // depolama dolu/kapalı: taslaksız devam
      }
      return yeni;
    });
  }

  const puansizlar = ozellikler.filter((o) => girdiler[o.id].puan === null);
  const eksikYorumlar = kendisi
    ? []
    : ozellikler.filter((o) => {
        const g = girdiler[o.id];
        return g.puan !== null && g.puan < 6 && !g.yorum.trim();
      });
  const gonderilebilir =
    puansizlar.length === 0 && eksikYorumlar.length === 0 && !gonderiliyor;

  async function gonder() {
    if (!gonderilebilir) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/puanla", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hedefId,
          puanlar: ozellikler.map((o) => ({
            ozellikId: o.id,
            puan: girdiler[o.id].puan,
            yorum: girdiler[o.id].yorum.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? tr.puanlama.hataSunucu);
        return;
      }
      try {
        localStorage.removeItem(taslakAnahtari(dalgaId, hedefId));
      } catch {
        // taslak silinemezse sorun değil: sunucu kaydı esas
      }
      router.push("/degerlendir");
      router.refresh();
    } catch {
      // Ağ hatası: taslak zaten cihazda, kullanıcıyı bilgilendir.
      setHata(tr.puanlama.hataCevrimdisi);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
            {dalgaAdi}
          </p>
          <Link
            href="/degerlendir"
            className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            ← {tr.puanlama.geriDon}
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gold">
          {kendisi ? tr.puanlama.ozBaslik : tr.puanlama.baslikKisi(hedefAd)}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          {hedefTakim && !kendisi && (
            <span className="mr-2 rounded-md bg-royal/30 px-2 py-0.5 text-xs text-royal-light">
              {hedefTakim}
            </span>
          )}
          {kendisi ? tr.puanlama.ozAciklama : tr.puanlama.kisiAciklama}
        </p>
        <p className="mt-2 text-xs text-slate-400">{tr.puanlama.taslakNotu}</p>
        {taslakGeldi && (
          <p className="mt-1 text-xs font-medium text-amber-400">
            {tr.puanlama.taslakGeriYuklendi}
          </p>
        )}
      </header>

      {ozellikler.map((o, sira) => {
        const g = girdiler[o.id];
        const yorumGerekli =
          !kendisi && g.puan !== null && g.puan < 6;
        return (
          <section
            key={o.id}
            className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur"
          >
            <h2 className="font-semibold text-slate-100">
              <span className="mr-2 text-xs text-slate-500">
                {sira + 1}/{ozellikler.length}
              </span>
              {o.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{o.observation_hint}</p>

            <div
              role="radiogroup"
              aria-label={o.name}
              className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={g.puan === p}
                  disabled={gonderiliyor}
                  onClick={() => guncelle(o.id, { puan: p })}
                  className={`h-11 rounded-lg text-sm font-bold transition-all ${
                    g.puan === p
                      ? "scale-105 bg-gradient-to-br from-gold-light to-gold text-midnight shadow-lg shadow-gold/30"
                      : "border border-royal-light/30 text-slate-300 hover:border-gold/60 hover:text-gold-light"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {yorumGerekli && (
              <div className="mt-3">
                <label
                  htmlFor={`yorum-${o.id}`}
                  className="text-xs font-medium text-amber-400"
                >
                  {tr.puanlama.yorumEtiket}
                </label>
                <textarea
                  id={`yorum-${o.id}`}
                  value={g.yorum}
                  maxLength={YORUM_MAX}
                  rows={2}
                  disabled={gonderiliyor}
                  onChange={(e) => guncelle(o.id, { yorum: e.target.value })}
                  placeholder={tr.puanlama.yorumPlaceholder}
                  className="mt-1 w-full rounded-xl border border-amber-400/40 bg-midnight-soft p-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
                />
              </div>
            )}
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-6 bg-gradient-to-t from-midnight via-midnight/95 to-transparent p-6 pt-8">
        {hata && (
          <p role="alert" className="mb-3 text-center text-sm font-medium text-red-400">
            {hata}
          </p>
        )}
        {!hata && puansizlar.length > 0 && (
          <p className="mb-3 text-center text-xs text-slate-400">
            {tr.puanlama.eksikPuan(puansizlar.length)}
          </p>
        )}
        {!hata && puansizlar.length === 0 && eksikYorumlar.length > 0 && (
          <p className="mb-3 text-center text-xs font-medium text-amber-400">
            {tr.puanlama.yorumZorunlu}
          </p>
        )}
        <button
          type="button"
          onClick={gonder}
          disabled={!gonderilebilir}
          className="h-12 w-full btn-3d rounded-xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gonderiliyor ? tr.puanlama.gonderiliyor : tr.puanlama.gonder}
        </button>
      </div>
    </div>
  );
}
