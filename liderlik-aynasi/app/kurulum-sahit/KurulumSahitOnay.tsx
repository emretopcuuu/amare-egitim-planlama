"use client";

import { useState } from "react";
import Link from "next/link";
import { titret } from "@/lib/his";

// [KURULUM 8] El Ele onayı: yanındakinin kurulumunu doğrula → ikiniz de rozet.
export default function KurulumSahitOnay({ token, sahibiAd }: { token: string; sahibiAd: string }) {
  const [durum, setDurum] = useState<"hazir" | "gonderiliyor" | "oldu" | "hata">("hazir");
  const [hataMesaj, setHataMesaj] = useState<string | null>(null);

  async function onayla() {
    if (durum === "gonderiliyor") return;
    setDurum("gonderiliyor");
    setHataMesaj(null);
    try {
      const r = await fetch("/api/kurulum-sahit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const v = await r.json().catch(() => null);
      if (r.ok && v?.ok) {
        setDurum("oldu");
        titret([12, 40, 12, 40, 30]);
      } else {
        setHataMesaj(v?.hata ?? "Doğrulanamadı, tekrar dene.");
        setDurum("hata");
      }
    } catch {
      setHataMesaj("Bağlantı hatası, tekrar dene.");
      setDurum("hata");
    }
  }

  if (durum === "oldu") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6">
        <p className="text-4xl" aria-hidden>🤝</p>
        <p className="mt-2 text-lg font-semibold text-emerald-300">El ele — ikiniz de hazırsınız!</p>
        <p className="mt-1 text-sm text-slate-400">{sahibiAd} ile birbirinizin kurulumunu doğruladınız. İkiniz de &quot;El Ele&quot; rozetini kazandınız.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-gold-light underline-offset-4 hover:underline">
          Ana sayfaya dön →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-6">
      <p className="text-4xl" aria-hidden>🤝</p>
      <p className="mt-3 text-lg font-semibold text-slate-100">
        <span className="text-gold-light">{sahibiAd}</span>&apos;in telefonunu kontrol et
      </p>
      <p className="mt-1 text-sm text-slate-400">
        AYNA onun ana ekranında mı, bildirimi açık mı? Öyleyse doğrula — ikiniz de hazır olun.
      </p>
      {durum === "hata" && hataMesaj && <p className="mt-3 text-sm text-rose-300">{hataMesaj}</p>}
      <button
        onClick={() => void onayla()}
        disabled={durum === "gonderiliyor"}
        className="btn-kor parilti mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
      >
        {durum === "gonderiliyor" ? "Doğrulanıyor…" : "Kurulumunu doğruluyorum 🤝"}
      </button>
    </div>
  );
}
