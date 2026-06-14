"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.profilFoto;

// Kamp öncesi profil fotoğrafı yükleme — hazırlık hub'ında satır içi.
export default function ProfilFoto({ varMi = false }: { varMi?: boolean }) {
  const router = useRouter();
  const girisRef = useRef<HTMLInputElement>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(varMi);

  function secildi(f: File | null) {
    setHata(null);
    if (!f) return;
    setDosya(f);
    setOnizleme(URL.createObjectURL(f));
  }

  async function yukle() {
    if (!dosya || mesgul) return;
    setMesgul(true);
    setHata(null);
    try {
      const form = new FormData();
      form.append("foto", dosya);
      const res = await fetch("/api/profil-foto", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      setBitti(true);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  if (bitti && !onizleme) {
    return (
      <button
        onClick={() => {
          setBitti(false);
          girisRef.current?.click();
        }}
        className="text-sm text-emerald-400 underline-offset-4 hover:underline"
      >
        {t.degistir}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={girisRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={(e) => secildi(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {onizleme ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={onizleme}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-royal/30"
          />
          <div className="flex flex-1 gap-2">
            <button
              onClick={yukle}
              disabled={mesgul}
              className="btn-kor flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-50"
            >
              {mesgul ? t.yukleniyor : t.kaydet}
            </button>
            <button
              onClick={() => {
                setOnizleme(null);
                setDosya(null);
              }}
              className="h-11 rounded-xl px-3 text-sm text-slate-400 hover:text-slate-200"
            >
              {t.vazgec}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => girisRef.current?.click()}
          className="btn-kor flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold"
        >
          {t.sec}
        </button>
      )}
      {hata && <p className="text-sm text-red-400">{hata}</p>}
    </div>
  );
}
