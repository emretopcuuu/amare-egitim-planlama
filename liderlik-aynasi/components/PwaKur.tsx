"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.bildirim;

// PWA "Ana ekrana ekle" — TEK TUŞ. İki kritik iş:
// 1) Service Worker'ı HER sayfada kaydeder → uygulama "kurulabilir" sayılır;
//    Chrome böylece kısayol (boş ikon) değil, manifest ikonuyla (logo) GERÇEK
//    uygulama kurar.
// 2) beforeinstallprompt'u yakalayıp tek tuşla yerel kurulum istemini açar.
// iOS'ta beforeinstallprompt yoktur → banner çıkmaz (oradaki yönerge AynaKurulum/
// TelefonaKur'da Paylaş → Ana Ekrana Ekle olarak anlatılır).

type KurulumOlayi = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KAPAT_ANAHTAR = "la_pwa_kur_kapat_v1";
// Admin/ekran/giriş gibi katılımcı-dışı yüzeylerde banner gösterme.
const GIZLI_ONEK = ["/admin", "/ekran", "/sahne", "/giris"];

export default function PwaKur() {
  const pathname = usePathname();
  const [olay, setOlay] = useState<KurulumOlayi | null>(null);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    // SW'yi global kaydet (kurulabilirlik kriteri her sayfada sağlansın).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Zaten kuruluysa (standalone) ya da kapatıldıysa banner yok.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(KAPAT_ANAHTAR) === "1") return;
    } catch {}

    function yakala(e: Event) {
      e.preventDefault();
      setOlay(e as KurulumOlayi);
      setGorunur(true);
    }
    window.addEventListener("beforeinstallprompt", yakala);
    // Kurulum tamamlanınca banner'ı kaldır.
    function kuruldu() {
      setGorunur(false);
      setOlay(null);
    }
    window.addEventListener("appinstalled", kuruldu);
    return () => {
      window.removeEventListener("beforeinstallprompt", yakala);
      window.removeEventListener("appinstalled", kuruldu);
    };
  }, []);

  async function kur() {
    if (!olay) return;
    try {
      await olay.prompt();
      await olay.userChoice;
    } catch {
      // kullanıcı istemi kapattı — sorun değil
    }
    setGorunur(false);
    setOlay(null);
  }

  function kapat() {
    setGorunur(false);
    try {
      localStorage.setItem(KAPAT_ANAHTAR, "1");
    } catch {}
  }

  if (!gorunur || !olay) return null;
  if (GIZLI_ONEK.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 print:hidden">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-gold/40 bg-midnight-card/95 px-4 py-3 shadow-xl backdrop-blur-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" aria-hidden className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">{t.pwaBaslik}</p>
          <p className="text-xs text-slate-400">{t.pwaAlt}</p>
        </div>
        <button
          onClick={kur}
          className="shrink-0 rounded-xl bg-gold px-3 py-2 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light"
        >
          {t.pwaEkle}
        </button>
        <button
          onClick={kapat}
          aria-label={t.pwaKapat}
          className="shrink-0 px-1 text-lg text-slate-500 hover:text-slate-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
