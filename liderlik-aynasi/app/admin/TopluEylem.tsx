"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";
import Bekle from "@/components/Bekle";

const t = tr.topluEylem;

type Katilimci = {
  id: string;
  ad: string;
  takim: string | null;
  ozTamam: boolean;
  puanladigi: number;
  onuPuanlayan: number;
};

type IlerlemeState = {
  yapilan: number;
  toplam: number;
  hataliIdler: string[];
} | null;

export default function TopluEylem({
  katilimcilar,
  ozellikSayisi,
}: {
  katilimcilar: Katilimci[];
  ozellikSayisi: number;
}) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [mesgul, setMesgul] = useState(false);
  const [ilerleme, setIlerleme] = useState<IlerlemeState>(null);
  const [sonuc, setSonuc] = useState<{ basarili: number; toplam: number; hataliIdler: string[] } | null>(null);

  const tumSecili = secili.size === katilimcilar.length && katilimcilar.length > 0;

  function toggleTum() {
    if (tumSecili) {
      setSecili(new Set());
    } else {
      setSecili(new Set(katilimcilar.map((k) => k.id)));
    }
  }

  function toggle(id: string) {
    setSecili((prev) => {
      const kopi = new Set(prev);
      if (kopi.has(id)) kopi.delete(id);
      else kopi.add(id);
      return kopi;
    });
  }

  async function topluDurt() {
    if (secili.size === 0) return;
    const hedefler = [...secili];
    const toplam = hedefler.length;
    setMesgul(true);
    setSonuc(null);
    setIlerleme({ yapilan: 0, toplam, hataliIdler: [] });

    const hataliIdler: string[] = [];
    // Kişileri tek tek gönder — gerçek ilerleme ve kısmi başarısızlık takibi
    for (let i = 0; i < hedefler.length; i++) {
      try {
        const res = await fetch("/api/admin/toplu-durt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hedefler: [hedefler[i]] }),
        });
        if (!res.ok) hataliIdler.push(hedefler[i]);
      } catch {
        hataliIdler.push(hedefler[i]);
      }
      setIlerleme({ yapilan: i + 1, toplam, hataliIdler: [...hataliIdler] });
    }

    const basarili = toplam - hataliIdler.length;
    setSonuc({ basarili, toplam, hataliIdler });
    setIlerleme(null);
    setMesgul(false);
    setSecili(new Set());
    tost(t.kismiSonuc(basarili, toplam), basarili === toplam ? "basari" : "bilgi");
    router.refresh();
  }

  return (
    <div>
      {/* Toplu aksiyon çubuğu */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={tumSecili}
            onChange={toggleTum}
            className="h-4 w-4 rounded border-royal/50 accent-gold"
          />
          <span className="text-sm text-slate-300">
            {tumSecili ? t.hicbiriniSec : t.tumunuSec}
          </span>
        </label>
        {secili.size > 0 && (
          <button
            onClick={() => void topluDurt()}
            disabled={mesgul}
            className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {mesgul ? <Bekle /> : t.secilenDurt(secili.size)}
          </button>
        )}
      </div>

      {/* UX 7 — İlerleme bandı */}
      {ilerleme && (
        <div className="mb-3 rounded-xl border border-royal/30 bg-midnight-card/60 p-3">
          <p className="mb-2 text-sm font-medium text-slate-300">
            {t.gonderiliyor(ilerleme.yapilan, ilerleme.toplam)}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${Math.round((ilerleme.yapilan / ilerleme.toplam) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* UX 7 — Kısmi başarısızlık raporu */}
      {sonuc && (
        <div
          className={`mb-3 rounded-xl border p-3 text-sm ${
            sonuc.hataliIdler.length === 0
              ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300"
              : "border-amber-400/30 bg-amber-400/[0.06] text-amber-300"
          }`}
        >
          <p className="font-semibold">{t.kismiSonuc(sonuc.basarili, sonuc.toplam)}</p>
          {sonuc.hataliIdler.length > 0 && (
            <div className="mt-1.5">
              <p className="text-xs text-amber-400/80">{t.hataliKisiler}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                {sonuc.hataliIdler.map((id) => {
                  const k = katilimcilar.find((k) => k.id === id);
                  return <li key={id}>• {k?.ad ?? id}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}


      {/* Katılımcı tablosu */}
      <div className="overflow-x-auto">
        <table className="cizgili w-full text-left text-sm">
          <thead>
            <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-2 w-8" />
              <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
              <th className="py-2 pr-3">{tr.admin.ilerleme.takim}</th>
              <th className="py-2 pr-3 text-center">{tr.admin.ilerleme.oz}</th>
              <th className="py-2 pr-3 text-center">{tr.admin.ilerleme.puanladigi}</th>
              <th className="py-2 text-center">{tr.admin.ilerleme.onuPuanlayan}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-royal/20">
            {katilimcilar.map((k) => (
              <tr
                key={k.id}
                className={`cursor-pointer transition-colors ${secili.has(k.id) ? "bg-gold/5" : "hover:bg-white/[0.02]"}`}
                onClick={() => toggle(k.id)}
              >
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={secili.has(k.id)}
                    onChange={() => toggle(k.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-royal/50 accent-gold"
                  />
                </td>
                <td className="py-2 pr-3 font-medium text-slate-100">{k.ad}</td>
                <td className="py-2 pr-3 text-slate-400">{k.takim ?? "—"}</td>
                <td className="py-2 pr-3 text-center">
                  {k.ozTamam ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-center text-slate-300">
                  {k.puanladigi}
                </td>
                <td className="py-2 text-center text-slate-300">
                  {k.onuPuanlayan}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Öz-puan eksik adayları ön-seç butonu */}
      {katilimcilar.some((k) => !k.ozTamam) && (
        <button
          onClick={() => {
            const eksikler = katilimcilar.filter((k) => !k.ozTamam).map((k) => k.id);
            setSecili(new Set(eksikler));
          }}
          className="mt-3 text-xs text-slate-400 underline hover:text-slate-200"
        >
          Öz-puan eksik {katilimcilar.filter((k) => !k.ozTamam).length} kişiyi seç
        </button>
      )}
    </div>
  );
}
