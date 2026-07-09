"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { pushDurumOku, pushAboneOl } from "@/lib/pushAbone";

const t = tr.bildirim;

// [#8] NAZİK + KAPATILABİLİR bildirim şeridi. İzin/abonelik yoksa birçok
// yüzeyde (koç, grup…) ince bir "Bildirimleri aç" çağrısı gösterir. Kişi
// kapatabilir — kapatma YALNIZ bu oturum için (sessionStorage); yeni oturumda
// yine nazikçe hatırlatır. Israrcı değil: tek satır, tek dokunuş, kapat butonu.
export default function BildirimSerit({ yer = "genel" }: { yer?: string }) {
  const [goster, setGoster] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const anahtar = `la_bildirim_serit_kapali_${yer}`;

  useEffect(() => {
    (async () => {
      try {
        if (sessionStorage.getItem(anahtar) === "1") return; // bu oturum kapatıldı
      } catch {
        /* depolama kapalı */
      }
      const durum = await pushDurumOku();
      // Yalnız gerçekten AÇILABİLİR durumda göster (abone/iOS-kurulum/red → sus).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (durum === "kapali") setGoster(true);
    })();
  }, [anahtar]);

  function kapat() {
    setGoster(false);
    try {
      sessionStorage.setItem(anahtar, "1");
    } catch {
      /* yut */
    }
  }

  async function ac() {
    if (mesgul) return;
    setMesgul(true);
    try {
      const ok = await pushAboneOl();
      if (ok) setGoster(false); // açıldı → şerit kaybolur
      else kapat(); // reddedildi/başarısız → ısrar etme, bu oturum sus
    } catch {
      kapat();
    } finally {
      setMesgul(false);
    }
  }

  if (!goster) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2">
      <span aria-hidden className="text-base">🔔</span>
      <p className="min-w-0 flex-1 text-xs leading-snug text-slate-300">{t.seritMetin}</p>
      <button
        onClick={ac}
        disabled={mesgul}
        className="shrink-0 rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-gold-light transition-colors hover:bg-gold/35 disabled:opacity-50"
      >
        {mesgul ? t.seritAciliyor : t.seritAc}
      </button>
      <button
        onClick={kapat}
        aria-label={t.seritKapat}
        className="shrink-0 px-1 text-slate-500 transition-colors hover:text-slate-300"
      >
        ✕
      </button>
    </div>
  );
}
