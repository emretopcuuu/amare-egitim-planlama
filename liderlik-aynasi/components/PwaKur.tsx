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

  // İlk aynayı açar gibi — ortada, logolu, belirgin tam ekran istem.
  // Kullanıcı katılımcı yüzeyine ilk girdiğinde (beforeinstallprompt yakalanınca)
  // hemen çıkar; "Şimdilik geç" dersek bir daha gösterilmez (localStorage).
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 print:hidden">
      <div
        className="absolute inset-0 bg-midnight/85 backdrop-blur-sm"
        onClick={kapat}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-gold/40 bg-midnight-card/95 p-6 text-center shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt=""
          aria-hidden
          className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg ring-1 ring-gold/30"
        />
        <p className="text-lg font-bold text-slate-50">{t.pwaIlkBaslik}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.pwaIlkAlt}</p>
        <button
          onClick={kur}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light"
        >
          {t.pwaIlkEkle}
        </button>
        <button
          onClick={kapat}
          className="mt-2 w-full py-2 text-sm text-slate-400 hover:text-slate-200"
        >
          {t.pwaIlkSonra}
        </button>
      </div>
    </div>
  );
}
