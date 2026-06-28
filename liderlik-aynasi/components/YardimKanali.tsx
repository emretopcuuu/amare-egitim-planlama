"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// Aday UX #8 — "Takıldım / yardım" kanalı. Her katılımcı ekranında küçük bir
// yardım düğmesi: sık sorulanlar + "en yakın görevliye sor" yönlendirmesi.
// Tam-ekran akışlarda ve admin'de gizlenir.
const GIZLI = ["/admin", "/giris", "/ekran", "/sahne", "/kiosk"];

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

export default function YardimKanali() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);

  if (GIZLI.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return null;

  return (
    // Üstte, sağ köşede — "kimsin?" bandının (ad çipi) yanında. Eskiden alt
    // köşedeydi ve alt menü + içerik üstünü kapatıyordu; yukarı alındı.
    <div className="fixed right-3 top-3 z-50 flex flex-col items-end print:hidden">
      <button
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        aria-label="Yardım"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-royal-light/40 bg-midnight-card/90 text-xl text-gold-light shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-95"
      >
        {acik ? "✕" : "?"}
      </button>
      {acik && (
        <div
          role="dialog"
          aria-label="Yardım"
          className="mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-royal/40 bg-midnight-card p-4 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-gold-light">🛟 Yardım</p>
            <button
              onClick={() => setAcik(false)}
              aria-label="Kapat"
              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-gold-light"
            >
              ✕
            </button>
          </div>
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
      )}
    </div>
  );
}
