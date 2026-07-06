"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Klon = {
  voice_id: string;
  ad: string;
  bagliKisi: string | null;
  yetim: boolean;
};

type Tarama = {
  toplamSes: number;
  klonSayisi: number;
  yetimSayisi: number;
  voiceLimit?: number | null; // hesabın gerçek slot limiti (Pro=160 vb.)
  tier?: string | null;
  klonlar: Klon[];
};

// ElevenLabs hesabındaki ses slotlarını tarar; yetim (kimseye bağlı olmayan)
// eski test klonlarını sildirir. 30-slot sınırını test sırasında açık tutmak için.
export default function SesTemizlikPanel() {
  const router = useRouter();
  const [tarama, setTarama] = useState<Tarama | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [siliyor, setSiliyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function tara() {
    setYukleniyor(true);
    setMesaj(null);
    try {
      const res = await fetch("/api/admin/ses-temizlik");
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setMesaj(`Hata: ${veri?.hata ?? "bilinmiyor"}`);
        return;
      }
      setTarama(veri);
    } catch {
      setMesaj("Ağ hatası");
    } finally {
      setYukleniyor(false);
    }
  }

  async function yetimleriSil() {
    if (!tarama?.yetimSayisi) return;
    setSiliyor(true);
    setMesaj(null);
    try {
      const res = await fetch("/api/admin/ses-temizlik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mod: "yetimler" }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setMesaj(`Hata: ${veri?.hata ?? "bilinmiyor"}`);
        return;
      }
      setMesaj(`${veri.silinen} yetim klon silindi${veri.basarisiz ? `, ${veri.basarisiz} başarısız` : ""}`);
      await tara();
      router.refresh();
    } catch {
      setMesaj("Ağ hatası");
    } finally {
      setSiliyor(false);
    }
  }

  async function tekSil(voiceId: string) {
    setSiliyor(true);
    setMesaj(null);
    try {
      const res = await fetch("/api/admin/ses-temizlik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mod: "secili", voiceIdler: [voiceId] }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setMesaj(`Hata: ${veri?.hata ?? "bilinmiyor"}`);
        return;
      }
      setMesaj(veri.silinen ? "Silindi ✓" : "Silinemedi (bağlı olabilir)");
      await tara();
      router.refresh();
    } catch {
      setMesaj("Ağ hatası");
    } finally {
      setSiliyor(false);
    }
  }

  const dolu = tarama ? tarama.klonSayisi : 0;
  // Gerçek plan limitini API'den al; gelmezse eski Creator varsayımına (30) düş.
  const sinir = tarama?.voiceLimit && tarama.voiceLimit > 0 ? tarama.voiceLimit : 30;
  const doluYuzde = Math.min(100, Math.round((dolu / sinir) * 100));

  return (
    <div className="rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-100">Ses Slot Temizliği</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            ElevenLabs hesabındaki klon sayısını gör; eski test klonlarını sil.
          </p>
        </div>
        <button
          type="button"
          onClick={tara}
          disabled={yukleniyor || siliyor}
          className="shrink-0 rounded-xl bg-royal/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-royal disabled:opacity-50"
        >
          {yukleniyor ? "Taranıyor…" : "Hesabı Tara"}
        </button>
      </div>

      {mesaj && (
        <p className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-200">{mesaj}</p>
      )}

      {tarama && (
        <>
          {/* Doluluk çubuğu */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                Klon slotu: <span className="font-semibold text-slate-100">{dolu}</span> / {sinir}
                {tarama.tier && (
                  <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase text-emerald-300">
                    {tarama.tier}
                  </span>
                )}
                {tarama.voiceLimit == null && (
                  <span className="ml-1.5 text-[0.65rem] text-slate-500">(limit okunamadı — varsayım 30)</span>
                )}
              </span>
              <span className={dolu >= sinir ? "text-rose-400 font-semibold" : "text-slate-400"}>
                {dolu >= sinir ? "DOLU — yeni klon açılamıyor" : `${sinir - dolu} slot boş`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all ${doluYuzde >= 100 ? "bg-rose-500" : doluYuzde >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${doluYuzde}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Hesapta toplam {tarama.toplamSes} ses var ({tarama.klonSayisi} klon + {tarama.toplamSes - tarama.klonSayisi} hazır/marka).
              Bunlardan <span className="text-amber-300 font-medium">{tarama.yetimSayisi} yetim</span> (kimseye bağlı değil).
            </p>
          </div>

          {tarama.yetimSayisi > 0 && (
            <button
              type="button"
              onClick={yetimleriSil}
              disabled={siliyor}
              className="w-full rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {siliyor ? "Siliniyor…" : `Tüm Yetim Klonları Sil (${tarama.yetimSayisi}) — ${tarama.yetimSayisi} slot açılır`}
            </button>
          )}

          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {tarama.klonlar.map((k) => (
              <li
                key={k.voice_id}
                className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{k.ad}</p>
                  <p className="truncate text-[0.7rem] text-slate-500">{k.voice_id}</p>
                </div>
                {k.bagliKisi ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
                    {k.bagliKisi}
                  </span>
                ) : (
                  <>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-amber-300">
                      Yetim
                    </span>
                    <button
                      type="button"
                      onClick={() => tekSil(k.voice_id)}
                      disabled={siliyor}
                      className="shrink-0 rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-40"
                    >
                      Sil
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
