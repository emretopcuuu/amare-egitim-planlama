"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.zamanlama;

type Olay = {
  id: number;
  event_type: string;
  wave_id: number | null;
  fire_at: string;
  fired: boolean;
  cancelled: boolean;
};

type Dalga = { id: number; ad: string };

function etkinlikAdi(olay: Olay, dalgalar: Dalga[]): string {
  const dalga = dalgalar.find((d) => d.id === olay.wave_id);
  const et = t.eventTipler;
  switch (olay.event_type) {
    case "wave_open": return et.wave_open(dalga?.ad ?? `Dalga ${olay.wave_id}`);
    case "wave_close": return et.wave_close(dalga?.ad ?? `Dalga ${olay.wave_id}`);
    case "report_open": return et.report_open;
    case "report_close": return et.report_close;
    case "prova_off": return et.prova_off;
    default: return olay.event_type;
  }
}

function formatZaman(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function OtomatikZamanlama({ dalgalar }: { dalgalar: Dalga[] }) {
  const router = useRouter();
  const [olaylar, setOlaylar] = useState<Olay[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [tip, setTip] = useState("wave_open");
  const [dalgaId, setDalgaId] = useState<string>(String(dalgalar[0]?.id ?? ""));
  const [zaman, setZaman] = useState("");
  const [eklemeMesgul, setEklemeMesgul] = useState(false);
  const [tetikleniyor, setTetikleniyor] = useState(false);
  const [akilliMesgul, setAkilliMesgul] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/zamanlama");
      const veri = await res.json().catch(() => null);
      if (res.ok) setOlaylar(veri.olaylar ?? []);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => { void yukle(); }, [yukle]);

  async function ekle() {
    if (!zaman) { tost("Saat seç", "hata"); return; }
    setEklemeMesgul(true);
    try {
      const fireAt = new Date(zaman + ":00+03:00").toISOString();
      const res = await fetch("/api/admin/zamanlama", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event_type: tip,
          wave_id: tip.startsWith("wave_") ? Number(dalgaId) : null,
          fire_at: fireAt,
        }),
      });
      if (!res.ok) { tost(t.hata, "hata"); return; }
      tost(t.eklendi, "basari");
      setZaman("");
      await yukle();
      router.refresh();
    } catch {
      tost(t.hata, "hata");
    } finally {
      setEklemeMesgul(false);
    }
  }

  async function manuelTetikle() {
    setTetikleniyor(true);
    try {
      const res = await fetch("/api/cron/olaylar", { method: "POST" });
      if (!res.ok) { tost(t.hata, "hata"); return; }
      const veri = await res.json().catch(() => null) as { islem?: number } | null;
      tost(`${t.manuelTetiklendi} (${veri?.islem ?? 0} işlem)`, "basari");
      await yukle();
      router.refresh();
    } catch {
      tost(t.hata, "hata");
    } finally {
      setTetikleniyor(false);
    }
  }

  async function akilliDurt() {
    setAkilliMesgul(true);
    try {
      const res = await fetch("/api/cron/akilli-durtme", { method: "POST" });
      if (!res.ok) {
        tost(tr.akilliDurtme.hata, "hata");
        return;
      }
      const veri = (await res.json().catch(() => null)) as {
        gonderilen?: number;
      } | null;
      tost(
        `${tr.akilliDurtme.tetiklendi} (${veri?.gonderilen ?? 0} kişi)`,
        "basari"
      );
    } catch {
      tost(tr.akilliDurtme.hata, "hata");
    } finally {
      setAkilliMesgul(false);
    }
  }

  async function iptal(id: number) {
    if (!confirm(t.iptalOnay)) return;
    const res = await fetch(`/api/admin/zamanlama?id=${id}`, { method: "DELETE" });
    if (res.ok) { tost(t.iptalEdildi, "basari"); await yukle(); router.refresh(); }
    else tost(t.hata, "hata");
  }

  const dalagaGerektiren = ["wave_open", "wave_close"].includes(tip);

  return (
    <div className="space-y-4">
      {/* Manuel tetikle */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-900/20 px-4 py-3">
        <p className="text-xs text-amber-300">{t.manuelBilgi}</p>
        <button
          onClick={() => void manuelTetikle()}
          disabled={tetikleniyor}
          className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-[#1a1206] transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {tetikleniyor ? t.manuelTetikleniyor : t.manuelTetikle}
        </button>
      </div>

      {/* #9 Akıllı Dürtme — bağlama duyarlı kişiye özel bildirim */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-300">
            {tr.akilliDurtme.yonetBaslik}
          </p>
          <p className="mt-0.5 text-xs text-emerald-200/70">
            {tr.akilliDurtme.yonetAciklama}
          </p>
        </div>
        <button
          onClick={() => void akilliDurt()}
          disabled={akilliMesgul}
          className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-[#06121e] transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {akilliMesgul ? tr.akilliDurtme.tetikleniyor : tr.akilliDurtme.tetikle}
        </button>
      </div>

      {/* Yeni zamanlama formu */}
      <div className="rounded-xl border border-royal-light/30 bg-midnight-soft/50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">{t.ekle}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            className="rounded-xl border border-royal-light/30 bg-midnight-soft p-2.5 text-sm text-slate-100 outline-none focus:border-gold"
          >
            <option value="wave_open">Dalga Aç</option>
            <option value="wave_close">Dalga Kapat</option>
            <option value="report_open">Raporları Aç</option>
            <option value="report_close">Raporları Kapat</option>
            <option value="prova_off">Prova Modunu Kapat</option>
          </select>

          {dalagaGerektiren && (
            <select
              value={dalgaId}
              onChange={(e) => setDalgaId(e.target.value)}
              className="rounded-xl border border-royal-light/30 bg-midnight-soft p-2.5 text-sm text-slate-100 outline-none focus:border-gold"
            >
              {dalgalar.map((d) => (
                <option key={d.id} value={d.id}>{d.ad}</option>
              ))}
            </select>
          )}

          <input
            type="datetime-local"
            value={zaman}
            onChange={(e) => setZaman(e.target.value)}
            className="rounded-xl border border-royal-light/30 bg-midnight-soft p-2.5 text-sm text-slate-100 outline-none focus:border-gold sm:col-span-2"
          />
        </div>
        <button
          onClick={() => void ekle()}
          disabled={eklemeMesgul || !zaman}
          className="mt-3 w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {eklemeMesgul ? t.ekleniyor : t.ekle}
        </button>
      </div>

      {/* Mevcut zamanlamalar */}
      {yukleniyor ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : olaylar.length === 0 ? (
        <p className="text-sm text-slate-500">{t.bosYok}</p>
      ) : (
        <ul className="divide-y divide-royal/20">
          {olaylar.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className={`text-sm font-medium ${o.fired ? "text-emerald-400" : "text-slate-100"}`}>
                  {etkinlikAdi(o, dalgalar)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {o.fired
                    ? `${t.ateslendi} · ${formatZaman(o.fire_at)}`
                    : t.ateslenecek(formatZaman(o.fire_at))}
                </p>
              </div>
              {!o.fired && (
                <button
                  onClick={() => void iptal(o.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t.iptal}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
