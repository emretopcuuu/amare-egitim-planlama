"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Üst-orta kimlik çipi + YARDIM. Çip her zaman en tepede sabit durur; ALTINDAKİ
// boşluk gerçek yüksekliği kadar yer ayırır (sayfa onun altından başlar, çakışma
// olmaz). Çipe dokununca yardım (SSS) açılır — ayrı bir "?" düğmesi yok.
// Not: env(safe-area-inset-top) içeren ölçüler Tailwind arbitrary value'da
// (calc + virgül) güvenilmez üretiliyor; bu yüzden INLINE style ile veriyoruz.

const SSS: { s: string; c: string }[] = [
  {
    s: "Puanlarım gizli mi?",
    c: "Evet. Verdiğin puanlar isimsizdir — kimse kimin ne verdiğini göremez. Raporlar yalnız özet olarak açılır.",
  },
  {
    s: "Yanlış puan verdim, düzeltebilir miyim?",
    c: "Dalga açıkken aynı kişiyi yeniden açıp güncelleyebilirsin. Zaten her dalga yeni bir değerlendirmedir.",
  },
  {
    s: "Yorum neden isteniyor?",
    c: "6’nın altındaki puanlarda kısa, yapıcı bir not istenir — böylece geri bildirim kırıcı değil yol gösterici olur.",
  },
  {
    s: "Bağlantım koptu, puanım gitti mi?",
    c: "Hayır. Her şey cihazında taslak olarak saklanır; internet gelince kendiliğinden gönderilir.",
  },
  {
    s: "Kodumla giremiyorum.",
    c: "En yakın kamp görevlisine söyle — kodunu birlikte kontrol edebilirsiniz.",
  },
];

export default function KimsinBantClient({
  ad,
  avatarUrl,
  ilkHarf,
  okunmamis = 0,
}: {
  ad: string;
  avatarUrl: string | null;
  ilkHarf: string;
  okunmamis?: number;
}) {
  const [acik, setAcik] = useState(false);

  // CANLI ROZET: okunmamış sayısını periyodik + sekme/uygulama öne gelince yokla
  // (sayfa yenilemeden güncellensin). Başlangıç sunucudan gelen değer.
  const [sayi, setSayi] = useState(okunmamis);
  useEffect(() => setSayi(okunmamis), [okunmamis]); // sayfa geçişinde sunucu değeriyle eşitle
  useEffect(() => {
    let durdu = false;
    async function cek() {
      try {
        const r = await fetch("/api/bildirimler");
        if (!r.ok) return;
        const d = await r.json();
        if (!durdu && typeof d?.okunmamis === "number") setSayi(d.okunmamis);
      } catch {}
    }
    const id = setInterval(cek, 25_000);
    function gorunur() {
      if (document.visibilityState === "visible") cek();
    }
    document.addEventListener("visibilitychange", gorunur);
    window.addEventListener("focus", cek);
    return () => {
      durdu = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", gorunur);
      window.removeEventListener("focus", cek);
    };
  }, []);

  return (
    <>
      {/* Akışta yer kaplayan boşluk — çip içeriği örtmesin (gerçek yükseklik). */}
      <div
        aria-hidden
        className="shrink-0 print:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      />
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-4 print:hidden"
        style={{ top: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="relative">
          {/* Çip = yardım tetikleyici. Dokununca SSS açılır. */}
          <button
            onClick={() => setAcik((a) => !a)}
            aria-expanded={acik}
            aria-label={`${ad} — Yardım`}
            className="flex items-center gap-2 rounded-full border border-gold/30 bg-midnight-card/90 py-1.5 pl-3 pr-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:border-gold/50"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                aria-hidden
                className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-gold/40"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[0.7rem] font-bold text-gold-light ring-1 ring-gold/40"
              >
                {ilkHarf}
              </span>
            )}
            <span className="max-w-[48vw] truncate">{ad}</span>
            {/* Yardım ipucu — çipin sağında küçük "?" rozeti */}
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                acik ? "bg-gold text-[#1a1206]" : "bg-gold/20 text-gold-light"
              }`}
            >
              {acik ? "✕" : "?"}
            </span>
          </button>

          {/* Yardım paneli — çipin hemen altında açılır */}
          {acik && (
            <>
              <button
                aria-hidden
                tabIndex={-1}
                onClick={() => setAcik(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="dialog"
                aria-label="Yardım"
                className="absolute left-1/2 top-full z-50 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-royal/40 bg-midnight-card p-4 text-left shadow-2xl"
              >
                <p className="mb-2 text-sm font-bold text-gold-light">🛟 Yardım</p>
                <div className="space-y-1.5">
                  {SSS.map((q) => (
                    <details key={q.s} className="group rounded-xl bg-white/[0.03] px-3 py-2">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-200">
                        <span>{q.s}</span>
                        <span aria-hidden className="text-slate-500 transition-transform group-open:rotate-180">
                          ▾
                        </span>
                      </summary>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{q.c}</p>
                    </details>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-gold/30 bg-gold/[0.06] px-3 py-2.5 text-sm text-slate-200">
                  👋 <span className="font-semibold text-gold-light">Hâlâ takıldın mı?</span> En yakın
                  kamp görevlisine bu ekranı göster — birlikte çözersiniz.
                </div>
              </div>
            </>
          )}
          </div>

          {/* Zil — bildirim gelen kutusu; okunmamış sayısı rozette (soru işaretinin yanında) */}
          <Link
            href="/bildirimler"
            aria-label={`Bildirimler${sayi > 0 ? ` (${sayi} okunmamış)` : ""}`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-midnight-card/90 text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:border-gold/50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-[1.05rem] w-[1.05rem]"
              aria-hidden
            >
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1 5 1.6 6H4.4C5 14 6 13 6 9Z" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
            </svg>
            {sayi > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white">
                {sayi > 9 ? "9+" : sayi}
              </span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
