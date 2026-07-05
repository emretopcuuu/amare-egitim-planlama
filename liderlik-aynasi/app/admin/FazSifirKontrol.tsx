"use client";

import { useEffect, useState, useCallback } from "react";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fazSifir;

// FAZ 0 admin kontrolü: hazırlık tamamlanma sayısını izle + hatırlatma gönder.
export default function FazSifirKontrol() {
  const [tamam, setTamam] = useState(0);
  const [toplam, setToplam] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  // [TOPLU AÇ] Kampı herkese tek tıkla açma — onay + sonuç.
  const [acmaOnay, setAcmaOnay] = useState(false);
  const [aciyor, setAciyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pusula");
      const v = await res.json().catch(() => null);
      if (res.ok && v) {
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

  // [TOPLU AÇ] QR/oda kilidi olmadan HERKESİN kampını açar (camp_unlocked_at).
  // AYNA uyandıktan sonra tek tıkla tüm katılımcıları içeri alır.
  async function topluAc() {
    setAciyor(true);
    try {
      const res = await fetch("/api/admin/pusula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topluAc: true }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.tamam) {
        tost(`🔓 Kamp açıldı — ${v.acilan ?? 0} kişi içeri alındı.`, "basari");
        setAcmaOnay(false);
      } else {
        tost("Açılamadı, tekrar dene.", "hata");
      }
    } catch {
      tost("Açılamadı, tekrar dene.", "hata");
    } finally {
      setAciyor(false);
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

  if (!yuklendi) {
    return <p className="text-sm text-slate-500">{tr.pusula.yukleniyor}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      <div className="rounded-xl bg-midnight-soft p-3 text-center">
        <p className="text-2xl font-bold text-gold">
          {tamam}/{toplam}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t.tamamlanma(tamam, toplam)}</p>
      </div>

      <button
        onClick={() => void hatirlat()}
        disabled={mesgul}
        className="w-full rounded-xl border border-royal-light/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
      >
        {t.hatirlatDugme}
      </button>

      {/* [TOPLU AÇ] Kampı herkese aç — QR uğraşmadan. AYNA uyandıktan sonra bas. */}
      <div className="rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
        <p className="text-xs leading-relaxed text-slate-400">
          🔓 <span className="font-semibold text-gold-light">Toplu kampı aç:</span> QR/oda kilidi olmadan
          tüm katılımcıları tek tıkla kampın içine alır. (Önce AYNA&apos;yı uyandırmış ol.)
        </p>
        {acmaOnay ? (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => void topluAc()}
              disabled={aciyor}
              className="flex-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {aciyor ? "Açılıyor…" : "Evet, herkesi aç 🔓"}
            </button>
            <button
              onClick={() => setAcmaOnay(false)}
              disabled={aciyor}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 disabled:opacity-50"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAcmaOnay(true)}
            className="mt-2 w-full rounded-lg border border-gold/50 px-4 py-2.5 text-sm font-bold text-gold-light transition-colors hover:bg-gold/10"
          >
            🔓 Toplu kampı aç
          </button>
        )}
      </div>
    </div>
  );
}
