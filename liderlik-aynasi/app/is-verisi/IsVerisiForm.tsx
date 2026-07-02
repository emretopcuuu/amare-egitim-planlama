"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

type Sayilar = { gorusme: number; kayit: number; takip: number };

// [5.4] İŞ VERİSİ KÖPRÜSÜ — istemci: bu haftanın 3 sayısını gir/güncelle.
export default function IsVerisiForm({
  hafta,
  mevcut,
}: {
  hafta: number;
  mevcut: Sayilar | null;
}) {
  const [v, setV] = useState<Sayilar>(mevcut ?? { gorusme: 0, kayit: 0, takip: 0 });
  const [durum, setDurum] = useState<"bos" | "kaydediliyor" | "kaydedildi" | "hata">(
    mevcut ? "kaydedildi" : "bos"
  );

  function guncelle(alan: keyof Sayilar, deger: string) {
    const n = Math.min(9999, Math.max(0, Math.round(Number(deger) || 0)));
    setV((x) => ({ ...x, [alan]: n }));
    setDurum("bos");
  }

  async function kaydet() {
    if (durum === "kaydediliyor") return;
    setDurum("kaydediliyor");
    try {
      const r = await fetch("/api/is-verisi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hafta, ...v }),
      });
      if (r.ok) {
        setDurum("kaydedildi");
        titret([10, 30, 10]);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  const alanlar: { anahtar: keyof Sayilar; etiket: string; ipucu: string }[] = [
    { anahtar: "gorusme", etiket: "Görüşme", ipucu: "Bu hafta kaç kişiyle konuştun?" },
    { anahtar: "kayit", etiket: "Kayıt", ipucu: "Kaç yeni kayıt/katılım?" },
    { anahtar: "takip", etiket: "Takip", ipucu: "Kaç takip/geri dönüş yaptın?" },
  ];

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-4">
      <p className="prizma-serif ay-metin text-lg font-semibold">Hafta {hafta}</p>
      <div className="mt-3 space-y-3">
        {alanlar.map((a) => (
          <label key={a.anahtar} className="block">
            <span className="text-sm font-medium text-slate-300">{a.etiket}</span>
            <span className="ml-2 text-xs text-slate-500">{a.ipucu}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              value={v[a.anahtar]}
              onChange={(e) => guncelle(a.anahtar, e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] px-4 text-lg text-slate-100 outline-none focus:border-gold"
            />
          </label>
        ))}
      </div>
      {durum === "hata" && <p className="mt-2 text-sm text-rose-300">Kaydedilemedi, tekrar dene.</p>}
      <button
        onClick={() => void kaydet()}
        disabled={durum === "kaydediliyor"}
        className="btn-kor parilti mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
      >
        {durum === "kaydediliyor" ? "Kaydediliyor…" : durum === "kaydedildi" ? "Kaydedildi ✓" : "Bu haftayı kaydet"}
      </button>
    </div>
  );
}
