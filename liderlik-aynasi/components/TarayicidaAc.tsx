"use client";

import { useEffect, useState } from "react";

// WhatsApp/Instagram/Facebook gibi UYGULAMA-İÇİ tarayıcılar (WebView) PWA kurulumu,
// kamera (ses ritüeli) ve çereze düzgün izin vermez → onboarding orada kırılıyor.
// Bu bileşen YALNIZ böyle bir iç tarayıcı algılarsa tam ekran bir uyarı gösterir;
// gerçek tarayıcıdaki (mevcut akış) kimseye dokunmaz — UA eşleşmezse null döner.
// Yanlış-pozitife karşı "yine de devam et" ile kapatılabilir (asla hard-blok değil).
export default function TarayicidaAc() {
  const [icTarayici, setIcTarayici] = useState(false);
  const [kapandi, setKapandi] = useState(false);
  const [android, setAndroid] = useState(false);
  const [url, setUrl] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // WhatsApp WebView UA'sında "WhatsApp"; Meta uygulama-içi tarayıcıları FBAN/FBAV/
    // Instagram; Line da kendi token'ını koyar. Hepsi PWA/kamera kısıtlar.
    const ic = /WhatsApp|FBAN|FBAV|Instagram|Line\//i.test(ua);
    const adr = /Android/i.test(ua);
    setIcTarayici(ic);
    setAndroid(adr);
    setUrl(window.location.href);

    // Android'de "tek tuş"u "sıfır tuş"a indir: WebView algılanır algılanmaz
    // Chrome'u kendiliğinden dene. Oturumda bir kez (geri dönüşte tekrar
    // sıçramasın); başarısızsa kişi alttaki butona/talimata düşer.
    if (ic && adr) {
      try {
        if (!sessionStorage.getItem("la_intent_denendi")) {
          sessionStorage.setItem("la_intent_denendi", "1");
          const hedef = `intent://${window.location.href.replace(
            /^https?:\/\//,
            ""
          )}#Intent;scheme=https;package=com.android.chrome;end`;
          // Kısa gecikme: bileşen önce render olsun (atlama olmazsa uyarı görünür).
          setTimeout(() => {
            window.location.href = hedef;
          }, 600);
        }
      } catch {
        /* sessionStorage kapalıysa otomatik atlamadan, butonla devam */
      }
    }
  }, []);

  if (!icTarayici || kapandi) return null;

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(url);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch {
      // Pano kapalıysa kullanıcı alttaki açık metni elle seçip kopyalar.
    }
  }

  // Android: intent:// ile doğrudan Chrome'da aç (tek dokunuş). Chrome yoksa
  // başarısız olur; kullanıcı kopyala/talimata düşer.
  const chromeIntent = android
    ? `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`
    : null;

  return (
    <div className="koyu-alan fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[#06121e] p-6 text-center">
      <p className="text-5xl" aria-hidden>
        🌐
      </p>
      <h1 className="prizma-serif text-2xl font-bold text-gold-light">
        Tarayıcıda açman gerek
      </h1>
      <p className="max-w-sm text-base leading-relaxed text-slate-200">
        Bu sayfayı WhatsApp'ın içinde açtın. Kamp kurulumu, kamera ve bildirimler
        ancak gerçek tarayıcıda (Chrome / Safari) çalışır. Linki tarayıcında aç:
      </p>

      {chromeIntent && (
        <a
          href={chromeIntent}
          className="btn-kor parilti flex h-14 w-full max-w-xs items-center justify-center rounded-2xl text-lg font-bold"
        >
          🌐 Chrome'da Aç
        </a>
      )}

      <button
        onClick={() => void kopyala()}
        className="flex h-12 w-full max-w-xs items-center justify-center rounded-2xl border border-gold/50 text-base font-semibold text-gold-light transition-colors hover:bg-gold/10"
      >
        {kopyalandi ? "✓ Kopyalandı" : "🔗 Linki Kopyala"}
      </button>

      <div className="max-w-sm rounded-xl bg-white/5 p-3 text-sm leading-relaxed text-slate-300">
        {android ? (
          <p>
            Veya sağ üstteki <b>⋮</b> menüden <b>&ldquo;Tarayıcıda aç&rdquo;</b>ı seç.
          </p>
        ) : (
          <p>
            Veya alttaki <b>paylaş / Safari</b> simgesine dokun →{" "}
            <b>&ldquo;Safari'de Aç&rdquo;</b>.
          </p>
        )}
      </div>

      <p className="max-w-sm break-all text-xs text-slate-500 select-all">{url}</p>

      <button
        onClick={() => setKapandi(true)}
        className="mt-1 text-sm text-slate-400 underline underline-offset-4"
      >
        Yine de burada devam et
      </button>

      {/* iOS'ta Chrome'a programla atlamak mümkün değil → kişiyi WhatsApp'ın
          alttaki "Safari'de aç" denetimine bir ZIPLAYAN okla yönlendir. */}
      {!android && (
        <div
          className="pointer-events-none fixed bottom-2 right-3 flex flex-col items-center gap-1"
          aria-hidden
        >
          <span className="rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-[#1a1206] shadow-lg">
            Safari'de aç
          </span>
          <span className="animate-bounce text-4xl leading-none text-gold drop-shadow">
            ↓
          </span>
        </div>
      )}
    </div>
  );
}
