"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.geriSayim;

function hesapla(hedef: Date) {
  const kalan = hedef.getTime() - Date.now();
  if (kalan <= 0) return null;
  const dk = Math.floor(kalan / 60000);
  const saat = Math.floor(dk / 60);
  const gun = Math.floor(saat / 24);
  const kalanSaat = saat % 24;
  const kalanDk = dk % 60;
  return { gun, saat: kalanSaat, dakika: kalanDk };
}

function formatBekleme(hedef: Date): string {
  const sure = hesapla(hedef);
  if (!sure) return t.gecti;

  const hedefStr = hedef.toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sure.gun === 0 && sure.saat === 0) {
    return `${t.dakika(sure.dakika)} ${t.sonra}`;
  }
  if (sure.gun === 0) {
    const bugunMu =
      hedef.toDateString() === new Date().toDateString() || sure.saat < 12;
    if (bugunMu) return t.bugun(hedefStr);
    return `${t.saat(sure.saat)} ${t.sonra}`;
  }
  return `${t.gun(sure.gun)} ${t.saat(sure.saat)} ${t.sonra}`;
}

// Sıradaki dalgayı ne zaman açacağının geri sayımını gösterir.
// hedefZaman: ISO 8601 string (adminin ayarladığı otomatik açılış saati).
export default function GeriSayim({ hedefZaman }: { hedefZaman: string }) {
  const hedef = new Date(hedefZaman);
  const [metin, setMetin] = useState(() => formatBekleme(hedef));

  useEffect(() => {
    const id = setInterval(() => setMetin(formatBekleme(hedef)), 30_000);
    return () => clearInterval(id);
  }, [hedef]);

  return (
    <div className="mt-4 rounded-2xl border border-royal-light/30 bg-midnight-soft/60 px-5 py-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {t.baslik}
      </p>
      <p className="mt-1 text-lg font-bold text-gold-light">{metin}</p>
    </div>
  );
}
