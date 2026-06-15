"use client";

import { useEffect, useState } from "react";

// #7 İlk-kez bağlamsal ipucu (coachmark): bir özelliği ilk kullanırken küçük,
// kapatılabilir bir yönlendirme gösterir; kapatınca (localStorage) bir daha
// çıkmaz. Onboarding turunun ötesinde, yerinde rehberlik.
export default function IlkIpucu({
  anahtar,
  etiket,
}: {
  anahtar: string;
  etiket: string;
}) {
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(anahtar)) setGoster(true);
    } catch {}
  }, [anahtar]);

  function kapat() {
    try {
      localStorage.setItem(anahtar, "1");
    } catch {}
    setGoster(false);
  }

  if (!goster) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-light">
      <span aria-hidden>💡</span>
      <span className="flex-1">{etiket}</span>
      <button
        onClick={kapat}
        aria-label="Anladım"
        className="shrink-0 px-1 text-gold-light/70 hover:text-gold-light"
      >
        ✕
      </button>
    </div>
  );
}
