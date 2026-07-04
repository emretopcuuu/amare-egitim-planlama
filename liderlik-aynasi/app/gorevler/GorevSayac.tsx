"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// D2 — son %20 zaman diliminde amber → kırmızı ısınma (kaygı değil, aciliyet).
function isiRenk(oran: number): string {
  const t = Math.max(0, Math.min(1, 1 - oran / 0.2)); // 0 = amber, 1 = kırmızı
  const k = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${k(245, 239)}, ${k(158, 68)}, ${k(11, 68)})`;
}

// #1 Görev geri sayım halkası: teslim saatine canlı sayar; yaklaştıkça
// yeşil → amber → kırmızı. Kaygı yaratmadan nazik aciliyet.
// D2 — cipa verilirse "3 sa kaldı" yerine kamp programındaki somut çıpa
// söylenir: "Akşam Yemeği başlamadan önce" (kalan süre title'da durur).
export default function GorevSayac({
  baslangic,
  bitis,
  sakin = false,
  cipa = null,
}: {
  baslangic: string;
  bitis: string;
  // UX #1: kişi "başladım" dediyse sayaç kaygılı titremez, tonu yumuşar.
  sakin?: boolean;
  // D2: due_at'a ±30 dk yakın program etkinliğinin adı (sunucu hesaplar).
  cipa?: string | null;
}) {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const bas = new Date(baslangic).getTime();
  const son = new Date(bitis).getTime();
  const kalan = son - simdi;
  const toplam = Math.max(1, son - bas);
  const oran = Math.max(0, Math.min(1, kalan / toplam)); // 1 → 0
  const gecti = kalan <= 0;

  const dk = Math.floor(kalan / 60000);
  const sureMetni = gecti
    ? "Süre doldu"
    : dk >= 60
      ? `${Math.floor(dk / 60)}s ${dk % 60}dk`
      : `${Math.floor(kalan / 60000)}:${String(Math.floor((kalan % 60000) / 1000)).padStart(2, "0")}`;
  const metin = !gecti && cipa ? tr.gorevler.cipaOnce(cipa) : sureMetni;

  // Sakin modda kırmızı yerine amber — "üzerinde çalışıyorsun", panik yok.
  // Normal modda son %20'de renk amber'den kırmızıya kademeli ısınır (D2).
  const renk = sakin
    ? gecti
      ? "#f59e0b"
      : oran < 0.25
        ? "#fbbf24"
        : "#34d399"
    : gecti
      ? "#ef4444"
      : oran < 0.2
        ? isiRenk(oran)
        : oran < 0.25
          ? "#f59e0b"
          : "#34d399";
  const r = 9;
  const cevre = 2 * Math.PI * r;
  // Son ~10 dk: nazik bir aciliyet — rozet titrer (kaygı değil, dürtü).
  // Sakin modda titreme yok.
  const kritik = !sakin && !gecti && kalan <= 10 * 60000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${kritik ? "gorev-titre" : ""}`}
      style={{ color: renk }}
      title={cipa && !gecti ? sureMetni : undefined}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          stroke={renk}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - oran)}
        />
      </svg>
      {metin}
    </span>
  );
}
