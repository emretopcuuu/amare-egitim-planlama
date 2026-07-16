"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.yayin;

type Kisi = { id: string; ad: string; takim: string | null; telefonVar: boolean };

export default function DuyuruGonder({
  takimlar,
  kisiler = [],
}: {
  takimlar: string[];
  kisiler?: Kisi[];
}) {
  const [baslik, setBaslik] = useState("");
  const [govde, setGovde] = useState("");
  const [url, setUrl] = useState("");
  const [hedef, setHedef] = useState("herkes");
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; metin: string } | null>(null);

  const gecerli = baslik.trim().length > 1 && govde.trim().length > 1;

  function hedefAd() {
    if (hedef === "herkes") return t.herkes;
    if (hedef.startsWith("kisi:")) {
      const id = hedef.slice(5);
      return kisiler.find((k) => k.id === id)?.ad ?? hedef;
    }
    return hedef;
  }

  async function gonder() {
    if (!gecerli || gonderiliyor) return;
    setGonderiliyor(true);
    setSonuc(null);
    try {
      const res = await fetch("/api/admin/duyuru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baslik: baslik.trim(), govde: govde.trim(), url: url.trim(), hedef }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        setSonuc({ ok: false, metin: v?.hata ?? t.hata });
        return;
      }
      setSonuc({ ok: true, metin: t.gonderildi(hedefAd(), v?.sayi ?? null) });
      setBaslik("");
      setGovde("");
      setUrl("");
      setOnay(false);
    } catch {
      setSonuc({ ok: false, metin: t.hata });
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kart-3d space-y-4 rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <div>
          <label className="text-xs font-semibold text-slate-400">{t.baslikEtiket}</label>
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            maxLength={80}
            placeholder={t.baslikYer}
            className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-midnight px-3 text-sm text-slate-100 outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400">{t.govdeEtiket}</label>
          <textarea
            value={govde}
            onChange={(e) => setGovde(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={t.govdeYer}
            className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-midnight p-3 text-sm text-slate-100 outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400">{t.linkEtiket}</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={300}
            placeholder={t.linkYer}
            className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-midnight px-3 text-sm text-slate-100 outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400">{t.hedefEtiket}</label>
          <select
            value={hedef}
            onChange={(e) => { setHedef(e.target.value); setOnay(false); }}
            className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-midnight px-3 text-sm text-slate-100 outline-none focus:border-gold"
          >
            <option value="herkes">{t.herkes}</option>
            {takimlar.length > 0 && (
              <optgroup label="— Takımlar —">
                {takimlar.map((tk) => (
                  <option key={tk} value={tk}>{tk}</option>
                ))}
              </optgroup>
            )}
            {kisiler.length > 0 && (
              <optgroup label="— Kişiler —">
                {kisiler.map((k) => (
                  <option key={k.id} value={`kisi:${k.id}`}>
                    {k.ad}{k.takim ? ` (${k.takim})` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-1 h-4 w-4 accent-gold" />
          <span>{t.onayMetin(hedefAd())}</span>
        </label>

        <button
          onClick={gonder}
          disabled={!gecerli || !onay || gonderiliyor}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {gonderiliyor ? t.gonderiliyor : `🔔 ${t.gonder}`}
        </button>

        {sonuc && (
          <p className={`text-sm font-medium ${sonuc.ok ? "text-emerald-400" : "text-red-400"}`}>{sonuc.metin}</p>
        )}
      </div>
    </div>
  );
}
