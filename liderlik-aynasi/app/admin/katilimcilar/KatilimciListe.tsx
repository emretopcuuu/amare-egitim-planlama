"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import KodKopyala from "./KodKopyala";

const t = tr.admin.katilimcilar;

type Kisi = {
  id: string;
  full_name: string;
  team: string | null;
  city: string | null;
  phone: string | null;
  login_code: string;
};

// Toplu seçim + takımlara rastgele dağıtım. Takım kişi eklenirken değil,
// tüm liste üzerinden seçilip rastgele/dengeli atanır.
export default function KatilimciListe({ kisiler }: { kisiler: Kisi[] }) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  // Varsayılan takım adları — admin kutudan değiştirebilir
  const [takimMetni, setTakimMetni] = useState("Grup Bir, Grup İki, Grup Üç");
  const [atamaTakim, setAtamaTakim] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const tumSecili = kisiler.length > 0 && secili.size === kisiler.length;

  function tekSec(id: string) {
    setSecili((s) => {
      const y = new Set(s);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });
  }
  function tumunuSecDegistir() {
    setSecili(tumSecili ? new Set() : new Set(kisiler.map((k) => k.id)));
  }

  // Seçim varsa onlar, yoksa herkes
  const hedefIdler = useMemo(
    () => (secili.size > 0 ? [...secili] : kisiler.map((k) => k.id)),
    [secili, kisiler]
  );

  async function uygula(updates: { id: string; team: string | null }[], basariMesaj: string) {
    setMesgul(true);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setMesaj(basariMesaj);
      setSecili(new Set());
      router.refresh();
    } catch {
      setHata(t.hataSunucu);
    } finally {
      setMesgul(false);
    }
  }

  function rastgeleDagit() {
    const takimlar = takimMetni
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (takimlar.length === 0) return setHata(t.takimGerekli);
    if (hedefIdler.length === 0) return setHata(t.kimseYok);

    // Fisher-Yates karıştır, sonra sırayla (round-robin) dengeli dağıt
    const idler = [...hedefIdler];
    for (let i = idler.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idler[i], idler[j]] = [idler[j], idler[i]];
    }
    const updates = idler.map((id, i) => ({ id, team: takimlar[i % takimlar.length] }));
    void uygula(updates, t.dagitBasarili(updates.length));
  }

  function seciliereAta() {
    const takim = atamaTakim.trim();
    if (!takim) return setHata(t.takimGerekli);
    if (secili.size === 0) return setHata(t.kimseYok);
    const updates = [...secili].map((id) => ({ id, team: takim }));
    void uygula(updates, t.dagitBasarili(updates.length));
  }

  function temizle() {
    if (hedefIdler.length === 0) return setHata(t.kimseYok);
    const updates = hedefIdler.map((id) => ({ id, team: null }));
    void uygula(updates, t.dagitBasarili(updates.length));
  }

  const girisStil =
    "h-10 flex-1 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gold-light">{t.toplam(kisiler.length)}</h2>
        {secili.size > 0 && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
            {t.seciliSayi(secili.size)}
          </span>
        )}
      </div>

      {/* Takımlara dağıtım aracı */}
      {kisiler.length > 0 && (
        <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
          <p className="text-sm font-semibold text-gold-light">🎲 {t.takimDagitBaslik}</p>
          <p className="mt-1 text-xs text-slate-400">{t.takimDagitAciklama}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={takimMetni}
              onChange={(e) => setTakimMetni(e.target.value)}
              placeholder={t.takimAdlariYer}
              className={`${girisStil} min-w-[16rem]`}
            />
            <button
              onClick={rastgeleDagit}
              disabled={mesgul}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40"
            >
              {mesgul ? t.dagitiliyor : t.rastgeleDagit}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={atamaTakim}
              onChange={(e) => setAtamaTakim(e.target.value)}
              placeholder={t.seciliereAtaYer}
              className={`${girisStil} min-w-[10rem]`}
            />
            <button
              onClick={seciliereAta}
              disabled={mesgul || secili.size === 0}
              className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-40"
            >
              {t.seciliereAta}
            </button>
            <button
              onClick={temizle}
              disabled={mesgul}
              className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-midnight-soft disabled:opacity-40"
            >
              {t.takimTemizle}
            </button>
          </div>

          {mesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>}
          {hata && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-400">
              {hata}
            </p>
          )}
        </div>
      )}

      {/* Masaüstü tablo */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="cizgili w-full text-left text-sm">
          <thead>
            <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={tumSecili}
                  onChange={tumunuSecDegistir}
                  aria-label={t.tumunuSec}
                  className="h-4 w-4 accent-gold"
                />
              </th>
              <th className="py-2 pr-3">{t.tablo.ad}</th>
              <th className="py-2 pr-3">{t.tablo.takim}</th>
              <th className="py-2 pr-3">{t.tablo.sehir}</th>
              <th className="py-2 pr-3">{t.tablo.telefon}</th>
              <th className="py-2">{t.tablo.kod}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-royal/20">
            {kisiler.map((k) => (
              <tr key={k.id} className={secili.has(k.id) ? "bg-gold/[0.04]" : ""}>
                <td className="py-2 pr-3">
                  <input
                    type="checkbox"
                    checked={secili.has(k.id)}
                    onChange={() => tekSec(k.id)}
                    aria-label={k.full_name}
                    className="h-4 w-4 accent-gold"
                  />
                </td>
                <td className="py-2 pr-3 font-medium text-slate-100">{k.full_name}</td>
                <td className="py-2 pr-3 text-slate-400">{k.team ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-400">{k.city ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-400">{k.phone ?? "—"}</td>
                <td className="py-2">
                  <KodKopyala kod={k.login_code} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil liste */}
      <ul className="mt-4 space-y-2.5 sm:hidden">
        {kisiler.map((k) => (
          <li
            key={k.id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              secili.has(k.id) ? "border-gold/40 bg-gold/[0.06]" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <input
              type="checkbox"
              checked={secili.has(k.id)}
              onChange={() => tekSec(k.id)}
              aria-label={k.full_name}
              className="h-4 w-4 shrink-0 accent-gold"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">{k.full_name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {[k.team, k.city].filter(Boolean).join(" · ") || "—"}
                {k.phone ? ` · ${k.phone}` : ""}
              </p>
            </div>
            <KodKopyala kod={k.login_code} />
          </li>
        ))}
      </ul>
    </section>
  );
}
