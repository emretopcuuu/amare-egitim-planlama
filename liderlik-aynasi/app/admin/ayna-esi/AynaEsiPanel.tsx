"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { TRAIT_ADLARI } from "@/lib/aynaEsi";

const t = tr.aynaEsi;

type Kisi = { full_name: string; team: string | null };
type Satir = {
  id: string;
  tur: number;
  slot: string;
  a_verir: number;
  b_verir: number;
  a_tamam: boolean;
  b_tamam: boolean;
  a: Kisi | null;
  b: Kisi | null;
};

function ad(k: Kisi | null) {
  return k?.full_name ?? "—";
}

export default function AynaEsiPanel({ acik, satirlar }: { acik: boolean; satirlar: Satir[] }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState<null | "hesapla" | "durum">(null);
  const [hata, setHata] = useState<string | null>(null);
  const [ozet, setOzet] = useState<string | null>(null);

  const turlar = useMemo(() => {
    const m = new Map<number, Satir[]>();
    for (const s of satirlar) {
      const arr = m.get(s.tur) ?? [];
      arr.push(s);
      m.set(s.tur, arr);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [satirlar]);

  async function cagir(aksiyon: "hesapla" | "ac" | "kapat") {
    if (mesgul) return;
    setMesgul(aksiyon === "hesapla" ? "hesapla" : "durum");
    setHata(null);
    setOzet(null);
    try {
      const res = await fetch("/api/admin/ayna-esi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aksiyon }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(v?.hata ?? t.hata);
        return;
      }
      if (aksiyon === "hesapla" && v) {
        setOzet(t.ozet(v.eslesmeSayi, v.kisiSayi, v.acikta));
      }
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Durum + aksiyonlar */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              acik ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-300"
            }`}
          >
            {acik ? t.durumAcik : t.durumKapali}
          </span>
          <button
            onClick={() => cagir(acik ? "kapat" : "ac")}
            disabled={!!mesgul || satirlar.length === 0}
            className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 ${
              acik ? "border-2 border-white/20 text-slate-200" : "bg-gold text-[#1a1206]"
            }`}
          >
            {acik ? t.kapat : t.yayinla}
          </button>
        </div>

        <button
          onClick={() => cagir("hesapla")}
          disabled={!!mesgul}
          className="btn-kor mt-4 flex h-12 w-full items-center justify-center rounded-xl text-base font-bold disabled:opacity-50"
        >
          {mesgul === "hesapla" ? t.hesaplaniyor : satirlar.length ? t.yenidenHesapla : t.hesapla}
        </button>
        {ozet && <p className="mt-2 text-center text-sm font-medium text-emerald-300">{ozet}</p>}
        {hata && <p role="alert" className="mt-2 text-center text-sm font-medium text-red-400">{hata}</p>}
      </section>

      {/* Eşleştirme listesi (turlara göre) */}
      {satirlar.length === 0 ? (
        <p className="text-center text-sm text-slate-400">{t.bosListe}</p>
      ) : (
        turlar.map(([tur, satir]) => (
          <section key={tur} className="space-y-2">
            <h2 className="text-sm font-semibold text-gold-light">
              {t.turEtiket(tur)} · {satir[0]?.slot}
            </h2>
            <ul className="space-y-2">
              {satir.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-royal-light/25 bg-midnight-soft/60 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">{ad(s.a)}</span>
                    <span className="text-xs text-slate-500">↔</span>
                    <span className="font-semibold text-slate-100">{ad(s.b)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{s.a?.team ?? "—"}</span>
                    <span>{s.b?.team ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs text-gold-light">
                      {ad(s.a).split(" ")[0]} → {TRAIT_ADLARI[s.a_verir]}
                    </span>
                    <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs text-gold-light">
                      {ad(s.b).split(" ")[0]} → {TRAIT_ADLARI[s.b_verir]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
