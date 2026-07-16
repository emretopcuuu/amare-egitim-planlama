"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.duvar;

export default function FotoYukle() {
  const router = useRouter();
  const dosyaGiris = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [altYazi, setAltYazi] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gitti, setGitti] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  function secildi(f: File | null) {
    if (!f) return;
    setDosya(f);
    setHata(null);
    setOnizleme((eski) => {
      if (eski) URL.revokeObjectURL(eski);
      return URL.createObjectURL(f);
    });
  }

  async function gonder() {
    if (!dosya || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    setGitti(false);
    try {
      const form = new FormData();
      form.append("foto", dosya);
      if (altYazi.trim()) form.append("altYazi", altYazi.trim());
      const res = await fetch("/api/foto", { method: "POST", body: form });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hata);
        return;
      }
      setDosya(null);
      setOnizleme((eski) => {
        if (eski) URL.revokeObjectURL(eski);
        return null;
      });
      setAltYazi("");
      setGitti(true);
      setTimeout(() => setGitti(false), 4000);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="kart-cam rounded-3xl p-5">
      <input
        ref={dosyaGiris}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => secildi(e.target.files?.[0] ?? null)}
      />

      {onizleme ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={onizleme}
            alt=""
            className="mx-auto max-h-60 w-full rounded-2xl object-contain"
          />
          <textarea
            value={altYazi}
            onChange={(e) => setAltYazi(e.target.value.slice(0, 140))}
            rows={2}
            placeholder={t.altYaziYer}
            className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
          />
          <div className="mt-2">
            <MikrofonButonu
              onMetin={(p) => setAltYazi((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 140))}
            />
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => dosyaGiris.current?.click()}
              disabled={gonderiliyor}
              className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
            >
              {t.yeniden}
            </button>
            <button
              onClick={gonder}
              disabled={gonderiliyor}
              className="flex-1 btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {gonderiliyor ? t.gonderiliyor : t.gonder}
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => dosyaGiris.current?.click()}
          className="flex h-16 w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/25 text-lg font-semibold text-slate-200 hover:bg-white/[0.04]"
        >
          {t.yukle}
        </button>
      )}

      {gitti && (
        <p className="mt-3 text-center text-sm font-semibold text-emerald-300">
          {t.gonderildi}
        </p>
      )}
      {hata && (
        <p className="mt-3 text-center text-sm font-medium text-red-400">{hata}</p>
      )}
    </section>
  );
}
