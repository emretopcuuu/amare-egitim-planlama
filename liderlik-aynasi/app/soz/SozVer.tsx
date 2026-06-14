"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, suDalgasi } from "@/lib/his";
import SesKaydedici from "./SesKaydedici";

const t = tr.kapanisSoz;

export default function SozVer() {
  const router = useRouter();
  const [temmuz, setTemmuz] = useState("");
  const [agustos, setAgustos] = useState("");
  const sesBlob = useRef<Blob | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const agustosGecerli = Number(agustos) >= 100;
  const gecerli = Number(temmuz) >= 0 && temmuz !== "" && agustosGecerli;

  async function gonder() {
    if (!gecerli || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const form = new FormData();
      form.append("temmuz", String(Math.floor(Number(temmuz))));
      form.append("agustos", String(Math.floor(Number(agustos))));
      if (sesBlob.current) {
        const uz = sesBlob.current.type.includes("mp4") ? "mp4" : "webm";
        form.append("ses", new File([sesBlob.current], `soz.${uz}`, { type: sesBlob.current.type }));
      }
      const res = await fetch("/api/soz", { method: "POST", body: form });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hata);
        return;
      }
      titret([12, 40, 12]);
      suDalgasi();
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="kart-cam space-y-5 rounded-3xl p-5">
      <div>
        <label className="block text-sm font-semibold text-gold-light">{t.temmuzEtiket}</label>
        <input
          type="number"
          inputMode="numeric"
          enterKeyHint="done"
          min={0}
          value={temmuz}
          onChange={(e) => setTemmuz(e.target.value)}
          placeholder={t.temmuzYer}
          className="mt-2 h-14 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 text-xl font-bold text-slate-100 outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gold-light">{t.agustosEtiket}</label>
        <input
          type="number"
          inputMode="numeric"
          enterKeyHint="done"
          min={100}
          value={agustos}
          onChange={(e) => setAgustos(e.target.value)}
          placeholder={t.agustosYer}
          className={`mt-2 h-14 w-full rounded-xl border bg-midnight-soft px-4 text-xl font-bold text-slate-100 outline-none focus:border-gold ${
            agustos !== "" && !agustosGecerli ? "border-red-400/60" : "border-royal-light/30"
          }`}
        />
        <p className="mt-1.5 text-xs text-slate-400">{t.agustosNot}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gold-light">{t.sesBaslik}</p>
        <p className="mt-1 mb-2 text-xs italic text-slate-400">{t.sesAciklama}</p>
        <SesKaydedici onKayit={(b) => (sesBlob.current = b)} />
      </div>

      {hata && <p className="text-sm font-medium text-red-400">{hata}</p>}

      <button
        onClick={gonder}
        disabled={!gecerli || gonderiliyor}
        className="parilti btn-kor flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-40"
      >
        {gonderiliyor ? t.gonderiliyor : t.gonder}
      </button>
    </div>
  );
}
