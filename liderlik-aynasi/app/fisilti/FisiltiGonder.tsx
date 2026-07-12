"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SesKaydedici from "@/app/soz/SesKaydedici";

type Kisi = { id: string; ad: string };

// G5 — fısıltı gönder: kişi seç → 15-30 sn gerçek ses → isimli/anonim → gönder.
export default function FisiltiGonder({ kalan, kisiler }: { kalan: number; kisiler: Kisi[] }) {
  const router = useRouter();
  const [secili, setSecili] = useState<Kisi | null>(null);
  const [arama, setArama] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [anonim, setAnonim] = useState(false);
  const [bilirse, setBilirse] = useState(true);
  const [mesgul, setMesgul] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  const kalanYok = kalan <= 0;
  const suzulmus = arama.trim()
    ? kisiler.filter((k) => k.ad.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")))
    : kisiler.slice(0, 8);

  async function gonder() {
    if (!secili || !blob) return;
    setMesgul(true);
    setMesaj(null);
    try {
      const fd = new FormData();
      fd.append("ses", blob, "fisilti.webm");
      fd.append("alici", secili.id);
      fd.append("anonim", String(anonim));
      fd.append("bilirseOgrensin", String(bilirse));
      const r = await fetch("/api/fisilti", { method: "POST", body: fd });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; hata?: string };
      if (r.ok && j.ok) {
        setMesaj("🔒 Fısıltın kilitli olarak gönderildi.");
        setSecili(null);
        setBlob(null);
        setArama("");
        router.refresh();
      } else setMesaj(j.hata ?? "Gönderilemedi.");
    } catch {
      setMesaj("Ağ hatası.");
    } finally {
      setMesgul(false);
    }
  }

  if (kalanYok) {
    return (
      <section className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4 text-center text-sm text-slate-400">
        Bugünlük fısıltı hakkın bitti. Market'ten +1 alabilir ya da yarın devam edebilirsin.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-gold/25 bg-gold/[0.04] p-4">
      <p className="text-sm font-bold text-gold-light">Birine sesli bir şey söyle</p>

      {!secili ? (
        <div>
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Kim? (ara)"
            className="w-full rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
          />
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {suzulmus.map((k) => (
              <li key={k.id}>
                <button
                  onClick={() => setSecili(k)}
                  className="w-full rounded-xl border border-royal/20 bg-midnight-soft px-3 py-2 text-left text-sm text-slate-100 hover:border-gold"
                >
                  {k.ad}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl bg-midnight-soft/70 px-3 py-2 text-sm">
            <span className="text-slate-100">{secili.ad}</span>
            <button onClick={() => setSecili(null)} className="text-xs text-slate-500 hover:text-gold-light">değiştir</button>
          </div>
          <SesKaydedici onKayit={(b) => setBlob(b)} />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={anonim} onChange={(e) => setAnonim(e.target.checked)} />
              Anonim gönder (kim söyledi tahmin oyunu açılır)
            </label>
            {anonim && (
              <label className="ml-6 flex items-center gap-2 text-sm text-slate-400">
                <input type="checkbox" checked={bilirse} onChange={(e) => setBilirse(e.target.checked)} />
                Doğru bilirse kimliğim açılsın
              </label>
            )}
          </div>
          <button
            onClick={gonder}
            disabled={mesgul || !blob}
            className="btn-kor h-12 w-full rounded-xl text-base font-bold disabled:opacity-50"
          >
            {mesgul ? "Gönderiliyor…" : "🔒 Kilitli gönder"}
          </button>
        </>
      )}
      {mesaj && <p className="text-center text-sm text-gold-light">{mesaj}</p>}
    </section>
  );
}
