"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fazSifir;

// FAZ 0 admin kontrolü: Oda QR kodunu ayarla + tamamlanma sayısını izle.
export default function FazSifirKontrol() {
  const [kod, setKod] = useState("");
  const [kayitliKod, setKayitliKod] = useState(""); // QR yalnız KAYDEDİLEN koddan üretilir
  const [tamam, setTamam] = useState(0);
  const [toplam, setToplam] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [qrSvg, setQrSvg] = useState("");

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pusula");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
        setKod(v.kilitKodu ?? "");
        setKayitliKod(v.kilitKodu ?? "");
        setTamam(v.tamam ?? 0);
        setToplam(v.toplam ?? 0);
      }
    } finally {
      setYuklendi(true);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  // Oda QR'ını KAYDEDİLEN koddan + bu tarayıcının origin'inden üret. Kritik:
  // QR, admin'in panel açtığı domaini taşır → katılımcıyla AYNI domaine gider
  // (yanlış preview domainine düşme sorununu önler). Kod boşsa QR yok.
  useEffect(() => {
    const k = kayitliKod.trim();
    if (!k || typeof window === "undefined") {
      setQrSvg("");
      return;
    }
    let iptal = false;
    const url = `${window.location.origin}/ac?k=${encodeURIComponent(k)}`;
    void import("qrcode").then((m) =>
      m.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((svg) => {
        if (!iptal) setQrSvg(svg);
      })
    );
    return () => {
      iptal = true;
    };
  }, [kayitliKod]);

  async function gonder(govde: Record<string, unknown>, basariMesaji: string) {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/pusula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      if (!res.ok) {
        tost(t.hata, "hata");
        return;
      }
      tost(basariMesaji, "basari");
      await yukle();
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  async function hatirlat() {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/hazirlik-hatirlat", { method: "POST" });
      const v = await res.json().catch(() => null);
      if (res.ok && v) tost(t.hatirlatSonuc(v.gonderildi ?? 0), "basari");
      else tost(t.hata, "hata");
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  // #13 Toplu kampı aç — oda QR'ı çalışmazsa kampa gelmemiş herkesin mührünü kaldırır.
  async function topluAc() {
    if (!confirm(t.topluAcOnay)) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/pusula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topluAc: true }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v) tost(t.topluAcSonuc(v.acilan ?? 0), "basari");
      else tost(t.hata, "hata");
    } catch {
      tost(t.hata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  const qrUrl =
    typeof window !== "undefined" && kod.trim()
      ? `${window.location.origin}/ac?k=${encodeURIComponent(kod.trim())}`
      : "";

  if (!yuklendi) {
    return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      {/* Tamamlanma */}
      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>

      {/* Akıllı hatırlatma: hazırlığı eksik olanlara kişiselleştirilmiş push */}
      <button
        onClick={() => void hatirlat()}
        disabled={mesgul}
        className="w-full rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
      >
        {t.hatirlatDugme}
      </button>

      {/* #13 Toplu kampı aç — oda QR'ı patlarsa görevli yedeği */}
      <button
        onClick={() => void topluAc()}
        disabled={mesgul}
        className="w-full rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-bold text-[#04140c] transition-colors hover:bg-emerald-400 disabled:opacity-50"
      >
        {t.topluAcDugme}
      </button>

      {/* Oda QR kodu */}
      <div>
        <label className="text-sm font-medium text-slate-300">{t.kodEtiket}</label>
        <div className="mt-2 flex gap-2">
          <input
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder={t.kodYer}
            className="flex-1 rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
          />
          <button
            onClick={() => void gonder({ kilitKodu: kod }, t.kodKaydedildi)}
            disabled={mesgul}
            className="shrink-0 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {t.kodKaydet}
          </button>
        </div>
        {kod.trim() ? (
          <p className="mt-2 break-all text-xs text-slate-500">{t.qrIpucu(qrUrl)}</p>
        ) : (
          <p className="mt-2 text-xs text-amber-400">{t.kodBos}</p>
        )}

        {/* Taranabilir oda QR'ı — kampta kapıya/odaya as. Katılımcı kendi
            telefonunda (giriş yapmış) okutunca mührü kalkar. */}
        {qrSvg && (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-royal-light/20 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-light">
              {t.qrGorselBaslik}
            </p>
            <div
              className="w-44 rounded-xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-2 text-center text-[0.7rem] leading-relaxed text-slate-500">
              {t.qrGorselNot}
            </p>
            {kod.trim() !== kayitliKod.trim() && (
              <p className="mt-1 text-center text-[0.7rem] font-medium text-amber-400">
                {t.qrKaydedilmemis}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
