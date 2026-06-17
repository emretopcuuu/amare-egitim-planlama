"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.mudahale;

export default function MudahaleKonsolu({ hedefId }: { hedefId: string }) {
  const router = useRouter();
  const [calisan, setCalisan] = useState<string | null>(null);
  const [fisilti, setFisilti] = useState("");
  const [sonuc, setSonuc] = useState<{ ok: boolean; metin: string } | null>(null);

  async function gonder(eylem: string, ek?: Record<string, unknown>) {
    if (calisan) return;
    setCalisan(eylem);
    setSonuc(null);
    try {
      const res = await fetch("/api/admin/mudahale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hedefId, eylem, ...ek }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        setSonuc({ ok: false, metin: v?.hata ?? t.hata });
        return;
      }
      if (eylem === "gorev") setSonuc({ ok: true, metin: t.gorevVerildi(v?.baslik ?? "") });
      else if (eylem === "iptal") setSonuc({ ok: true, metin: t.iptalEdildi(v?.sayi ?? 0) });
      else setSonuc({ ok: true, metin: t.fisiltiGonderildi });
      if (eylem === "fisilti") setFisilti("");
      router.refresh();
    } catch {
      setSonuc({ ok: false, metin: t.hata });
    } finally {
      setCalisan(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => gonder("gorev")}
          disabled={!!calisan}
          className="flex h-11 items-center justify-center rounded-xl bg-gold px-4 text-sm font-bold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {calisan === "gorev" ? t.uretiliyor : `🎯 ${t.gorevVer}`}
        </button>
        <button
          onClick={() => gonder("iptal")}
          disabled={!!calisan}
          className="flex h-11 items-center justify-center rounded-xl border border-red-400/30 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
        >
          {calisan === "iptal" ? "…" : `✖ ${t.bekleyeniIptal}`}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs font-semibold text-slate-400">{t.fisiltiBaslik}</p>
        <textarea
          value={fisilti}
          onChange={(e) => setFisilti(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder={t.fisiltiYer}
          className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-midnight-card p-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
        />
        <button
          onClick={() => gonder("fisilti", { mesaj: fisilti })}
          disabled={!!calisan || !fisilti.trim()}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-lg border border-royal-light/30 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          {calisan === "fisilti" ? t.gonderiliyor : `🔔 ${t.fisiltiGonder}`}
        </button>
      </div>

      {sonuc && (
        <p className={`text-sm font-medium ${sonuc.ok ? "text-emerald-400" : "text-red-400"}`}>{sonuc.metin}</p>
      )}
    </div>
  );
}
