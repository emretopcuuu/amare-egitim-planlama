"use client";

import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.whatsapp.grupLink;

type Kisi = { id: string; ad: string; takim: string | null; telefonVar: boolean };

// "Grup 1 / Grup 2 / ..." satırlarını, hemen altlarındaki linkle eşler.
// Aradaki süslemeler (yıldız, emoji, "PD101" vb.) yoksayılır — yalnız
// "grup" kelimesi + sayı ve bir sonraki http(s) satırı aranır.
function gruplariAyristir(ham: string): Map<number, string> {
  const sonuc = new Map<number, string>();
  let bekleyenGrup: number | null = null;
  for (const satirHam of ham.split(/\r?\n/)) {
    const satir = satirHam.trim();
    if (!satir) continue;
    const grupEslesme = satir.match(/grup\s*#?\s*(\d{1,2})/i);
    if (grupEslesme) {
      bekleyenGrup = parseInt(grupEslesme[1], 10);
      continue;
    }
    const linkEslesme = satir.match(/https?:\/\/\S+/);
    if (linkEslesme && bekleyenGrup !== null && !sonuc.has(bekleyenGrup)) {
      sonuc.set(bekleyenGrup, linkEslesme[0]);
      bekleyenGrup = null;
    }
  }
  return sonuc;
}

export default function GrupLinkGonder({
  yapilandirildi,
  kisiler,
  duyuruKayitli,
}: {
  yapilandirildi: boolean;
  kisiler: Kisi[];
  duyuruKayitli: boolean;
}) {
  const [ham, setHam] = useState("");
  const [onSoz, setOnSoz] = useState("");
  const [onayAcik, setOnayAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<{
    detay: {
      takim: string;
      basarili: number;
      basarisiz: number;
      telefonsuz: number;
      hataOrnegi?: string;
    }[];
  } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const gruplar = useMemo(() => gruplariAyristir(ham), [ham]);

  const onizlemeSatirlari = useMemo(() => {
    return [...gruplar.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([no, link]) => {
        const takim = `Grup ${no}`;
        const kisiListesi = kisiler.filter((k) => k.takim === takim);
        const telefonlu = kisiListesi.filter((k) => k.telefonVar).length;
        return {
          takim,
          link,
          toplam: kisiListesi.length,
          telefonlu,
          telefonsuz: kisiListesi.length - telefonlu,
        };
      });
  }, [gruplar, kisiler]);

  const toplamKisi = onizlemeSatirlari.reduce((tpl, s) => tpl + s.telefonlu, 0);
  const gonderilebilir =
    yapilandirildi && duyuruKayitli && onizlemeSatirlari.length > 0 && toplamKisi > 0 && !gonderiliyor;

  async function gonder() {
    setGonderiliyor(true);
    setHata(null);
    try {
      // Meta kuralı: şablon değişkeninde satır sonu YASAK — ön söz ile link
      // tek boşlukla birleşir (sunucu da ayrıca temizler, çift emniyet).
      const gruplarGovde = onizlemeSatirlari.map((s) => ({
        takim: s.takim,
        mesaj: (onSoz.trim() ? `${onSoz.trim()} ${s.link}` : s.link),
      }));
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sablon: "duyuru", hedefTipi: "gruplar", gruplar: gruplarGovde }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hata);
        return;
      }
      setSonuc({ detay: veri.detay ?? [] });
      setOnayAcik(false);
      setHam("");
      setOnSoz("");
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-midnight/30 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gold-light">{t.baslik}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.aciklama}</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-400">{t.yapistirEtiket}</label>
        <textarea
          value={ham}
          onChange={(e) => { setHam(e.target.value); setSonuc(null); setHata(null); }}
          rows={8}
          placeholder={t.yapistirYer}
          className="mt-1 w-full resize-none whitespace-pre-wrap rounded-lg border border-white/15 bg-midnight p-3 font-mono text-xs text-slate-100 outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-400">{t.onSozEtiket}</label>
        <input
          value={onSoz}
          onChange={(e) => setOnSoz(e.target.value)}
          maxLength={200}
          placeholder={t.onSozYer}
          className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-midnight px-3 text-sm text-slate-100 outline-none focus:border-gold"
        />
      </div>

      {ham.trim().length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400">{t.onizlemeBaslik}</p>
          {onizlemeSatirlari.length === 0 ? (
            <p className="mt-1 text-sm text-amber-400">{t.bulunamadi}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {onizlemeSatirlari.map((s) => (
                <li
                  key={s.takim}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-slate-100">{s.takim}</span>
                  <span className="truncate text-xs text-slate-500" title={s.link}>{s.link}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {t.kisiSayisi(s.telefonlu)}
                    {s.telefonsuz > 0 && t.telefonsuz(s.telefonsuz)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hata && <p className="text-sm font-medium text-red-400">{hata}</p>}

      {sonuc && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
          <p className="text-sm font-semibold text-emerald-200">{t.sonucBaslik}</p>
          <ul className="mt-1.5 space-y-0.5">
            {sonuc.detay.map((d) => (
              <li key={d.takim} className="text-xs text-emerald-100/90">
                {t.sonucSatiri(d.takim, d.basarili, d.basarisiz, d.telefonsuz)}
                {d.hataOrnegi && (
                  <span className="block pl-3 text-[0.7rem] text-amber-300/90">
                    ⚠ {d.hataOrnegi}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onizlemeSatirlari.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          {onayAcik ? (
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-sm font-medium text-slate-100">
                {t.onaySoru(onizlemeSatirlari.length, toplamKisi)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={gonder}
                  disabled={gonderiliyor}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
                >
                  {gonderiliyor ? t.gonderiliyor : t.gonderEt}
                </button>
                <button
                  onClick={() => setOnayAcik(false)}
                  disabled={gonderiliyor}
                  className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
                >
                  {t.vazgec}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOnayAcik(true)}
              disabled={!gonderilebilir}
              className="btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.gonder}
            </button>
          )}
          {!duyuruKayitli && (
            <p className="mt-2 text-xs text-amber-400">{t.sablonKayitsiz}</p>
          )}
        </div>
      )}
    </div>
  );
}
