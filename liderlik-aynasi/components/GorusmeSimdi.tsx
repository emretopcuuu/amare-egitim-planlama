"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dakikaCevir } from "@/lib/kampProgrami";

// Canlı "şimdi görüşmen" şeridi — Ayna Eşin görüşmesinin saati geldiğinde ana
// sayfada belirir: "ŞİMDİ: X ile görüşme (21:00)". Saati gelmemişse sıradakini
// gösterir. Her iki taraf da aynı slotu paylaşır (ajanda simetrik). 30 sn'de tazelenir.

type Gorusme = { slot: string; esAd: string; benimTamam: boolean };

const SLOT_DK = 50; // her görüşme penceresi ~50 dk

function istanbulDakika(): number {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [s, d] = f.format(new Date()).split(":").map(Number);
  return s * 60 + d;
}

export default function GorusmeSimdi({ gorusmeler }: { gorusmeler: Gorusme[] }) {
  const [dk, setDk] = useState<number | null>(null);

  useEffect(() => {
    const g = () => setDk(istanbulDakika());
    g();
    const id = setInterval(g, 30_000);
    return () => clearInterval(id);
  }, []);

  if (dk === null || gorusmeler.length === 0) return null;

  const sirali = gorusmeler
    .map((g) => ({ ...g, bas: dakikaCevir(g.slot) }))
    .sort((a, b) => a.bas - b.bas);

  const aktif = sirali.find((g) => dk >= g.bas && dk < g.bas + SLOT_DK);
  const siradaki = aktif ? null : sirali.find((g) => g.bas > dk);

  // Şu an görüşme yok ve sıradaki de yoksa (hepsi geçti) — şerit gizli.
  if (!aktif && !siradaki) return null;

  if (aktif) {
    return (
      <Link
        href="/ayna-esi"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]"
      >
        <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-200">
            ŞİMDİ · {aktif.slot} — {aktif.esAd} ile görüşme
          </p>
          <p className="text-xs text-slate-300">
            {aktif.benimTamam ? "Tamamladın ✓ — detayları aç" : "Eşinle buluş, dokunup detayları aç →"}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/ayna-esi"
      className="mt-3 flex items-center gap-3 rounded-2xl border border-gold/35 bg-gold/[0.08] px-4 py-2.5"
    >
      <span aria-hidden className="text-lg">🕒</span>
      <p className="min-w-0 flex-1 text-sm text-slate-200">
        Sıradaki görüşmen <span className="font-bold text-gold-light">{siradaki!.slot}</span>
        {" · "}
        {siradaki!.esAd}
      </p>
    </Link>
  );
}
