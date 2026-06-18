"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import KodKopyala from "./KodKopyala";

const t = tr.admin.katilimcilar;

const takimAdi = (i: number) => `Grup ${i}`;
const BOS_KISI = { ad: "", takim: "", sehir: "", telefon: "", eposta: "" };
const SAYFA_BOYU = 10;

type Kisi = {
  id: string;
  full_name: string;
  team: string | null;
  city: string | null;
  phone: string | null;
  login_code: string;
};

// Tek sayfa yönetimi: liste EN ÜSTTE ve açık; diğer her şey katlanır (kapalı) bölüm.
export default function KatilimciYonetim({
  kisiler,
  kayanIdler,
}: {
  kisiler: Kisi[];
  kayanIdler?: string[];
}) {
  const router = useRouter();

  // UX #2 (2.tur): sessizleşen (dürtülmüş) adaylar — listede kırmızı risk işareti.
  const kayanSet = useMemo(() => new Set(kayanIdler ?? []), [kayanIdler]);

  // ortak
  const giris =
    "h-10 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

  // ---- satır düzenleme ----
  const [duzenle, setDuzenle] = useState<Kisi | null>(null);
  const [duzenleDeger, setDuzenleDeger] = useState({ ad: "", takim: "", sehir: "", telefon: "", login_code: "" });
  const [duzenleYukleniyor, setDuzenleYukleniyor] = useState(false);
  const [duzenleMesaj, setDuzenleMesaj] = useState<string | null>(null);
  const [duzenleHataMsg, setDuzenleHataMsg] = useState<string | null>(null);
  const [silOnayMod, setSilOnayMod] = useState(false);

  function duzenleAc(k: Kisi) {
    setDuzenle(k);
    setDuzenleDeger({ ad: k.full_name, takim: k.team ?? "", sehir: k.city ?? "", telefon: k.phone ?? "", login_code: k.login_code });
    setDuzenleMesaj(null);
    setDuzenleHataMsg(null);
    setSilOnayMod(false);
  }
  function duzenleKapat() {
    setDuzenle(null);
    setSilOnayMod(false);
  }

  // Modal açıkken arka plan kaydırmasını kilitle + Esc ile kapat.
  useEffect(() => {
    if (!duzenle) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") duzenleKapat();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = onceki;
      window.removeEventListener("keydown", onKey);
    };
  }, [duzenle]);

  async function kaydetDuzenle() {
    if (!duzenle || duzenleYukleniyor) return;
    if (!duzenleDeger.ad.trim()) return setDuzenleHataMsg(t.hataAdEksik);
    setDuzenleYukleniyor(true);
    setDuzenleMesaj(null);
    setDuzenleHataMsg(null);
    try {
      const res = await fetch(`/api/admin/katilimcilar/${duzenle.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(duzenleDeger),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setDuzenleHataMsg(v?.hata ?? t.duzenleHata);
      setDuzenleMesaj(t.duzenleBasarili(duzenleDeger.ad.trim()));
      router.refresh();
      setTimeout(() => duzenleKapat(), 1000);
    } catch {
      setDuzenleHataMsg(t.duzenleHata);
    } finally {
      setDuzenleYukleniyor(false);
    }
  }

  async function kisiyiSil() {
    if (!duzenle || duzenleYukleniyor) return;
    setDuzenleYukleniyor(true);
    setDuzenleMesaj(null);
    setDuzenleHataMsg(null);
    try {
      const res = await fetch(`/api/admin/katilimcilar/${duzenle.id}`, { method: "DELETE" });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setDuzenleHataMsg(v?.hata ?? t.duzenleHata);
      router.refresh();
      duzenleKapat();
    } catch {
      setDuzenleHataMsg(t.duzenleHata);
    } finally {
      setDuzenleYukleniyor(false);
    }
  }

  // ---- sayfalama ----
  const [sayfa, setSayfa] = useState(0);

  // ---- seçim ----
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const tumSecili = kisiler.length > 0 && secili.size === kisiler.length;
  const tekSec = (id: string) =>
    setSecili((s) => {
      const y = new Set(s);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });
  const tumunuSec = () =>
    setSecili(tumSecili ? new Set() : new Set(kisiler.map((k) => k.id)));
  const hedefIdler = useMemo(
    () => (secili.size > 0 ? [...secili] : kisiler.map((k) => k.id)),
    [secili, kisiler]
  );

  // ---- kişi ekle ----
  const [kisi, setKisi] = useState({ ...BOS_KISI });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [ekleMesaj, setEkleMesaj] = useState<string | null>(null);
  const [ekleHata, setEkleHata] = useState<string | null>(null);
  async function ekle() {
    if (!kisi.ad.trim() || ekleniyor) return;
    setEkleniyor(true);
    setEkleMesaj(null);
    setEkleHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kisi),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setEkleHata(v?.hata ?? t.hataSunucu);
      setEkleMesaj(t.ekleBasarili(v.ad, v.kod));
      setKisi({ ...BOS_KISI });
      router.refresh();
    } catch {
      setEkleHata(t.hataSunucu);
    } finally {
      setEkleniyor(false);
    }
  }

  // ---- takım işlemleri (dağıt / ata / temizle / yeniden adlandır) ----
  const [kisiBasi, setKisiBasi] = useState(4);
  const [atamaTakim, setAtamaTakim] = useState("");
  const [takimMesgul, setTakimMesgul] = useState(false);
  const [takimMesaj, setTakimMesaj] = useState<string | null>(null);
  const [takimHata, setTakimHata] = useState<string | null>(null);
  // UX #3 (2.tur): toplu takım işlemleri geri alınamaz → her işlemden önce eski
  // takım değerlerini sakla, sonra "geri al" sun (yanlışlıkla dağıtmaya emniyet).
  const [geriAl, setGeriAl] = useState<{ id: string; team: string | null }[] | null>(null);

  const takimSayisi = Math.max(1, Math.ceil(hedefIdler.length / Math.max(2, kisiBasi || 2)));
  const onizleme = useMemo(() => {
    const n = hedefIdler.length;
    if (n === 0) return "";
    const adlar = Array.from({ length: Math.min(takimSayisi, 4) }, (_, i) => takimAdi(i + 1));
    return `${t.dagitOnizleme(n, takimSayisi)} · ${adlar.join(", ")}${takimSayisi > 4 ? "…" : ""}`;
  }, [hedefIdler.length, takimSayisi]);

  const mevcutTakimlar = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of kisiler) if (k.team) m.set(k.team, (m.get(k.team) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
  }, [kisiler]);

  async function takimUygula(
    updates: { id: string; team: string | null }[],
    ok: string,
    geriAlMi = false
  ) {
    if (updates.length === 0) return;
    // İşlemden önce mevcut takım değerlerini anlık olarak yakala — geri al için.
    const onceki = updates.map((u) => {
      const k = kisiler.find((x) => x.id === u.id);
      return { id: u.id, team: k?.team ?? null };
    });
    setTakimMesgul(true);
    setTakimMesaj(null);
    setTakimHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setTakimHata(v?.hata ?? t.hataSunucu);
      setTakimMesaj(geriAlMi ? t.geriAlindi : ok);
      setGeriAl(onceki); // bir önceki duruma dönmek için (geri al = tekrar uygula → redo)
      setSecili(new Set());
      router.refresh();
    } catch {
      setTakimHata(t.hataSunucu);
    } finally {
      setTakimMesgul(false);
    }
  }
  function geriAlUygula() {
    if (!geriAl || takimMesgul) return;
    void takimUygula(geriAl, t.geriAlindi, true);
  }
  function otomatikDagit() {
    const idler = [...hedefIdler];
    if (idler.length === 0) return setTakimHata(t.kimseYok);
    for (let i = idler.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idler[i], idler[j]] = [idler[j], idler[i]];
    }
    void takimUygula(
      idler.map((id, i) => ({ id, team: takimAdi((i % takimSayisi) + 1) })),
      t.dagitBasarili(idler.length)
    );
  }
  function seciliereAta() {
    const ad = atamaTakim.trim();
    if (!ad || secili.size === 0) return setTakimHata(t.kimseYok);
    void takimUygula([...secili].map((id) => ({ id, team: ad })), t.dagitBasarili(secili.size));
  }
  function temizle() {
    if (hedefIdler.length === 0) return setTakimHata(t.kimseYok);
    void takimUygula(hedefIdler.map((id) => ({ id, team: null })), t.dagitBasarili(hedefIdler.length));
  }
  function yenidenAdlandir(eski: string, yeni: string) {
    const ad = yeni.trim();
    if (!ad || ad === eski) return;
    const u = kisiler.filter((k) => k.team === eski).map((k) => ({ id: k.id, team: ad }));
    void takimUygula(u, t.dagitBasarili(u.length));
  }

  // ---- dosyadan içe aktar ----
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dosyaMesaj, setDosyaMesaj] = useState<string | null>(null);
  const [dosyaHata, setDosyaHata] = useState<string | null>(null);
  async function dosyayiCsvYap(dosya: File): Promise<string> {
    if (/\.xlsx?$/i.test(dosya.name) && !/\.csv$/i.test(dosya.name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await dosya.arrayBuffer(), { type: "array" });
      return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    }
    return dosya.text();
  }
  async function iceAktar() {
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya || yukleniyor) return;
    setYukleniyor(true);
    setDosyaMesaj(null);
    setDosyaHata(null);
    try {
      let csv: string;
      try {
        csv = await dosyayiCsvYap(dosya);
      } catch {
        return setDosyaHata(t.excelOkunamadi);
      }
      const res = await fetch("/api/admin/katilimcilar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setDosyaHata(v?.hata ?? t.hataSunucu);
      setDosyaMesaj(t.basarili(v.eklenen));
      setDosyaAdi(null);
      if (dosyaRef.current) dosyaRef.current.value = "";
      router.refresh();
    } catch {
      setDosyaHata(t.hataSunucu);
    } finally {
      setYukleniyor(false);
    }
  }

  // ---- tehlikeli: tümünü sil ----
  const [silOnay, setSilOnay] = useState("");
  const [siliniyor, setSiliniyor] = useState(false);
  const [silMesaj, setSilMesaj] = useState<string | null>(null);
  const [silHata, setSilHata] = useState<string | null>(null);
  async function tumunuSil() {
    if (silOnay !== t.silOnayKelime || siliniyor) return;
    setSiliniyor(true);
    setSilMesaj(null);
    setSilHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", { method: "DELETE" });
      const v = await res.json().catch(() => null);
      if (!res.ok) return setSilHata(v?.hata ?? t.hataSunucu);
      setSilMesaj(t.silBasarili(v.silinen));
      setSilOnay("");
      router.refresh();
    } catch {
      setSilHata(t.hataSunucu);
    } finally {
      setSiliniyor(false);
    }
  }

  // Sayfalama: liste 160+ kişiyle çok uzuyor → 10'arlı sayfalar, ileri/geri.
  const sayfaSayisi = Math.max(1, Math.ceil(kisiler.length / SAYFA_BOYU));
  const guvenliSayfa = Math.min(sayfa, sayfaSayisi - 1);
  const baslangicIdx = guvenliSayfa * SAYFA_BOYU;
  const gosterilen = kisiler.slice(baslangicIdx, baslangicIdx + SAYFA_BOYU);

  return (
    <div className="space-y-4">
      {/* === LİSTE — en üstte, hep açık === */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gold-light">{t.toplam(kisiler.length)}</h2>
          {secili.size > 0 && (
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
              {t.seciliSayi(secili.size)}
            </span>
          )}
        </div>

        {kisiler.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t.bosListe}</p>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="cizgili w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={tumSecili}
                        onChange={tumunuSec}
                        aria-label={t.tumunuSec}
                        className="h-4 w-4 accent-gold"
                      />
                    </th>
                    <th className="py-2 pr-3">{t.tablo.ad}</th>
                    <th className="py-2 pr-3">{t.tablo.takim}</th>
                    <th className="py-2 pr-3">{t.tablo.sehir}</th>
                    <th className="py-2 pr-3">{t.tablo.telefon}</th>
                    <th className="py-2 pr-3">{t.tablo.kod}</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal/20">
                  {gosterilen.map((k) => (
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
                      <td className="py-2 pr-3 font-medium">
                        <Link href={`/admin/kisi/${k.id}`} className="inline-flex items-center gap-1.5 text-slate-100 underline-offset-4 hover:text-gold-light hover:underline">
                          {kayanSet.has(k.id) && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]" aria-label={t.riskIsaret} title={t.riskIsaret} />
                          )}
                          {k.full_name}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{k.team ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-400">{k.city ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-400">{k.phone ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <KodKopyala kod={k.login_code} />
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => duzenleAc(k)}
                          aria-label={`${k.full_name} düzenle`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-gold-light"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-2.5 sm:hidden">
              {gosterilen.map((k) => (
                <li
                  key={k.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    secili.has(k.id)
                      ? "border-gold/40 bg-gold/[0.06]"
                      : "border-white/10 bg-white/[0.03]"
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
                    <Link href={`/admin/kisi/${k.id}`} className="flex items-center gap-1.5 truncate font-medium text-slate-100 hover:text-gold-light">
                      {kayanSet.has(k.id) && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]" aria-label={t.riskIsaret} title={t.riskIsaret} />
                      )}
                      <span className="truncate">{k.full_name}</span>
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {[k.team, k.city].filter(Boolean).join(" · ") || "—"}
                      {k.phone ? ` · ${k.phone}` : ""}
                    </p>
                  </div>
                  <KodKopyala kod={k.login_code} />
                  <button
                    onClick={() => duzenleAc(k)}
                    aria-label={`${k.full_name} düzenle`}
                    className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-gold-light"
                  >
                    ✏️
                  </button>
                </li>
              ))}
            </ul>

            {/* Sayfalama — 10'arlı, ileri/geri */}
            {sayfaSayisi > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-royal/20 pt-4">
                <button
                  onClick={() => setSayfa((s) => Math.max(0, s - 1))}
                  disabled={guvenliSayfa === 0}
                  className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-30"
                >
                  {t.sayfaGeri}
                </button>
                <span className="text-xs text-slate-400">
                  {t.sayfaBilgi(guvenliSayfa + 1, sayfaSayisi, baslangicIdx + 1, baslangicIdx + gosterilen.length, kisiler.length)}
                </span>
                <button
                  onClick={() => setSayfa((s) => Math.min(sayfaSayisi - 1, s + 1))}
                  disabled={guvenliSayfa >= sayfaSayisi - 1}
                  className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-30"
                >
                  {t.sayfaIleri}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* === Katlanır araçlar (varsayılan kapalı) === */}

      {/* Kişi Ekle */}
      <Katlanir baslik={`➕ ${t.ekleBaslik}`}>
        <p className="text-sm text-slate-400">{t.ekleAciklama}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={kisi.ad} onChange={(e) => setKisi({ ...kisi, ad: e.target.value })} onKeyDown={(e) => e.key === "Enter" && ekle()} placeholder={t.alanAd} aria-label={t.alanAd} className={`${giris} sm:col-span-2`} />
          <input value={kisi.takim} onChange={(e) => setKisi({ ...kisi, takim: e.target.value })} placeholder={t.alanTakim} aria-label={t.alanTakim} className={giris} />
          <input value={kisi.sehir} onChange={(e) => setKisi({ ...kisi, sehir: e.target.value })} placeholder={t.alanSehir} aria-label={t.alanSehir} className={giris} />
          <input value={kisi.telefon} onChange={(e) => setKisi({ ...kisi, telefon: e.target.value })} placeholder={t.alanTelefon} aria-label={t.alanTelefon} className={giris} />
          <input value={kisi.eposta} onChange={(e) => setKisi({ ...kisi, eposta: e.target.value })} placeholder={t.alanEposta} aria-label={t.alanEposta} className={giris} />
        </div>
        <button onClick={ekle} disabled={!kisi.ad.trim() || ekleniyor} className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40">
          {ekleniyor ? t.ekleniyor : t.ekle}
        </button>
        {ekleMesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{ekleMesaj}</p>}
        {ekleHata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{ekleHata}</p>}
      </Katlanir>

      {/* Takımlara Dağıt */}
      <Katlanir baslik={`🎲 ${t.takimDagitBaslik}`}>
        <p className="text-sm text-slate-400">{t.takimDagitAciklama}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            {t.kisiBasiEtiket}
            <input type="number" min={2} max={Math.max(2, kisiler.length)} value={kisiBasi} onChange={(e) => setKisiBasi(Math.max(2, Number(e.target.value) || 2))} className={`${giris} w-20 text-center`} />
          </label>
          <span className="text-xs font-medium text-gold-light/80">{onizleme}</span>
          <button onClick={otomatikDagit} disabled={takimMesgul} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40">
            {takimMesgul ? t.dagitiliyor : t.otomatikDagit}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={atamaTakim} onChange={(e) => setAtamaTakim(e.target.value)} placeholder={t.seciliereAtaYer} className={`${giris} min-w-[10rem] flex-1`} />
          <button onClick={seciliereAta} disabled={takimMesgul || secili.size === 0} className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-40">{t.seciliereAta}</button>
          <button onClick={temizle} disabled={takimMesgul} className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-midnight-soft disabled:opacity-40">{t.takimTemizle}</button>
        </div>
        {takimMesaj && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-emerald-400">{takimMesaj}</p>
            {geriAl && (
              <button
                onClick={geriAlUygula}
                disabled={takimMesgul}
                className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-40"
              >
                ↶ {t.geriAl}
              </button>
            )}
          </div>
        )}
        {takimHata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{takimHata}</p>}
      </Katlanir>

      {/* Takımları Yeniden Adlandır */}
      <Katlanir baslik={`✏️ ${t.adlandirBaslik}`}>
        <p className="text-sm text-slate-400">{t.adlandirAciklama}</p>
        {mevcutTakimlar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.takimYok}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {mevcutTakimlar.map(([ad, sayi]) => (
              <AdlandirSatir key={ad} ad={ad} sayi={sayi} mesgul={takimMesgul} onKaydet={(yeni) => yenidenAdlandir(ad, yeni)} />
            ))}
          </div>
        )}
      </Katlanir>

      {/* Dosyadan İçe Aktar */}
      <Katlanir baslik={t.importBaslik}>
        <p className="text-sm text-slate-400">{t.importAciklama}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-soft">
            {dosyaAdi ?? t.dosyaSec}
            <input ref={dosyaRef} type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => { setDosyaAdi(e.target.files?.[0]?.name ?? null); setDosyaMesaj(null); setDosyaHata(null); }} />
          </label>
          <button onClick={iceAktar} disabled={!dosyaAdi || yukleniyor} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40">
            {yukleniyor ? t.iceAktariliyor : t.iceAktar}
          </button>
        </div>
        {dosyaMesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{dosyaMesaj}</p>}
        {dosyaHata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{dosyaHata}</p>}
      </Katlanir>

      {/* Tehlikeli Bölge */}
      <Katlanir baslik={`⚠️ ${t.silBaslik}`} tehlike>
        <p className="text-sm text-slate-400">{t.silAciklama}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="text" value={silOnay} onChange={(e) => setSilOnay(e.target.value)} placeholder={t.silOnayEtiket(t.silOnayKelime)} aria-label={t.silOnayEtiket(t.silOnayKelime)} className="h-10 rounded-lg border border-red-500/40 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-red-400" />
          <button onClick={tumunuSil} disabled={silOnay !== t.silOnayKelime || siliniyor} className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40">
            {siliniyor ? t.siliniyor : t.sil}
          </button>
        </div>
        {silMesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{silMesaj}</p>}
        {silHata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{silHata}</p>}
      </Katlanir>

      {/* Düzenleme Modalı — portal ile body'ye taşınır, böylece transform'lu
          atalardan etkilenmeden her zaman ekranın ortasında açılır. */}
      <DuzenleModal acik={!!duzenle}>
        {duzenle && (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) duzenleKapat(); }}
          >
            <div className="my-auto w-full max-w-sm rounded-2xl bg-midnight-card p-6 shadow-2xl ring-1 ring-gold/30">
              <h3 className="text-lg font-semibold text-gold-light">{t.duzenleBaslik}</h3>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-400">{t.tablo.ad}</span>
                  <input
                    value={duzenleDeger.ad}
                    onChange={(e) => setDuzenleDeger({ ...duzenleDeger, ad: e.target.value })}
                    placeholder={t.alanAd}
                    className={`${giris} w-full`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-400">{t.tablo.takim}</span>
                  <input
                    value={duzenleDeger.takim}
                    onChange={(e) => setDuzenleDeger({ ...duzenleDeger, takim: e.target.value })}
                    placeholder={t.alanTakim}
                    className={`${giris} w-full`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-400">{t.tablo.sehir}</span>
                  <input
                    value={duzenleDeger.sehir}
                    onChange={(e) => setDuzenleDeger({ ...duzenleDeger, sehir: e.target.value })}
                    placeholder={t.alanSehir}
                    className={`${giris} w-full`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-400">{t.tablo.telefon}</span>
                  <input
                    value={duzenleDeger.telefon}
                    onChange={(e) => setDuzenleDeger({ ...duzenleDeger, telefon: e.target.value })}
                    placeholder={t.alanTelefon}
                    inputMode="tel"
                    className={`${giris} w-full`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-400">{t.tablo.kod}</span>
                  <input
                    value={duzenleDeger.login_code}
                    onChange={(e) => setDuzenleDeger({ ...duzenleDeger, login_code: e.target.value })}
                    placeholder={t.duzenleKodYer}
                    maxLength={6}
                    inputMode="numeric"
                    className={`${giris} w-full font-mono tracking-widest`}
                  />
                </label>
              </div>
              {duzenleMesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{duzenleMesaj}</p>}
              {duzenleHataMsg && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{duzenleHataMsg}</p>}
              <div className="mt-5 flex items-center justify-between gap-3">
                {silOnayMod ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={kisiyiSil}
                      disabled={duzenleYukleniyor}
                      className="rounded-lg bg-red-500/80 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
                    >
                      {t.duzenleSilOnay}
                    </button>
                    <button
                      onClick={() => setSilOnayMod(false)}
                      className="text-sm text-slate-400 hover:text-slate-200"
                    >
                      {t.duzenleVazgec}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSilOnayMod(true)}
                    disabled={duzenleYukleniyor}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {t.duzenleSil}
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={duzenleKapat}
                    className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-soft"
                  >
                    {t.duzenleVazgec}
                  </button>
                  <button
                    onClick={kaydetDuzenle}
                    disabled={duzenleYukleniyor}
                    className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-40"
                  >
                    {duzenleYukleniyor ? t.duzenleKaydediliyor : t.duzenleKaydet}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DuzenleModal>
    </div>
  );
}

// Portal sarmalayıcı: çocuğu document.body'ye render eder (transform'lu
// atalardan kaçar). Sunucuda/ilk render'da boş döner — hidrasyon güvenli.
function DuzenleModal({ acik, children }: { acik: boolean; children: React.ReactNode }) {
  const [yerlesti, setYerlesti] = useState(false);
  useEffect(() => setYerlesti(true), []);
  if (!yerlesti || !acik) return null;
  return createPortal(children, document.body);
}

// Native katlanır bölüm — varsayılan kapalı, başlığa basınca açılır.
function Katlanir({
  baslik,
  tehlike,
  children,
}: {
  baslik: string;
  tehlike?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className={`kart-3d group rounded-2xl bg-midnight-card/60 shadow-xl backdrop-blur ${
        tehlike ? "ring-1 ring-red-500/30" : "ring-1 ring-royal/30"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-base font-semibold text-gold-light">
        <span className={tehlike ? "text-red-300" : ""}>{baslik}</span>
        <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>▾</span>
      </summary>
      <div className="border-t border-royal/20 p-5 pt-4">{children}</div>
    </details>
  );
}

function AdlandirSatir({
  ad,
  sayi,
  mesgul,
  onKaydet,
}: {
  ad: string;
  sayi: number;
  mesgul: boolean;
  onKaydet: (yeni: string) => void;
}) {
  const [yeni, setYeni] = useState(ad);
  const degisti = yeni.trim() !== "" && yeni.trim() !== ad;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-[7rem] text-sm text-slate-300">
        {ad} <span className="text-xs text-slate-500">({t.takimKisi(sayi)})</span>
      </span>
      <input value={yeni} onChange={(e) => setYeni(e.target.value)} onKeyDown={(e) => e.key === "Enter" && degisti && onKaydet(yeni)} placeholder={t.yeniAd} className="h-9 flex-1 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none focus:border-gold" />
      <button onClick={() => onKaydet(yeni)} disabled={mesgul || !degisti} className="rounded-lg border border-royal-light/40 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-40">{t.kaydet}</button>
    </div>
  );
}
