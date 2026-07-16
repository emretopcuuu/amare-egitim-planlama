"use client";

import { useState } from "react";

// KAPANIŞ Faz D · öneri 9 — 90-GÜN MÜFREDATI: Emre kapanış eğitiminin 3-5 temel
// ilkesini buraya girer. Yolculuk (90 gün) görev motoru her gün bir ilkeyi
// sahada yaşatır — eğitim tek bir gün değil, 90 güne yayılan bir müfredat olur.
export default function IlkelerKontrol({ baslangic }: { baslangic: string[] }) {
  const [metin, setMetin] = useState(baslangic.join("\n"));
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const ilkeler = metin
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  async function kaydet() {
    setMesgul(true);
    setMesaj(null);
    try {
      const r = await fetch("/api/admin/kapanis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eylem: "ilkeler", ilkeler }),
      });
      setMesaj(r.ok ? `✅ ${ilkeler.length} ilke kaydedildi — 90 gün bunların etrafında örülecek.` : "Kaydedilemedi.");
    } catch {
      setMesaj("Ağ hatası.");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-royal/30 bg-midnight-card/40 p-5">
      <div>
        <h2 className="text-lg font-bold text-gold">🗺 90-Gün Müfredatı — İlkelerin</h2>
        <p className="mt-1 text-sm text-slate-400">
          Kapanış eğitiminin <strong>3-5 temel ilkesini</strong> her satıra bir tane yaz. Kamp
          sonrası 90 gün boyunca AYNA her gün bir ilkeyi katılımcının sahadaki görevine işler —
          eğitimin tek gün değil, üç ay yaşar.
        </p>
      </div>
      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        rows={5}
        placeholder={"Örn:\nÖnce hizmet et, sonra iste\nHer hayır bir veridir\nGünde tek bir cesur hamle"}
        className="w-full resize-none rounded-xl border border-royal/40 bg-midnight/60 p-3 text-sm text-slate-100 outline-none focus:border-gold/50"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={kaydet}
          disabled={mesgul || ilkeler.length === 0}
          className="btn-kor rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          {mesgul ? "Kaydediliyor…" : "İlkeleri Kaydet"}
        </button>
        <span className="text-xs text-slate-500">{ilkeler.length}/5 ilke</span>
      </div>
      {mesaj && <p className="text-sm text-gold-light">{mesaj}</p>}
    </section>
  );
}
