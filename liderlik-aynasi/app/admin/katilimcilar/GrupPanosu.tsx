"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// İnteraktif grup panosu: kim hangi grupta görünür + sürükle-bırak (veya mobilde
// "dokun → buraya taşı") ile kişi taşınır. Taşıma tek kişilik PATCH ile yazılır.
// Oyun ikilisi başlıkları grubun hangi oyunları oynadığını gösterir; farklı bir
// ikiliye taşımak kişinin oynayacağı oyunları da değiştirir (bilinçli elle override).

const GRUP_KAPASITE = 10;

export type PanoUye = { id: string; ad: string; grup: number | null };
export type PanoKombo = { etiket: string; gruplar: number[] };

export default function GrupPanosu({
  uyeler: propUyeler,
  kombolar,
}: {
  uyeler: PanoUye[];
  kombolar: PanoKombo[];
}) {
  const router = useRouter();
  const [uyeler, setUyeler] = useState<PanoUye[]>(propUyeler);
  const [secili, setSecili] = useState<string | null>(null);
  const [suruklenen, setSuruklenen] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Sunucu yeniden hesaplayınca (router.refresh) yerel durumu DB gerçeğiyle eşle.
  useEffect(() => setUyeler(propUyeler), [propUyeler]);

  const grupUyeleri = useMemo(() => {
    const m = new Map<number | "yok", PanoUye[]>();
    for (const u of uyeler) {
      const k = u.grup ?? "yok";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    return m;
  }, [uyeler]);

  const atanmamis = grupUyeleri.get("yok") ?? [];

  async function tasi(id: string, grup: number | null) {
    const kisi = uyeler.find((u) => u.id === id);
    if (!kisi || mesgul) return;
    if (kisi.grup === grup) {
      setSecili(null);
      return;
    }
    const eskiGrup = kisi.grup;
    const takim = grup ? `Grup ${grup}` : null;
    // İyimser güncelle
    setUyeler((prev) => prev.map((u) => (u.id === id ? { ...u, grup } : u)));
    setSecili(null);
    setMesgul(true);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates: [{ id, team: takim }] }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        // Geri al
        setUyeler((prev) => prev.map((u) => (u.id === id ? { ...u, grup: eskiGrup } : u)));
        setHata(v?.hata ?? "Taşınamadı, tekrar dene.");
        return;
      }
      setMesaj(`${kisi.ad} → ${grup ? `Grup ${grup}` : "Atanmamış"}`);
      router.refresh(); // diğer paneller (liste, doluluk) senkron
    } catch {
      setUyeler((prev) => prev.map((u) => (u.id === id ? { ...u, grup: eskiGrup } : u)));
      setHata("Taşınamadı, tekrar dene.");
    } finally {
      setMesgul(false);
    }
  }

  // Bir grup sütunu (drop hedefi)
  function Sutun({ grup }: { grup: number | null }) {
    const anahtar = grup ?? "yok";
    const liste = grupUyeleri.get(anahtar) ?? [];
    const n = liste.length;
    const dolu = grup != null && n >= GRUP_KAPASITE;
    const baslik = grup ? `Grup ${grup}` : "📋 Atanmamış";
    return (
      <div
        onDragOver={(e) => {
          if (suruklenen) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain") || suruklenen;
          setSuruklenen(null);
          if (id) void tasi(id, grup);
        }}
        className={`flex min-w-[9.5rem] flex-1 flex-col rounded-xl border p-2 transition-colors ${
          suruklenen ? "border-dashed border-gold/50 bg-gold/[0.04]" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between gap-1 px-1">
          <span className="text-xs font-semibold text-slate-200">{baslik}</span>
          <span className={`font-mono text-[0.65rem] font-bold ${dolu ? "text-amber-300" : "text-slate-500"}`}>
            {grup ? `${n}/${GRUP_KAPASITE}` : n}
          </span>
        </div>
        {/* Taşıma hedefi: bir kişi seçiliyken görünür (mobil/dokunmatik yol) */}
        {secili && !liste.some((u) => u.id === secili) && (
          <button
            onClick={() => void tasi(secili, grup)}
            disabled={mesgul}
            className="mb-1.5 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[0.65rem] font-semibold text-gold-light transition-colors hover:bg-gold/20 disabled:opacity-40"
          >
            ⤵ Buraya taşı
          </button>
        )}
        <ul className="space-y-1">
          {liste.map((u) => (
            <li
              key={u.id}
              draggable
              onDragStart={(e) => {
                setSuruklenen(u.id);
                e.dataTransfer.setData("text/plain", u.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setSuruklenen(null)}
              onClick={() => setSecili((s) => (s === u.id ? null : u.id))}
              title="Sürükle veya dokun → hedef grupta 'Buraya taşı'"
              className={`cursor-grab select-none truncate rounded-md px-2 py-1 text-[0.72rem] font-medium ring-1 transition-colors active:cursor-grabbing ${
                secili === u.id
                  ? "bg-gold/25 text-gold-light ring-gold/50"
                  : "bg-royal/15 text-slate-200 ring-white/5 hover:bg-royal/25"
              }`}
            >
              {u.ad}
            </li>
          ))}
          {liste.length === 0 && <li className="px-1 py-2 text-[0.65rem] text-slate-600">boş</li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-slate-500">
        <span>🖱 Sürükle-bırak ya da kişiye dokun → hedef grupta “Buraya taşı”.</span>
        {mesgul && <span className="text-gold-light">kaydediliyor…</span>}
        {mesaj && <span className="font-medium text-emerald-400">✓ {mesaj}</span>}
        {hata && <span className="font-medium text-red-400">{hata}</span>}
        {secili && (
          <button onClick={() => setSecili(null)} className="text-slate-400 underline hover:text-slate-200">
            seçimi bırak
          </button>
        )}
      </div>

      {/* Atanmamış havuzu (varsa) — en üstte, tek geniş sütun */}
      {atanmamis.length > 0 && (
        <div
          onDragOver={(e) => suruklenen && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain") || suruklenen;
            setSuruklenen(null);
            if (id) void tasi(id, null);
          }}
          className={`rounded-xl border p-2 ${suruklenen ? "border-dashed border-gold/50 bg-gold/[0.04]" : "border-amber-500/20 bg-amber-500/[0.04]"}`}
        >
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-amber-200">📋 Henüz atanmamış</span>
            <span className="font-mono text-[0.65rem] font-bold text-amber-300">{atanmamis.length}</span>
          </div>
          <ul className="flex flex-wrap gap-1">
            {atanmamis.map((u) => (
              <li
                key={u.id}
                draggable
                onDragStart={(e) => {
                  setSuruklenen(u.id);
                  e.dataTransfer.setData("text/plain", u.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setSuruklenen(null)}
                onClick={() => setSecili((s) => (s === u.id ? null : u.id))}
                className={`cursor-grab select-none truncate rounded-md px-2 py-1 text-[0.72rem] font-medium ring-1 transition-colors active:cursor-grabbing ${
                  secili === u.id
                    ? "bg-gold/25 text-gold-light ring-gold/50"
                    : "bg-royal/15 text-slate-200 ring-white/5 hover:bg-royal/25"
                }`}
              >
                {u.ad}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Oyun ikilisine göre gruplar */}
      {kombolar.map((k) => {
        const dolu = k.gruplar.reduce((t, g) => t + (grupUyeleri.get(g)?.length ?? 0), 0);
        return (
          <div key={k.etiket} className="rounded-xl bg-midnight-soft/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">🎳 {k.etiket}</p>
              <span className="shrink-0 font-mono text-xs font-bold text-slate-400">
                {dolu}/{k.gruplar.length * GRUP_KAPASITE}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {k.gruplar.map((g) => (
                <Sutun key={g} grup={g} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
