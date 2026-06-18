"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.gorevTuru;

// #9 Görev Türü Stüdyosu — sürükle-bırak. Türler iki sütun arasında taşınır:
// "Aktif" (AYNA üretir) ve "Kapalı" (üretmez). Masaüstünde HTML5 drag-drop;
// her kartta ayrıca ok düğmesi var (dokunmatik/erişilebilir yedek). Kayıt,
// kapalı sütununu `kapali` olarak gönderir — API sözleşmesi değişmez.
export default function GorevTuruYonetim({
  turler,
  kapali,
}: {
  turler: string[];
  kapali: string[];
}) {
  const router = useRouter();
  const kapaliBas = turler.filter((x) => kapali.includes(x));
  const aktifBas = turler.filter((x) => !kapali.includes(x));
  const [aktif, setAktif] = useState<string[]>(aktifBas);
  const [pasif, setPasif] = useState<string[]>(kapaliBas);
  const [suruklenen, setSuruklenen] = useState<string | null>(null);
  const [uzerinde, setUzerinde] = useState<"aktif" | "pasif" | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [durum, setDurum] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function tasi(tur: string, hedef: "aktif" | "pasif") {
    setDurum(null);
    setHata(null);
    setAktif((a) => {
      const yeni = a.filter((x) => x !== tur);
      if (hedef === "aktif" && !yeni.includes(tur)) yeni.push(tur);
      return turler.filter((x) => yeni.includes(x));
    });
    setPasif((p) => {
      const yeni = p.filter((x) => x !== tur);
      if (hedef === "pasif" && !yeni.includes(tur)) yeni.push(tur);
      return turler.filter((x) => yeni.includes(x));
    });
  }

  function birak(hedef: "aktif" | "pasif") {
    if (suruklenen) tasi(suruklenen, hedef);
    setSuruklenen(null);
    setUzerinde(null);
  }

  async function kaydet() {
    if (mesgul) return;
    if (aktif.length === 0) {
      setHata(t.enAzBir);
      return;
    }
    setMesgul(true);
    setDurum(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/gorev-turleri", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kapali: pasif }),
      });
      if (!res.ok) {
        const v = (await res.json().catch(() => null)) as { hata?: string } | null;
        throw new Error(v?.hata);
      }
      setDurum(t.kayitli);
      router.refresh();
    } catch (e) {
      setHata((e as Error).message || t.hata);
    } finally {
      setMesgul(false);
    }
  }

  function Kart({ tur, sutun }: { tur: string; sutun: "aktif" | "pasif" }) {
    const bilgi = t.turler[tur as keyof typeof t.turler];
    const hedef = sutun === "aktif" ? "pasif" : "aktif";
    return (
      <div
        draggable
        onDragStart={() => setSuruklenen(tur)}
        onDragEnd={() => {
          setSuruklenen(null);
          setUzerinde(null);
        }}
        className={`cursor-grab rounded-2xl border p-3 transition-colors active:cursor-grabbing ${
          sutun === "aktif"
            ? "border-royal/30 bg-midnight-card/60"
            : "border-white/5 bg-midnight-card/20 opacity-70"
        } ${suruklenen === tur ? "opacity-40" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gold-light">
              <span className="mr-1 tracking-tighter text-slate-500" aria-hidden>
                ⋮⋮
              </span>
              {bilgi?.ad ?? tur}
            </p>
            <p className="mt-1 text-xs text-slate-400">{bilgi?.aciklama}</p>
          </div>
          <button
            onClick={() => tasi(tur, hedef)}
            aria-label={sutun === "aktif" ? t.pasifeTasi : t.aktifeTasi}
            className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
          >
            {sutun === "aktif" ? `${t.pasifeTasi} →` : `← ${t.aktifeTasi}`}
          </button>
        </div>
      </div>
    );
  }

  function Sutun({
    ad,
    baslik,
    liste,
    bosMetin,
  }: {
    ad: "aktif" | "pasif";
    baslik: string;
    liste: string[];
    bosMetin: string;
  }) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setUzerinde(ad);
        }}
        onDragLeave={() => setUzerinde((u) => (u === ad ? null : u))}
        onDrop={() => birak(ad)}
        className={`flex-1 rounded-2xl border-2 border-dashed p-3 transition-colors ${
          uzerinde === ad
            ? "border-gold/60 bg-gold/5"
            : ad === "aktif"
              ? "border-emerald-500/20 bg-emerald-500/[0.03]"
              : "border-white/10 bg-white/[0.01]"
        }`}
      >
        <p
          className={`mb-3 text-xs font-semibold uppercase tracking-wide ${
            ad === "aktif" ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {baslik} · {liste.length}
        </p>
        <div className="space-y-2">
          {liste.length === 0 ? (
            <p className="rounded-xl bg-black/20 px-3 py-6 text-center text-xs text-slate-500">
              {bosMetin}
            </p>
          ) : (
            liste.map((tur) => <Kart key={tur} tur={tur} sutun={ad} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{t.surukleIpucu}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Sutun ad="aktif" baslik={t.aktifBaslik} liste={aktif} bosMetin={t.aktifBos} />
        <Sutun ad="pasif" baslik={t.pasifBaslik} liste={pasif} bosMetin={t.pasifBos} />
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 bg-midnight/85 py-3 backdrop-blur">
        <button
          onClick={kaydet}
          disabled={mesgul}
          className="btn-kor rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
        >
          {mesgul ? t.kaydediliyor : t.kaydet}
        </button>
        {durum && <span className="text-sm text-emerald-400">{durum}</span>}
        {hata && <span className="text-sm text-red-400">{hata}</span>}
      </div>
    </div>
  );
}
