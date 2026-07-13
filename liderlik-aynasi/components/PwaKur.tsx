"use client";

import { useEffect, useRef, useState } from "react";
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

// "Şimdilik geç" artık KALICI gizlemez — sadece erteler. 3 günlük kampta kişi
// ilk seferde kurmazsa birkaç saat sonra nazikçe yine sorulur (ana ekran kurulumu
// kampın bel kemiği: kamera/bildirim ancak kurulu uygulamada tam çalışır).
const ERTELE_ANAHTAR = "la_pwa_kur_ertele_v1";
const ERTELE_MS = 6 * 60 * 60 * 1000; // 6 saat
// Admin/ekran/giriş gibi katılımcı-dışı yüzeylerde banner gösterme.
const GIZLI_ONEK = ["/admin", "/ekran", "/sahne", "/giris"];

export default function PwaKur() {
  const pathname = usePathname();
  const [olay, setOlay] = useState<KurulumOlayi | null>(null);
  const [gorunur, setGorunur] = useState(false);
  // [KUR-1] iOS'ta beforeinstallprompt YOK — Safari'de tarayıcıdan açan iPhone
  // kullanıcısı bugüne dek hiç istem görmüyordu (en büyük kurulum kaybı).
  // Aynı tam ekran istem, iOS'a özel 2 adımlı görsel yönergeyle gösterilir.
  const [iosGorunur, setIosGorunur] = useState(false);
  // "Şimdilik geç" bu session içinde ANINDA etkili olsun diye ref'te de tutulur:
  // Chrome aynı sayfa yüklemesinde beforeinstallprompt'u BİRDEN FAZLA kez
  // ateşleyebiliyor (ör. kullanıcı etkileşimine göre yeniden değerlendirme) —
  // yalnız mount anındaki localStorage kontrolü bunu yakalayamaz, her yeni olay
  // ertelemeyi görmezden gelip banner'ı hemen geri açardı.
  const ertelendiRef = useRef(false);

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
      const ertelenmis = localStorage.getItem(ERTELE_ANAHTAR);
      if (ertelenmis && Date.now() < Number(ertelenmis)) {
        ertelendiRef.current = true;
        return;
      }
    } catch {}

    function yakala(e: Event) {
      e.preventDefault();
      if (ertelendiRef.current) return;
      setOlay(e as KurulumOlayi);
      setGorunur(true);
    }
    window.addEventListener("beforeinstallprompt", yakala);
    // [KUR-1] iOS Safari: prompt olayı hiç gelmez — 2.5 sn sonra (ilk ekranla
    // çakışmasın) iOS yönergeli istemi göster.
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const iosZamanlayici = iOS
      ? window.setTimeout(() => setIosGorunur(true), 2500)
      : null;
    // Kurulum tamamlanınca banner'ı kaldır.
    function kuruldu() {
      setGorunur(false);
      setOlay(null);
    }
    window.addEventListener("appinstalled", kuruldu);
    return () => {
      window.removeEventListener("beforeinstallprompt", yakala);
      window.removeEventListener("appinstalled", kuruldu);
      if (iosZamanlayici) window.clearTimeout(iosZamanlayici);
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
    ertelendiRef.current = true;
    setGorunur(false);
    setIosGorunur(false);
    try {
      localStorage.setItem(ERTELE_ANAHTAR, String(Date.now() + ERTELE_MS));
    } catch {}
  }

  const androidIstem = gorunur && !!olay;
  if (!androidIstem && !iosGorunur) return null;
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
        {androidIstem ? (
          <button
            onClick={kur}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light"
          >
            {t.pwaIlkEkle}
          </button>
        ) : (
          <>
            {/* [KUR-1] iOS: sistem istemi yok — 2 adımlı görsel yönerge */}
            <div className="mt-4 space-y-2 text-left">
              <p className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-light">1</span>
                Alttaki <span className="mx-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-sky-300" aria-hidden>⎋</span> <span className="font-semibold">Paylaş</span> düğmesine dokun
              </p>
              <p className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-light">2</span>
                <span className="font-semibold">Ana Ekrana Ekle</span> <span className="mx-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10" aria-hidden>⊞</span> seç
              </p>
            </div>
            <button
              onClick={kapat}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light"
            >
              Anladım, ekliyorum ✓
            </button>
          </>
        )}
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
