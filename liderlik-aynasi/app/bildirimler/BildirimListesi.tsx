"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { Bildirim } from "@/lib/bildirim";

// Bildirim gelen kutusu (DB tabanlı). Açılınca tüm okunmamışları okundu işaretler
// (zil rozeti sıfırlanır); hangileri başta okunmamışsa "yeni" ile gösterir.
// Türe göre renk/ikon, zaman gruplaması ve bağlamsal aksiyon butonu.

type Tur = { ikon: string; renk: string; serit: string; cta: string };

// Tür, önce url'den sonra başlık anahtarından çıkarılır (DB'de tür kolonu yok).
function turBul(b: Bildirim): Tur {
  const u = b.url ?? "";
  const s = b.baslik.toLocaleLowerCase("tr");
  if (u.startsWith("/program") || s.includes("dk sonra"))
    return { ikon: "⏰", renk: "text-amber-300", serit: "bg-amber-400", cta: "Programı aç" };
  if (u.startsWith("/analizlerim") || s.includes("derinleş") || s.includes("analiz"))
    return { ikon: "🌀", renk: "text-gold-light", serit: "bg-gold", cta: "Dinle" };
  // Altın görev DUYURUSU — herkese giden hype broadcast'i (bkz. lib/tik.ts),
  // alıcının KENDİ görevi olduğu anlamına gelmez. "Göreve git" (kesin vaat)
  // yerine nötr bir CTA — tıklayınca boş ekran gelince "yalan söyledi" hissi
  // yaratmasın (saha geri bildirimi). Genel /gorevler dalından ÖNCE kontrol edilmeli.
  if (s.includes("altın görev") && s.includes("çıktı"))
    return { ikon: "⚡", renk: "text-gold-light", serit: "bg-gold", cta: "Görevlerine bak" };
  if (u.startsWith("/gorevler") || s.includes("görev"))
    return { ikon: "🤖", renk: "text-sky-300", serit: "bg-sky-400", cta: "Göreve git" };
  if (u.startsWith("/degerlendir") || s.includes("değerlendir") || s.includes("fısılt"))
    return { ikon: "👁", renk: "text-violet-300", serit: "bg-violet-400", cta: "Bak" };
  if (u.startsWith("/yansiman") || s.includes("yansıma") || s.includes("ses"))
    return { ikon: "🌊", renk: "text-teal-300", serit: "bg-teal-400", cta: "Dinle" };
  if (s.includes("senkron"))
    return { ikon: "⏱", renk: "text-gold-light", serit: "bg-gold", cta: "Şimdi yap" };
  if (s.includes("takdir") || s.includes("günaydın") || s.includes("söz") || s.includes("kudos"))
    return { ikon: "💛", renk: "text-pink-300", serit: "bg-pink-400", cta: "Aç" };
  return { ikon: "🔔", renk: "text-slate-300", serit: "bg-slate-500", cta: "Aç" };
}

// Başlıktaki baştaki emoji/sembolü ayıkla — bazı emojiler (🪞) Windows'ta kutu (□)
// çıkıyordu; ikonu biz veriyoruz, başlık metni temiz kalsın.
function baslikTemiz(s: string): string {
  const t = s.replace(/^[^\p{L}\p{N}"'(]+/u, "").trim();
  return t || s;
}

function istTarih(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
}
function grupAdi(ts: string): string {
  const g = istTarih(new Date(ts));
  if (g === istTarih(new Date())) return "Bugün";
  if (g === istTarih(new Date(Date.now() - 86_400_000))) return "Dün";
  return "Daha önce";
}
function zamanMetni(ts: string): string {
  const fark = Date.now() - new Date(ts).getTime();
  if (fark < 60_000) return "az önce";
  if (fark < 3_600_000) return `${Math.floor(fark / 60_000)} dk önce`;
  if (fark < 86_400_000) return `${Math.floor(fark / 3_600_000)} sa önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function BildirimListesi({ bildirimler }: { bildirimler: Bildirim[] }) {
  // Başta okunmamış olanları sabitle (görsel "yeni"); açılınca hepsini okundu yap.
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
      <div className="rounded-2xl border border-royal/20 bg-midnight-card/50 px-6 py-12 text-center">
        <p className="text-4xl" aria-hidden>🔕</p>
        <p className="mt-3 text-base font-medium text-slate-300">Henüz bildirim yok</p>
        <p className="mt-1 text-sm text-slate-500">AYNA seni izliyor — bir şey olduğunda burada toplanır.</p>
      </div>
    );
  }

  let oncekiGrup = "";

  return (
    <div className="space-y-2">
      {yeniIds.size > 0 && (
        <p className="px-1 text-sm font-semibold text-gold-light">{yeniIds.size} yeni bildirim</p>
      )}
      <ul className="space-y-2.5">
        {bildirimler.map((b) => {
          const yeni = yeniIds.has(b.id);
          const tur = turBul(b);
          const grup = grupAdi(b.created_at);
          const grupGoster = grup !== oncekiGrup;
          oncekiGrup = grup;

          const kart = (
            <div
              className={`relative overflow-hidden rounded-2xl border pl-4 pr-4 transition-colors ${
                yeni ? "border-gold/40 bg-gold/[0.06]" : "border-white/10 bg-midnight-card/50"
              } ${b.url ? "hover:border-gold/55" : ""}`}
            >
              {/* Sol renk şeridi — türü 1 bakışta belli eder */}
              <span className={`absolute inset-y-0 left-0 w-1.5 ${tur.serit}`} aria-hidden />
              <div className="flex items-start gap-3 py-3.5 pl-2">
                <span className={`mt-0.5 shrink-0 text-2xl ${tur.renk}`} aria-hidden>
                  {tur.ikon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{baslikTemiz(b.baslik)}</p>
                    {yeni && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Okunmadı" />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {b.govde}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[0.7rem] text-slate-500">{zamanMetni(b.created_at)}</span>
                    {b.url && (
                      <span
                        className={`rounded-full border border-white/15 px-3 py-1 text-xs font-semibold ${tur.renk}`}
                      >
                        {tur.cta} →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );

          return (
            <Fragment key={b.id}>
              {grupGoster && (
                <li className="px-1 pb-0.5 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pt-0">
                  {grup}
                </li>
              )}
              <li>
                {b.url ? (
                  <Link href={b.url} className="block">
                    {kart}
                  </Link>
                ) : (
                  kart
                )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
