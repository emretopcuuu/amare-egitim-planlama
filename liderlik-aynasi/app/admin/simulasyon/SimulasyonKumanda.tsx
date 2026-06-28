"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tost } from "@/lib/tost";
import type { SimAdim, SimDurum } from "@/lib/simulasyon/adimlar";

// KAMP PROVA SİMÜLATÖRÜ — kumanda paneli.
// "İleri" tek bir aşamayı (AI adımlarında bir dilim) yürütür; "Otomatik" açıkken
// her cevap döner dönmez bir sonrakini tetikler (tüm sim bitene kadar). "Sıfırla"
// onayla siler. Adım çizelgesi solda, anlık log altta.
export default function SimulasyonKumanda({
  durum,
  adimlar,
  toplam,
  simdikiAdim,
  bitti,
  karakterSayisi,
}: {
  durum: SimDurum;
  adimlar: SimAdim[];
  toplam: number;
  simdikiAdim: SimAdim | null;
  bitti: boolean;
  karakterSayisi: number;
}) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [otomatik, setOtomatik] = useState(false);
  const [sonMesaj, setSonMesaj] = useState<string | null>(null);

  async function istek(eylem: "ileri" | "sifirla"): Promise<{ durum: SimDurum; mesaj: string } | null> {
    const res = await fetch("/api/admin/simulasyon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eylem }),
    });
    const veri = await res.json().catch(() => null);
    if (!res.ok || !veri?.ok) {
      tost(veri?.hata ?? "İşlem başarısız.", "hata");
      return null;
    }
    return veri;
  }

  async function ileri() {
    if (calisiyor) return;
    setCalisiyor(true);
    let devam = otomatik;
    do {
      const veri = await istek("ileri");
      if (!veri) {
        setOtomatik(false);
        break;
      }
      setSonMesaj(veri.mesaj);
      // Tümü bittiyse dur.
      if (veri.durum.adim >= adimlar.length - 1) devam = false;
    } while (devam);
    setCalisiyor(false);
    router.refresh();
  }

  async function sifirlaTik() {
    if (calisiyor) return;
    if (!confirm("Tüm sim karakterleri ve verilerini silmek istediğine emin misin? Dalga/mühür ayarları da sıfırlanır.")) {
      return;
    }
    setCalisiyor(true);
    setOtomatik(false);
    const veri = await istek("sifirla");
    if (veri) {
      setSonMesaj(veri.mesaj);
      tost("Simülasyon sıfırlandı.", "basari");
    }
    setCalisiyor(false);
    router.refresh();
  }

  const ilerlemeYuzde = Math.round((durum.adim / (adimlar.length - 1)) * 100);
  const aiDilim = simdikiAdim?.ai
    ? ` · ${durum.ilerleme}/${toplam} kişi`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Sol: şu anki adım + kontrol + log */}
      <div className="space-y-4">
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Adım {Math.min(durum.adim + 1, adimlar.length)}/{adimlar.length}
              {aiDilim}
            </span>
            <span className="text-xs font-medium text-gold-light">%{ilerlemeYuzde}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${ilerlemeYuzde}%` }} />
          </div>

          {simdikiAdim && (
            <div className="mt-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                <span aria-hidden>{simdikiAdim.ikon}</span>
                {simdikiAdim.baslik}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{simdikiAdim.aciklama}</p>
            </div>
          )}

          {sonMesaj && (
            <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
              {sonMesaj}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={ileri}
              disabled={calisiyor || bitti}
              className="rounded-xl bg-gold px-6 py-3 text-base font-bold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40"
            >
              {calisiyor ? "Çalışıyor…" : bitti ? "Tamamlandı ✓" : "İleri →"}
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={otomatik}
                onChange={(e) => setOtomatik(e.target.checked)}
                disabled={calisiyor}
                className="h-4 w-4 rounded border-royal/40 bg-midnight-card"
              />
              Otomatik ilerle (sonuna kadar)
            </label>
            <button
              onClick={sifirlaTik}
              disabled={calisiyor || karakterSayisi === 0}
              className="ml-auto rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 ring-1 ring-red-400/30 transition-colors hover:bg-red-500/20 disabled:opacity-40"
            >
              🗑 Sıfırla
            </button>
          </div>
        </div>

        {/* Log */}
        {durum.log.length > 0 && (
          <div className="rounded-2xl bg-midnight-card/40 p-4 ring-1 ring-royal/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">İşlem günlüğü</p>
            <ul className="space-y-1.5 text-sm">
              {[...durum.log].reverse().slice(0, 12).map((l, i) => (
                <li key={i} className="flex gap-2 text-slate-300">
                  <span aria-hidden className="text-slate-600">·</span>
                  <span>{l.m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sağ: tüm adım çizelgesi */}
      <ol className="space-y-1 rounded-2xl bg-midnight-card/40 p-3 ring-1 ring-royal/20">
        {adimlar.map((a, i) => {
          const tamamlandi = i < durum.adim;
          const aktif = i === durum.adim;
          return (
            <li
              key={a.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                aktif
                  ? "bg-royal/40 font-semibold text-gold-light"
                  : tamamlandi
                    ? "text-slate-500"
                    : "text-slate-400"
              }`}
            >
              <span aria-hidden className="w-4 shrink-0 text-center">
                {tamamlandi ? "✓" : a.ikon}
              </span>
              <span className="min-w-0 flex-1 truncate">{a.baslik}</span>
              <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-slate-600">{a.faz}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
