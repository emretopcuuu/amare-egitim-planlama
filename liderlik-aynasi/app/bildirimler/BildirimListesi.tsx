"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Bildirim } from "@/lib/bildirim";

// Bildirim gelen kutusu (DB tabanlı). Açılınca tüm okunmamışları okundu işaretler
// (zil rozeti sıfırlanır); hangileri başta okunmamışsa "yeni" noktasıyla gösterir.
// Her bildirimin tam gövdesi okunur; url'si varsa dokununca oraya (görev vb.) gider.

function zamanMetni(ts: string): string {
  const ms = new Date(ts).getTime();
  const fark = Date.now() - ms;
  if (fark < 60_000) return "az önce";
  if (fark < 3_600_000) return `${Math.floor(fark / 60_000)} dk önce`;
  if (fark < 86_400_000) return `${Math.floor(fark / 3_600_000)} sa önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export default function BildirimListesi({ bildirimler }: { bildirimler: Bildirim[] }) {
  // Başta okunmamış olanları sabitle (görsel "yeni" için); açılınca hepsini okundu yap.
  const [yeniIds] = useState(
    () => new Set(bildirimler.filter((b) => !b.okundu_at).map((b) => b.id))
  );

  useEffect(() => {
    if (yeniIds.size > 0) {
      fetch("/api/bildirimler", { method: "POST" }).catch(() => {});
    }
  }, [yeniIds]);

  if (bildirimler.length === 0) {
    return (
      <div className="rounded-2xl border border-royal/20 bg-midnight-card/40 px-6 py-10 text-center">
        <p className="text-3xl" aria-hidden>🔕</p>
        <p className="mt-2 text-sm text-slate-400">Henüz bildirim yok.</p>
        <p className="mt-1 text-xs text-slate-500">
          AYNA bir bildirim gönderdiğinde burada toplanır.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {bildirimler.map((b) => {
        const yeni = yeniIds.has(b.id);
        const kart = (
          <div
            className={`rounded-2xl border p-4 transition-colors ${
              yeni
                ? "border-gold/40 bg-gold/[0.06]"
                : "border-white/10 bg-midnight-card/50"
            } ${b.url ? "hover:border-gold/55" : ""}`}
          >
            <div className="flex items-start gap-2.5">
              {yeni && (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                  aria-label="Okunmadı"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{b.baslik}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {b.govde}
                </p>
                <p className="mt-1.5 text-[0.65rem] text-slate-500">
                  {zamanMetni(b.created_at)}
                  {b.url ? " · dokun, ilgili sayfaya git →" : ""}
                </p>
              </div>
            </div>
          </div>
        );
        return (
          <li key={b.id}>
            {b.url ? (
              <Link href={b.url} className="block">
                {kart}
              </Link>
            ) : (
              kart
            )}
          </li>
        );
      })}
    </ul>
  );
}
