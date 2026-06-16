"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import KodKopyala from "./KodKopyala";

const t = tr.admin.katilimcilar;

const SAYI = [
  "", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz", "On",
  "On Bir", "On İki", "On Üç", "On Dört", "On Beş", "On Altı", "On Yedi",
  "On Sekiz", "On Dokuz", "Yirmi",
];
const takimAdi = (i: number) => `Grup ${SAYI[i] ?? String(i)}`;
const BOS_KISI = { ad: "", takim: "", sehir: "", telefon: "", eposta: "" };

type Kisi = {
  id: string;
  full_name: string;
  team: string | null;
  city: string | null;
  phone: string | null;
  login_code: string;
};

// Tek sayfa yönetimi: liste EN ÜSTTE ve açık; diğer her şey katlanır (kapalı) bölüm.
export default function KatilimciYonetim({ kisiler }: { kisiler: Kisi[] }) {
  const router = useRouter();

  // ortak
  const giris =
    "h-10 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

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

  async function takimUygula(updates: { id: string; team: string | null }[], ok: string) {
    if (updates.length === 0) return;
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
      setTakimMesaj(ok);
      setSecili(new Set());
      router.refresh();
    } catch {
      setTakimHata(t.hataSunucu);
    } finally {
      setTakimMesgul(false);
    }
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
            <ul className="mt-4 space-y-2.5 sm:hidden">
              {kisiler.map((k) => (
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
        {takimMesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{takimMesaj}</p>}
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
    </div>
  );
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
