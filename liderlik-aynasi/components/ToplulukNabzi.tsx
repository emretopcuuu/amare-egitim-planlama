"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.nabiz;

// #5 Topluluk nabzı: "şu an X kişi görev başında", "bugün X 'Hayır' kutlandı"
// gibi canlı kolektif aktiviteyi gösterir — yalnız değilsin hissi (ambient).
export default function ToplulukNabzi() {
  const [mesajlar, setMesajlar] = useState<string[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let iptal = false;
    fetch("/api/nabiz")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (iptal || !d) return;
        const m: string[] = [];
        if (d.gorevde > 0) m.push(t.gorevde(d.gorevde));
        if (d.red > 0) m.push(t.red(d.red));
        if (d.takdir > 0) m.push(t.takdir(d.takdir));
        setMesajlar(m);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    if (mesajlar.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % mesajlar.length), 4000);
    return () => clearInterval(id);
  }, [mesajlar.length]);

  if (mesajlar.length === 0) return null;
  return (
    <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-xs text-slate-300">
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
      <span key={i} className="sahne-giris">
        {mesajlar[i % mesajlar.length]}
      </span>
    </div>
  );
}
