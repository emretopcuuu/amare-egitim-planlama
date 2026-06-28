"use client";

import { Fragment, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.aynaDirektor;
const gt = tr.gorevler;

const ZOR: Record<1 | 2 | 3, string> = {
  1: "⚡ Isınma",
  2: "⚡⚡ Denge",
  3: "⚡⚡⚡ Meydan Okuma",
};

export type GorevSatir = {
  id: string;
  kisi: string;
  baslik: string;
  tur: string;
  durum: string;
  puan: number | null;
  kivilcim: number;
  govde: string;
  yanit: string | null;
  aiYorum: string | null;
  zorluk: number | null;
  ozellik: string | null;
  tarih: string; // ISO
};

const turEtiket = (k: string) => (gt.turler as Record<string, string>)[k] ?? k;
const durumEtiket = (s: string) => (gt.durumlar as Record<string, string>)[s] ?? s;

function zaman(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Son Görevler tablosu: satıra dokununca o kişiye giden TAM mesaj + yanıt +
// AYNA puanlaması açılır (admin kimin ne aldığını görür).
export default function SonGorevler({ gorevler }: { gorevler: GorevSatir[] }) {
  const [acik, setAcik] = useState<string | null>(null);
  if (gorevler.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">{t.akisYok}</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="mb-2 text-xs text-slate-500">👆 {t.detayIpucu}</p>
      <table className="cizgili w-full text-left text-sm">
        <thead>
          <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
            <th className="py-2 pr-3">Görev</th>
            <th className="py-2 pr-3">Tür</th>
            <th className="py-2 pr-3">Durum</th>
            <th className="py-2 text-right">Puan / ⚡</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-royal/20">
          {gorevler.map((g) => {
            const secik = acik === g.id;
            return (
              <Fragment key={g.id}>
                <tr
                  onClick={() => setAcik(secik ? null : g.id)}
                  className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${
                    secik ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <td className="py-2 pr-3 font-medium text-slate-100">
                    <span className="mr-1 inline-block text-slate-500">
                      {secik ? "▾" : "▸"}
                    </span>
                    {g.kisi}
                  </td>
                  <td className="max-w-56 truncate py-2 pr-3 text-slate-300">{g.baslik}</td>
                  <td className="py-2 pr-3 text-slate-400">{turEtiket(g.tur)}</td>
                  <td className="py-2 pr-3 text-slate-400">{durumEtiket(g.durum)}</td>
                  <td className="py-2 text-right font-mono text-gold-light">
                    {g.durum === "scored" ? `${g.puan ?? "—"} / +${g.kivilcim}` : "—"}
                  </td>
                </tr>
                {secik && (
                  <tr className="bg-black/20">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <Alan baslik={t.detayMesaj}>{g.govde}</Alan>
                        <Alan baslik={t.detayYanit}>{g.yanit || t.detayYanitYok}</Alan>
                        {g.aiYorum && (
                          <Alan
                            baslik={`${t.detayYorum}${
                              g.puan != null ? ` · ${g.puan}/10` : ""
                            }`}
                          >
                            {g.aiYorum}
                          </Alan>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                          {g.zorluk ? (
                            <span>
                              {t.detayZorluk}: {ZOR[g.zorluk as 1 | 2 | 3] ?? g.zorluk}
                            </span>
                          ) : null}
                          {g.ozellik && (
                            <span>
                              {t.detayOzellik}: {g.ozellik}
                            </span>
                          )}
                          <span>{zaman(g.tarih)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Alan({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{baslik}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
        {children}
      </p>
    </div>
  );
}
