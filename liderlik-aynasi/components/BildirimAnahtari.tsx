"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.bildirim;

// Menüdeki kalıcı bildirim AÇ/KAPA anahtarı. AynaKurulum ana ekran kartının
// menü karşılığı; buradan her zaman erişilir ve KAPATILABİLİR (unsubscribe).
type Durum =
  | "yukleniyor"
  | "ios-kurulum" // iOS: ana ekrana eklenmeden push olmaz
  | "desteklenmiyor"
  | "kapali" // izin var/yok ama abone değil
  | "abone"
  | "reddedildi";

function base64ToUint8(base64: string): Uint8Array {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(ham, (c) => c.charCodeAt(0));
}

// vurgulu: onboarding'de ayar çekmecesinde büyük, dikkat çeken "Bildirimleri Aç"
// butonu olarak render eder (izin yoksa). İzin varsa/kapatılamazsa kompakt hâl.
export default function BildirimAnahtari({ vurgulu = false }: { vurgulu?: boolean }) {
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [mesgul, setMesgul] = useState(false);

  async function kontrol() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const kurulu = window.matchMedia("(display-mode: standalone)").matches;
      setDurum(ios && !kurulu ? "ios-kurulum" : "desteklenmiyor");
      return;
    }
    const kayit = await navigator.serviceWorker.register("/sw.js");
    if (Notification.permission === "denied") {
      setDurum("reddedildi");
      return;
    }
    const mevcut = await kayit.pushManager.getSubscription();
    setDurum(mevcut && Notification.permission === "granted" ? "abone" : "kapali");
  }

  useEffect(() => {
    void kontrol().catch(() => setDurum("desteklenmiyor"));
  }, []);

  async function ac() {
    const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!anahtar) {
      setDurum("desteklenmiyor");
      return;
    }
    const izin = await Notification.requestPermission();
    if (izin !== "granted") {
      setDurum("reddedildi");
      return;
    }
    const kayit = await navigator.serviceWorker.ready;
    const abonelik = await kayit.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8(anahtar) as BufferSource,
    });
    const res = await fetch("/api/bildirim-abone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(abonelik.toJSON()),
    });
    if (!res.ok) throw new Error();
    setDurum("abone");
  }

  async function kapat() {
    const kayit = await navigator.serviceWorker.ready;
    const abonelik = await kayit.pushManager.getSubscription();
    if (abonelik) {
      await fetch("/api/bildirim-abone", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: abonelik.endpoint }),
      }).catch(() => {});
      await abonelik.unsubscribe().catch(() => {});
    }
    setDurum("kapali");
  }

  async function degistir() {
    if (mesgul) return;
    setMesgul(true);
    try {
      if (durum === "abone") await kapat();
      else await ac();
    } catch {
      void kontrol();
    } finally {
      setMesgul(false);
    }
  }

  if (durum === "yukleniyor" || durum === "desteklenmiyor") return null;

  // Açılamayan durumlar (iOS kurulum gerek / tarayıcı reddetti): tıklanmaz,
  // yön gösteren küçük ipucu satırı.
  const acilamaz = durum === "ios-kurulum" || durum === "reddedildi";
  const acik = durum === "abone";

  // Onboarding çekmecesi: izin yokken BÜYÜK, tek dokunuşluk açma butonu.
  if (vurgulu && durum === "kapali") {
    return (
      <button
        onClick={degistir}
        disabled={mesgul}
        className="btn-kor parilti flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 text-base font-bold transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        <span aria-hidden className="text-xl">🔔</span>
        {mesgul ? "Açılıyor…" : "Bildirimleri Aç"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-100">{t.anahtarBaslik}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {durum === "ios-kurulum"
            ? t.anahtarIos
            : durum === "reddedildi"
              ? t.anahtarReddedildi
              : acik
                ? t.anahtarAcik
                : t.anahtarKapali}
        </p>
      </div>
      {acilamaz ? (
        <span className="shrink-0 text-lg" aria-hidden>
          {durum === "ios-kurulum" ? "📲" : "🔕"}
        </span>
      ) : (
        <button
          onClick={degistir}
          disabled={mesgul}
          role="switch"
          aria-checked={acik}
          aria-label={acik ? t.anahtarKapat : t.anahtarAc}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            acik ? "bg-gold" : "bg-white/20"
          }`}
        >
          {/* Topuz: 4px iç boşlukla; açıkken sağ kenara taşmaz (w-12=48, knob=20,
              left-1=4 + translate-x-5=20 → 24..44, 4px marj). */}
          <span
            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              acik ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      )}
    </div>
  );
}
