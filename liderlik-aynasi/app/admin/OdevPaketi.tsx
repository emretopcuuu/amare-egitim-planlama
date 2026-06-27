"use client";

import { useState } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.odev;
const GUNLER = [3, 7, 10, 15, 30];

// Hazır "Pano görevi" şablonları — liderlik/iş kurmayla ilişkili foto ve oylama
// ödevleri. Tıkla → başlık+metni doldurur (admin düzenleyip gönderir). Mevcut
// foto→duvar ve beğeni altyapısını kullanır; pano dolar, "özel anlar" eğlenceli olur.
const PANO_SABLONLAR: { etiket: string; baslik: string; govde: string }[] = [
  {
    etiket: "📸 Liderlik anı",
    baslik: "📸 Liderlik Anını Yakala",
    govde:
      "Bugün kampta bir liderlik anı yakala — birine sessizce destek olan, öne çıkan, cesaret gösteren biri. Fotoğrafı panoya yükle ve altına tek cümle yaz: bu kare hangi liderlik özelliğini gösteriyor? (İşini kurarken de seni taşıyan aynı özellik.)",
  },
  {
    etiket: "📸 Ekip enerjisi",
    baslik: "📸 Ekibinin Enerjisi",
    govde:
      "Grubunun/ekibinin enerjisini en iyi anlatan bir kare çek ve panoya yükle. Bir lider olarak bu enerjiyi nasıl büyütürsün — tek cümleyle anlat.",
  },
  {
    etiket: "📸 Cesaret karesi",
    baslik: "📸 Cesaret Karesi",
    govde:
      "Bugün seni konfor alanından çıkaran bir anı yakala ve panoya yükle. İşini büyütmek de bu tür cesaret anlarıyla olur — o an sana ne öğretti, tek cümle.",
  },
  {
    etiket: "👍 Panoda 5 beğeni",
    baslik: "👍 Panoda 5 Kareyi Onurlandır",
    govde:
      "Panoya git, seni en çok etkileyen en az 5 kareyi beğen 👍. Sonra en sevdiğin 3'ünü seç ve her birinde hangi liderlik niteliğini gördüğünü kısaca yaz. (Başkasını takdir etmek de liderliktir.)",
  },
];

// FAZ 2 — Ödev paketi: admin tüm katılımcılara yapılandırılmış ödev gönderir.
export default function OdevPaketi() {
  const [baslik, setBaslik] = useState("");
  const [govde, setGovde] = useState("");
  const [gun, setGun] = useState(10);
  const [mesgul, setMesgul] = useState(false);

  async function gonder() {
    if (!baslik.trim() || !govde.trim()) {
      tost(t.bosUyari, "hata");
      return;
    }
    if (!confirm(t.onay(baslik.trim()))) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/odev", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baslik, govde, gun }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        tost(v?.hata ?? t.hata, "hata");
        return;
      }
      tost(t.gonderildi(v?.gonderilen ?? 0), "basari");
      setBaslik("");
      setGovde("");
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{t.aciklama}</p>
      {/* Hazır pano görevi şablonları — tıkla → başlık+metni doldur, sonra gönder */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          Hazır pano görevleri
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PANO_SABLONLAR.map((s) => (
            <button
              key={s.etiket}
              type="button"
              onClick={() => {
                setBaslik(s.baslik);
                setGovde(s.govde);
              }}
              className="rounded-full border border-royal-light/30 bg-midnight-soft px-3 py-1 text-xs text-slate-200 transition-colors hover:border-gold"
            >
              {s.etiket}
            </button>
          ))}
        </div>
      </div>
      <input
        value={baslik}
        onChange={(e) => setBaslik(e.target.value)}
        placeholder={t.baslikYer}
        className="w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
      />
      <textarea
        value={govde}
        onChange={(e) => setGovde(e.target.value)}
        rows={3}
        placeholder={t.govdeYer}
        className="w-full resize-none rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">{t.gunEtiket}</label>
        <select
          value={gun}
          onChange={(e) => setGun(Number(e.target.value))}
          className="rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-gold"
        >
          {GUNLER.map((g) => (
            <option key={g} value={g}>
              {t.gun(g)}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => void gonder()}
        disabled={mesgul || !baslik.trim() || !govde.trim()}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-gold text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {mesgul ? t.gonderiliyor : t.gonder}
      </button>
    </div>
  );
}
