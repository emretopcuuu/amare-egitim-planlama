"use client";

import { Fragment, useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { kampGunu } from "@/lib/kampProgrami";
import type { GorevSatir } from "../ayna-direktoru/SonGorevler";

const t = tr.admin.aynaDirektor;
const gt = tr.gorevler;

const ZOR: Record<1 | 2 | 3, string> = {
  1: "⚡ Isınma",
  2: "⚡⚡ Denge",
  3: "⚡⚡⚡ Meydan Okuma",
};

const turEtiket = (k: string) => (gt.turler as Record<string, string>)[k] ?? k;
const durumEtiket = (s: string) => (gt.durumlar as Record<string, string>)[s] ?? s;

function istanbulTarih(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
}
function saatYazi(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
function tarihKisa(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

// Sıralanabilir anahtarlar — başlığa tıklayınca yön (asc/desc) döner.
type SiraAnahtar = "saat" | "isim" | "puan" | "durum" | "tur";

export default function GorevAkisiTablo({
  gorevler,
  baslangic,
}: {
  gorevler: GorevSatir[];
  baslangic: string | null;
}) {
  const [acik, setAcik] = useState<string | null>(null);
  const [arama, setArama] = useState("");
  const [anahtar, setAnahtar] = useState<SiraAnahtar>("saat");
  const [artan, setArtan] = useState(false); // saat varsayılan: yeni→eski (desc)

  function baslikTikla(a: SiraAnahtar) {
    if (a === anahtar) {
      setArtan((x) => !x);
    } else {
      setAnahtar(a);
      // İsim alfabetik artan; geri kalanlar mantıklı varsayılan (puan/saat azalan)
      setArtan(a === "isim" || a === "durum" || a === "tur");
    }
  }

  const gunNo = (iso: string) => kampGunu(istanbulTarih(iso), baslangic ?? undefined);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    const dizi = q
      ? gorevler.filter((g) => g.kisi.toLocaleLowerCase("tr").includes(q))
      : gorevler.slice();
    const yon = artan ? 1 : -1;
    dizi.sort((a, b) => {
      let c = 0;
      switch (anahtar) {
        case "saat":
          c = new Date(a.tarih).getTime() - new Date(b.tarih).getTime();
          break;
        case "isim":
          c = a.kisi.localeCompare(b.kisi, "tr");
          break;
        case "puan":
          c = (a.puan ?? -1) - (b.puan ?? -1);
          break;
        case "durum":
          c = a.durum.localeCompare(b.durum, "tr");
          break;
        case "tur":
          c = a.tur.localeCompare(b.tur, "tr");
          break;
      }
      // Eşitlikte ikincil olarak saate göre yeni→eski sabit dizilim
      if (c === 0) c = new Date(a.tarih).getTime() - new Date(b.tarih).getTime();
      return c * yon;
    });
    return dizi;
  }, [gorevler, arama, anahtar, artan]);

  const ok = (a: SiraAnahtar) => (anahtar === a ? (artan ? " ▲" : " ▼") : "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gold">📜 Tüm Görevler</h1>
          <p className="mt-1 text-sm text-slate-400">
            Toplam <b className="text-slate-200">{gorevler.length}</b> görev
            {arama.trim() && (
              <> · filtrede <b className="text-slate-200">{filtreli.length}</b></>
            )}
          </p>
        </div>
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="İsimle ara…"
          className="h-10 w-56 rounded-xl border border-royal/30 bg-midnight-soft px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-gold/50 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="cizgili w-full text-left text-sm">
          <thead>
            <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
              <Th onClick={() => baslikTikla("isim")}>{tr.admin.ilerleme.kisi}{ok("isim")}</Th>
              <th className="py-2 pr-3">Görev</th>
              <Th onClick={() => baslikTikla("tur")}>Tür{ok("tur")}</Th>
              <Th onClick={() => baslikTikla("saat")}>Gün · Saat{ok("saat")}</Th>
              <Th onClick={() => baslikTikla("durum")}>Durum{ok("durum")}</Th>
              <Th className="text-right" onClick={() => baslikTikla("puan")}>Puan / ⚡{ok("puan")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-royal/20">
            {filtreli.map((g) => {
              const secik = acik === g.id;
              const gn = gunNo(g.tarih);
              return (
                <Fragment key={g.id}>
                  <tr
                    onClick={() => setAcik(secik ? null : g.id)}
                    className={`cursor-pointer align-top transition-colors hover:bg-white/[0.03] ${
                      secik ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-medium text-slate-100">
                      <span className="mr-1 inline-block text-slate-500">{secik ? "▾" : "▸"}</span>
                      {g.kisi}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">
                      {/* 2 satıra kadar başlık — sağa doğru genişlesin */}
                      <span className="line-clamp-2 min-w-[12rem] max-w-[22rem]">{g.baslik}</span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">{turEtiket(g.tur)}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">
                      <span className="font-medium text-slate-300">
                        {gn ? `Gün ${gn}` : tarihKisa(g.tarih)}
                      </span>
                      <span className="text-slate-500"> · {saatYazi(g.tarih)}</span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">{durumEtiket(g.durum)}</td>
                    <td className="whitespace-nowrap py-2.5 text-right font-mono text-gold-light">
                      {g.durum === "scored" ? `${g.puan ?? "—"} / +${g.kivilcim}` : "—"}
                    </td>
                  </tr>
                  {secik && (
                    <tr className="bg-black/20">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-3">
                          <Alan baslik={t.detayMesaj}>{g.govde}</Alan>
                          <Alan baslik={t.detayYanit}>{g.yanit || t.detayYanitYok}</Alan>
                          {g.aiYorum && (
                            <Alan baslik={`${t.detayYorum}${g.puan != null ? ` · ${g.puan}/10` : ""}`}>
                              {g.aiYorum}
                            </Alan>
                          )}
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                            {g.zorluk ? (
                              <span>{t.detayZorluk}: {ZOR[g.zorluk as 1 | 2 | 3] ?? g.zorluk}</span>
                            ) : null}
                            {g.ozellik && <span>{t.detayOzellik}: {g.ozellik}</span>}
                            <span>
                              {gn ? `Gün ${gn} · ` : ""}
                              {tarihKisa(g.tarih)} {saatYazi(g.tarih)}
                            </span>
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
        {filtreli.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">Eşleşen görev yok.</p>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none py-2 pr-3 transition-colors hover:text-gold-light ${className}`}
    >
      {children}
    </th>
  );
}

function Alan({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{baslik}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{children}</p>
    </div>
  );
}
