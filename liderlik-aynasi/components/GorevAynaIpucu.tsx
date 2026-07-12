"use client";

/* UX paketi #9 — görev kartının köşesindeki AYNA artık İŞLEVSEL: dokununca
   görevin ilk ipucunu (yoksa "Netleştir'i kullan" yönlendirmesini) mini laf
   balonuyla söyler. Süs olan maskot, yardımcıya dönüşür. */

import { useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AynaYuzu, { type AynaDurum } from "@/components/AynaYuzu";
import AynaLaf from "@/components/AynaLaf";

export default function GorevAynaIpucu({
  durum,
  ipucu,
}: {
  durum: AynaDurum;
  ipucu?: string | null;
}) {
  const [acik, setAcik] = useState(false);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dokun() {
    setAcik(true);
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => setAcik(false), 4500);
  }

  return (
    <span className="relative -mt-1 shrink-0">
      <button type="button" onClick={dokun} aria-label="AYNA'dan ipucu al" className="cursor-pointer">
        <AynaYuzu durum={acik ? "konusuyor" : durum} boyut={44} />
      </button>
      {acik && (
        <AynaLaf
          metin={ipucu?.trim() || tr.gorevler.aynaIpucuVarsayilan}
          kuyruk="alt"
          sinif="absolute -top-1 right-0 z-10 -translate-y-full"
        />
      )}
    </span>
  );
}
