"use client";

import { useState } from "react";

// G8 — admin: yeni kayıp eşya turu başlat. Konum seç + ipucu → mit-duyurusu
// (bayrak açıksa) herkese gider, nokta o sayfanın köşesinde belirir.
export default function KayipKontrol({ konumlar }: { konumlar: { yol: string; ad: string }[] }) {
  const [konum, setKonum] = useState(konumlar[0]?.yol ?? "/");
  const [ipucu, setIpucu] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function baslat() {
    setMesgul(true);
    setMesaj(null);
    try {
      const r = await fetch("/api/admin/kayip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ konum, ipucu }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; hata?: string };
      setMesaj(r.ok && j.ok ? `🔍 Tur başladı — nokta "${konumlar.find((k) => k.yol === konum)?.ad}" sayfasının köşesinde.` : j.hata ?? "Olmadı.");
    } catch {
      setMesaj("Ağ hatası.");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-royal/30 bg-midnight-card/40 p-5">
      <div>
        <h2 className="text-lg font-bold text-gold">🔍 Kayıp Eşya — yeni tur</h2>
        <p className="mt-1 text-sm text-slate-400">
          Parlayan noktayı bir sayfanın köşesine sakla. Bayrak açıksa mit-duyurusu herkese gider;
          48 saat bulunmazsa ipucu otomatik düşer.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={konum}
          onChange={(e) => setKonum(e.target.value)}
          className="rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100"
        >
          {konumlar.map((k) => (
            <option key={k.yol} value={k.yol}>{k.ad}</option>
          ))}
        </select>
        <input
          value={ipucu}
          onChange={(e) => setIpucu(e.target.value)}
          placeholder="İpucu (ops.) — 48s sonra düşer"
          className="flex-1 rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
        />
        <button onClick={baslat} disabled={mesgul} className="btn-kor rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
          {mesgul ? "…" : "Turu başlat"}
        </button>
      </div>
      {mesaj && <p className="text-sm text-gold-light">{mesaj}</p>}
    </section>
  );
}
