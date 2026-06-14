"use client";

import { useState } from "react";
import { DUYURU_SABLONLARI, type DuyuruSablonu } from "@/lib/duyuruSablonlari";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.duyuru;

// #9 Hazır duyuru: şablon butonları. Herkese push yüksek etkili olduğundan
// tek onaylı: şablona dokun → "gönderilsin mi?" → Evet.
export default function DuyuruSablonlari() {
  const [secili, setSecili] = useState<DuyuruSablonu | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(s: DuyuruSablonu) {
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/admin/duyuru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sablon: s.anahtar }),
      });
      if (!res.ok) {
        tost(t.hata, "hata");
        return;
      }
      tost(t.gonderildi(s.etiket), "basari");
      setSecili(null);
    } catch {
      tost(t.hata, "hata");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="text-lg font-semibold text-gold-light">{t.baslik}</h2>
      <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>

      {secili ? (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm font-medium text-slate-100">{t.onaySoru(secili.etiket)}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => gonder(secili)}
              disabled={gonderiliyor}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {gonderiliyor ? t.gonderiliyor : t.gonder}
            </button>
            <button
              onClick={() => setSecili(null)}
              disabled={gonderiliyor}
              className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
            >
              {t.vazgec}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DUYURU_SABLONLARI.map((s) => (
            <button
              key={s.anahtar}
              onClick={() => setSecili(s)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
            >
              <span aria-hidden>{s.ikon}</span>
              {s.etiket}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
