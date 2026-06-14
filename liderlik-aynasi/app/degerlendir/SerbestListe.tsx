"use client";

import { useState } from "react";
import KisiSatiri from "./KisiSatiri";
import { tr } from "@/lib/i18n/tr";

type Kisi = {
  id: string;
  ad: string;
  takim: string | null;
  yapilan: number;
  foto?: string | null;
};

// İstemci tarafı isim filtresi: kamp ölçeğinde (≤ ~60 kişi) tüm liste
// sunucudan gelir, arama yalnızca görünümü daraltır.
export default function SerbestListe({
  kisiler,
  toplam,
  kilitli,
}: {
  kisiler: Kisi[];
  toplam: number;
  kilitli: boolean;
}) {
  const [arama, setArama] = useState("");
  const normalize = (s: string) => s.toLocaleLowerCase("tr-TR");
  const filtreli = arama.trim()
    ? kisiler.filter((k) => normalize(k.ad).includes(normalize(arama.trim())))
    : kisiler;

  return (
    <div className="mt-4">
      <input
        type="search"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder={tr.degerlendir.serbestAra}
        aria-label={tr.degerlendir.serbestAra}
        className="h-11 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      {filtreli.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{tr.degerlendir.serbestBosFiltre}</p>
      ) : (
        <ul className="mt-2 divide-y divide-royal/20">
          {filtreli.map((k) => (
            <li key={k.id}>
              <KisiSatiri
                hedefId={k.id}
                ad={k.ad}
                altYazi={k.takim}
                yapilan={k.yapilan}
                toplam={toplam}
                kilitli={kilitli}
                fotoUrl={k.foto}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
