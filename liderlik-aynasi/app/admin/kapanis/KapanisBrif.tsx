"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrifVeri, BrifSlot, Dokunulacak } from "@/lib/kapanis";

const SLOT_ETIKET: Record<BrifSlot, string> = {
  on: "☕ Ana brif (07:30)",
  final: "🎤 Güncel brif (11:20)",
  manuel: "🔄 Elle üretilen",
};

// Basit markdown: "## " başlık, "- " madde, gerisi paragraf.
function BrifMetni({ metin }: { metin: string }) {
  const satirlar = metin.split("\n");
  return (
    <div className="space-y-2">
      {satirlar.map((s, i) => {
        const t = s.trim();
        if (!t) return null;
        if (t.startsWith("## "))
          return (
            <h3 key={i} className="prizma-serif mt-4 text-lg font-bold text-gold">
              {t.slice(3)}
            </h3>
          );
        if (t.startsWith("- "))
          return (
            <p key={i} className="ml-4 border-l-2 border-gold/30 pl-3 text-sm italic text-slate-300">
              {t.slice(2)}
            </p>
          );
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-200">
            {t}
          </p>
        );
      })}
    </div>
  );
}

function DokunTablo({ baslik, satirlar, ikon }: { baslik: string; satirlar: Dokunulacak[]; ikon: string }) {
  if (satirlar.length === 0) return null;
  return (
    <div className="rounded-xl border border-royal/25 bg-midnight-card/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {ikon} {baslik}
      </p>
      <ul className="mt-2 space-y-1.5">
        {satirlar.map((k, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-200">{k.ad}</span>
            <span className="shrink-0 text-xs text-slate-500">{k.not}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cip({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-royal/20 px-2.5 py-1 text-xs text-slate-300">
      <span className="text-slate-500">{etiket}</span>
      <span className="font-semibold text-gold-light">{deger}</span>
    </span>
  );
}

export default function KapanisBrif({
  guncel,
}: {
  guncel: (BrifVeri & { metin: string; createdAt: string; slot: BrifSlot }) | null;
}) {
  const router = useRouter();
  const [uretiliyor, setUretiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function uret() {
    setUretiliyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/admin/kapanis", { method: "POST" });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { hata?: string } | null;
        setHata(j?.hata ?? "Üretilemedi.");
      } else {
        router.refresh();
      }
    } catch {
      setHata("Ağ hatası. Tekrar dene.");
    } finally {
      setUretiliyor(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {guncel && (
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
              {SLOT_ETIKET[guncel.slot]}
            </span>
          )}
          {guncel && (
            <span className="ml-2 text-xs text-slate-500">
              {new Date(guncel.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
            </span>
          )}
        </div>
        <button
          onClick={uret}
          disabled={uretiliyor}
          className="btn-kor rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          {uretiliyor ? "Üretiliyor…" : guncel ? "🔄 Şimdi Yenile" : "✨ Brifi Üret"}
        </button>
      </div>

      {hata && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{hata}</div>
      )}

      {!guncel ? (
        <div className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-8 text-center">
          <p className="text-4xl">👁</p>
          <p className="mt-3 text-slate-300">Henüz brif üretilmedi.</p>
          <p className="mt-1 text-sm text-slate-500">
            Kampta bu otomatik gelir (Gün 3 · 07:30 ve 11:20). Şimdi test etmek için{" "}
            <strong>"Brifi Üret"</strong>e bas — eldeki veriyle bir brif hazırlar.
          </p>
        </div>
      ) : (
        <>
          {/* AI düzyazı brif (isimsiz) */}
          <section className="kart-cam rounded-2xl p-6">
            <BrifMetni metin={guncel.metin} />
          </section>

          {/* Ham veri çipleri */}
          <section className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Röntgen — ham sayılar</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Cip etiket="katılımcı" deger={String(guncel.toplamKisi)} />
              <Cip etiket="aktif" deger={String(guncel.aktifKisi)} />
              <Cip etiket="tamamlanan görev" deger={String(guncel.tamamlananGorev)} />
              {guncel.ortPuan != null && <Cip etiket="ort. puan" deger={`${guncel.ortPuan}/10`} />}
              <Cip etiket="taahhüt" deger={`${guncel.taahhut.toplamKisi} kişi · ${guncel.taahhut.toplamTaahhut} söz`} />
              <Cip etiket="bahis" deger={`AYNA ${guncel.bahis.ayna} - İtirazcı ${guncel.bahis.itirazci}`} />
              {guncel.degerlendirmeSayisi > 0 && (
                <Cip etiket="değerlendirme" deger={String(guncel.degerlendirmeSayisi)} />
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guncel.enCokKas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">En çok çalışan kaslar</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {guncel.enCokKas.map((k) => `${k.ad} (${k.adet})`).join(" · ")}
                  </p>
                </div>
              )}
              {guncel.enCokKacirilanTur.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">En çok kaçırılan tür</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {guncel.enCokKacirilanTur.map((k) => `${k.ad} (${k.adet})`).join(" · ")}
                  </p>
                </div>
              )}
              {guncel.icEngeller.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500">Tekrar eden iç engeller</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {guncel.icEngeller.map((e) => `${e.sebep} (${e.adet})`).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* İSİMLİ dokunulacaklar — yalnız admin, AI'dan geçmez */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🎯 Dokunulacaklar (yalnız senin gözünle)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DokunTablo baslik="Parlayanlar" ikon="✨" satirlar={guncel.parlayanlar} />
              <DokunTablo baslik="Geride kalanlar" ikon="🫂" satirlar={guncel.gerideKalanlar} />
            </div>
          </section>

          {guncel.alintilar.length > 0 && (
            <section className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                💬 İsimsiz alıntı havuzu (konuşma malzemesi)
              </p>
              <ul className="mt-2 space-y-2">
                {guncel.alintilar.map((a, i) => (
                  <li key={i} className="border-l-2 border-gold/30 pl-3 text-sm italic text-slate-300">
                    "{a}"
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
