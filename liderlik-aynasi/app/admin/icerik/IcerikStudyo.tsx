"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { DAVRANIS_DILI } from "@/lib/davranisDili";

const t = tr.admin.icerik;

// #10 Davranışsal Dil: kütüphaneden "günün cümlesi" seç → adaya ana sayfada
// görünür. Seçince settings.gunun_cumlesi'ne yazılır; "Kaldır" boşaltır.
function GununCumlesiSecici({ baslangic }: { baslangic: string }) {
  const [aktif, setAktif] = useState(baslangic);
  const [mesgul, setMesgul] = useState(false);

  async function ayarla(cumle: string) {
    setMesgul(true);
    try {
      const r = await fetch("/api/admin/icerik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anahtar: "gunun_cumlesi", deger: cumle }),
      });
      if (r.ok) setAktif(cumle);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-gold/30">
      <h2 className="text-sm font-semibold text-gold-light">🗣 Günün Cümlesi (Davranışsal Dil)</h2>
      <p className="mt-1 text-xs text-slate-400">
        Blueprint'in 5 güçlü cümlesinden birini seç → adayların ana sayfasında görünür.
      </p>
      <div className="mt-3 space-y-2">
        {DAVRANIS_DILI.map((d) => {
          const secili = aktif === d.cumle;
          return (
            <button
              key={d.kategori}
              type="button"
              disabled={mesgul}
              onClick={() => ayarla(secili ? "" : d.cumle)}
              className={`block w-full rounded-xl p-3 text-left text-sm transition-colors disabled:opacity-50 ${
                secili
                  ? "bg-gold/20 ring-2 ring-gold"
                  : "bg-midnight ring-1 ring-white/10 hover:ring-royal/50"
              }`}
            >
              <span className="text-xs font-semibold text-gold-light">
                {d.simge} {d.kategori}
              </span>
              <span className="mt-1 block leading-relaxed text-slate-200">{d.cumle}</span>
            </button>
          );
        })}
      </div>
      {aktif && (
        <button
          type="button"
          disabled={mesgul}
          onClick={() => ayarla("")}
          className="mt-3 text-xs font-medium text-slate-400 underline hover:text-slate-200"
        >
          Günün cümlesini kaldır
        </button>
      )}
    </section>
  );
}

function Alan({
  anahtar,
  etiket,
  ipucu,
  yer,
  baslangic,
}: {
  anahtar: string;
  etiket: string;
  ipucu: string;
  yer: string;
  baslangic: string;
}) {
  const [deger, setDeger] = useState(baslangic);
  const [kayitli, setKayitli] = useState(baslangic);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const degisti = deger !== kayitli;

  async function kaydet() {
    if (kaydediliyor || !degisti) return;
    setKaydediliyor(true);
    setSonuc(null);
    try {
      const r = await fetch("/api/admin/icerik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anahtar, deger }),
      });
      if (r.ok) {
        setKayitli(deger);
        setSonuc(t.kaydedildi);
      } else setSonuc(t.hata);
    } catch {
      setSonuc(t.hata);
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <h2 className="text-sm font-semibold text-gold-light">{etiket}</h2>
      <p className="mt-1 text-xs text-slate-400">{ipucu}</p>
      <textarea
        value={deger}
        onChange={(e) => setDeger(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder={yer}
        className="mt-3 w-full resize-none rounded-lg border border-white/15 bg-midnight p-3 text-sm text-slate-100 outline-none focus:border-gold"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={kaydet}
          disabled={!degisti || kaydediliyor}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {kaydediliyor ? t.kaydediliyor : t.kaydet}
        </button>
        {sonuc && <span className="text-sm text-emerald-400">{sonuc}</span>}
      </div>
    </section>
  );
}

export default function IcerikStudyo({
  ekTon,
  gununTemasi,
  gununCumlesi = "",
}: {
  ekTon: string;
  gununTemasi: string;
  gununCumlesi?: string;
}) {
  return (
    <div className="space-y-4">
      <GununCumlesiSecici baslangic={gununCumlesi} />
      <Alan anahtar="ayna_ek_ton" etiket={t.ekTonBaslik} ipucu={t.ekTonIpucu} yer={t.ekTonYer} baslangic={ekTon} />
      <Alan anahtar="gunun_temasi" etiket={t.temaBaslik} ipucu={t.temaIpucu} yer={t.temaYer} baslangic={gununTemasi} />
    </div>
  );
}
