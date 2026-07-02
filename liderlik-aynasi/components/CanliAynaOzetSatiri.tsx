"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CanliAyna from "@/components/CanliAyna";

// Hazırlık özeti "Canlı Aynan (fotoğraf)" satırının açılır paneli: kişi burada
// hem ekstra referans fotoğrafı ekleyebilir (CanliAyna zaten destekliyor) hem
// de isterse 3 çekirdek açıyı baştan çekebilir (katılımcı isteği: "değiştirebilsin").
export default function CanliAynaOzetSatiri({ yuzVar }: { yuzVar: boolean }) {
  const router = useRouter();
  const [sifirlandi, setSifirlandi] = useState(false);
  const [sifirlaniyor, setSifirlaniyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function bastanCek() {
    if (sifirlaniyor) return;
    setSifirlaniyor(true);
    setHata(false);
    try {
      const r = await fetch("/api/hazirlik-sifirla", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ne: "foto" }),
      });
      const d = await r.json().catch(() => null);
      if (d?.ok) {
        setSifirlandi(true);
        router.refresh();
        return;
      }
      setHata(true);
    } catch {
      setHata(true);
    } finally {
      setSifirlaniyor(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* key: sıfırlama sonrası bileşeni tazeden yeniden mont et (CanliAyna'nın
          "bitti" state'i yalnız ilk mount'ta varMi'den okunur). */}
      <CanliAyna key={sifirlandi ? "sifirlandi" : "asil"} varMi={yuzVar && !sifirlandi} />
      {yuzVar && !sifirlandi && (
        <button
          type="button"
          onClick={bastanCek}
          disabled={sifirlaniyor}
          className="text-xs font-medium text-amber-300 underline-offset-4 hover:underline disabled:opacity-50"
        >
          {sifirlaniyor ? "…" : "3 açıyı baştan çek →"}
        </button>
      )}
      {hata && <p className="text-xs text-red-400">Bir şeyler ters gitti, tekrar dene.</p>}
    </div>
  );
}
