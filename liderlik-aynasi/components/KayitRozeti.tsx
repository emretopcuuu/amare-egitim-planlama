"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { sesCal } from "@/lib/sesEfekti";

// [E8] "✓ Kaydedildi" MİKRO GÜVENCESİ — onboarding formlarının ortak, köşede
// yaşayan küçük kayıt rozetleri:
// - `basari` sayacı her ARTTIĞINDA 1.5 sn görünen yeşil "✓ Kaydedildi".
// - `hata` true olduğu sürece KALICI amber "⚠ Kaydedilemedi" satırı (bir
//   sonraki başarılı kayıtta çağıran taraf hata'yı false'a çeker).
// İnvaziv değildir: formların mevcut kaydetme akışına dokunmaz, yalnız sonucu
// dinler. position:fixed olduğundan ağacın neresinde render edildiği önemsizdir.
export default function KayitRozeti({
  basari,
  hata = false,
}: {
  // Her başarılı kayıtta bir artırılan sayaç (0 = henüz kayıt yok).
  basari: number;
  hata?: boolean;
}) {
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    if (basari <= 0) return;
    // Rozetin görünürlüğü dışarıdaki sayaca senkronlanır (bilinçli desen).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGoster(true);
    sesCal("kayit-zili");
    const id = setTimeout(() => setGoster(false), 1500);
    return () => clearTimeout(id);
  }, [basari]);

  if (!hata && !goster) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-4 z-[70] flex flex-col items-end gap-1.5"
    >
      {hata && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-950/85 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur">
          {tr.ortak.kaydedilemedi}
        </p>
      )}
      {!hata && goster && (
        <p className="sahne-giris rounded-xl border border-emerald-400/40 bg-emerald-950/85 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur">
          {tr.ortak.kaydedildi}
        </p>
      )}
    </div>
  );
}
