"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import { useEsc } from "@/lib/useEsc";

const t = tr.admin.ux.palet;
const n = tr.admin.nav;

// #1 + #4 Komut paleti: ⌘K / Ctrl+K (veya nav butonu) ile her admin sayfasından
// açılır. Yaz → sayfaya atla, kontrole git ya da kişiyi koduyla bul. Canlı kamp
// anında en büyük hız kazancı: 17 alt sayfa + onlarca eylem tek arama kutusunda.
type Hedef = { tip: "sayfa" | "kontrol"; etiket: string; href: string };

// Funnel sırasında sayfalar — komut paleti de yolculuğu yansıtır.
const SAYFALAR: Hedef[] = [
  { tip: "sayfa", etiket: n.panel ?? "Panel", href: "/admin" },
  // 1 · Hazırlık
  { tip: "sayfa", etiket: n.kurulum, href: "/admin/kurulum" },
  { tip: "sayfa", etiket: n.katilimcilar, href: "/admin/katilimcilar" },
  { tip: "sayfa", etiket: n.eslestirme, href: "/admin/eslestirme" },
  { tip: "sayfa", etiket: n.qr, href: "/admin/qr" },
  { tip: "sayfa", etiket: n.kiosk, href: "/admin/kiosk" },
  { tip: "sayfa", etiket: n.program, href: "/admin/program" },
  { tip: "sayfa", etiket: n.icerik, href: "/admin/icerik" },
  { tip: "sayfa", etiket: n.gorevTuru, href: "/admin/gorev-turleri" },
  { tip: "sayfa", etiket: n.test, href: "/admin/test" },
  // 2 · Katılım
  { tip: "sayfa", etiket: n.farkindalik, href: "/admin/farkindalik" },
  { tip: "sayfa", etiket: n.aynaEsi, href: "/admin/ayna-esi" },
  // 3 · Kamp Canlı
  { tip: "sayfa", etiket: n.komuta, href: "/admin/ayna-direktoru" },
  { tip: "sayfa", etiket: n.komutan, href: "/admin/komutan" },
  { tip: "sayfa", etiket: n.sahne, href: "/admin/sahne-kumanda" },
  { tip: "sayfa", etiket: n.duyuru, href: "/admin/duyuru" },
  { tip: "sayfa", etiket: n.moderasyon, href: "/admin/moderasyon" },
  { tip: "sayfa", etiket: n.canliAyna, href: "/admin/canli-ayna" },
  { tip: "sayfa", etiket: n.analiz, href: "/admin/analiz" },
  { tip: "sayfa", etiket: n.takim, href: "/admin/takim" },
  { tip: "sayfa", etiket: n.grupOdev, href: "/admin/grup-odev" },
  { tip: "sayfa", etiket: n.sunum, href: "/admin/sunum" },
  // 4 · Final
  { tip: "sayfa", etiket: n.sozler, href: "/admin/sozler" },
  { tip: "sayfa", etiket: n.elmas, href: "/admin/elmas" },
];

// #11 Funnel kontrol komutları — aşama-aksiyonları doğrudan ⌘K'dan.
const KONTROLLER: Hedef[] = [
  { tip: "kontrol", etiket: "🎯 Pusula penceresi / Oda QR", href: "/admin#fazsifir" },
  { tip: "kontrol", etiket: "🔓 Toplu kampı aç", href: "/admin#fazsifir" },
  { tip: "kontrol", etiket: "🌊 Dalga kontrolü", href: "/admin#dalga" },
  { tip: "kontrol", etiket: "📊 İlerleme / toplu eylem", href: "/admin#ilerleme" },
  { tip: "kontrol", etiket: "👁 Boşluk Anı penceresi", href: "/admin#fazbir" },
  { tip: "kontrol", etiket: "✨ Ayna Anı (raporları aç)", href: "/admin#ayna-ani" },
  { tip: "kontrol", etiket: "🔒 Mühür açılışı", href: "/admin#muhur" },
  { tip: "kontrol", etiket: "📦 90 gün daveti", href: "/admin#davet" },
];

type Kisi = { ad: string; takim: string | null; kod: string };

function esles(metin: string, q: string): boolean {
  return metin.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR"));
}

export default function KomutPaleti() {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [kisiler, setKisiler] = useState<Kisi[]>([]);
  const [secili, setSecili] = useState(0);
  const girisRef = useRef<HTMLInputElement>(null);

  const kapat = useCallback(() => {
    setAcik(false);
    setSorgu("");
    setKisiler([]);
    setSecili(0);
  }, []);

  useEsc(acik, kapat);

  // ⌘K / Ctrl+K global kısayolu
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAcik((a) => !a);
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // Açılınca girişe odaklan
  useEffect(() => {
    if (acik) girisRef.current?.focus();
  }, [acik]);

  // Kişi araması (debounce) — /api/admin/kod-bul'u yeniden kullanır
  useEffect(() => {
    const q = sorgu.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKisiler([]);
      return;
    }
    const zaman = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/kod-bul?ad=${encodeURIComponent(q)}`);
        const veri = await res.json().catch(() => null);
        setKisiler(veri?.sonuclar ?? []);
      } catch {
        setKisiler([]);
      }
    }, 300);
    return () => clearTimeout(zaman);
  }, [sorgu]);

  const sayfaSonuc = useMemo(
    () => (sorgu.trim() ? SAYFALAR.filter((s) => esles(s.etiket, sorgu.trim())) : SAYFALAR),
    [sorgu]
  );
  const kontrolSonuc = useMemo(
    () => (sorgu.trim() ? KONTROLLER.filter((s) => esles(s.etiket, sorgu.trim())) : KONTROLLER),
    [sorgu]
  );

  // Düz liste (klavye gezinmesi için) — sıra: sayfalar, kontroller, kişiler
  const duzListe = useMemo(
    () => [
      ...sayfaSonuc.map((h) => ({ tur: "hedef" as const, hedef: h })),
      ...kontrolSonuc.map((h) => ({ tur: "hedef" as const, hedef: h })),
      ...kisiler.map((kisi) => ({ tur: "kisi" as const, kisi })),
    ],
    [sayfaSonuc, kontrolSonuc, kisiler]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecili((s) => Math.min(s, Math.max(0, duzListe.length - 1)));
  }, [duzListe.length]);

  function git(h: Hedef) {
    kapat();
    router.push(h.href);
  }

  async function kisiSec(kisi: Kisi) {
    try {
      await navigator.clipboard.writeText(kisi.kod);
      tost(t.kopyalandi, "basari");
    } catch {
      tost(kisi.kod, "bilgi");
    }
  }

  function ogeSec(i: number) {
    const oge = duzListe[i];
    if (!oge) return;
    if (oge.tur === "hedef") git(oge.hedef);
    else void kisiSec(oge.kisi);
  }

  function klavye(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSecili((s) => Math.min(s + 1, duzListe.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSecili((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      ogeSec(secili);
    }
  }

  let idx = -1;

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-royal/40 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-midnight-card hover:text-slate-200"
        title={t.ac}
      >
        <span aria-hidden>🔍</span>
        <span className="inline">{t.ac}</span>
        <kbd className="inline rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-medium">
          {t.ipucu}
        </kbd>
      </button>

      {acik &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[80] flex items-start justify-center bg-midnight/80 p-4 pt-[12vh] backdrop-blur-sm"
            onClick={kapat}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-royal/40 bg-midnight-card shadow-2xl"
            >
              <input
                ref={girisRef}
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                onKeyDown={klavye}
                placeholder={t.yer}
                className="w-full border-b border-royal/30 bg-transparent px-5 py-4 text-base text-slate-100 outline-none placeholder:text-slate-500"
              />
              <div className="max-h-[55vh] overflow-y-auto p-2">
                {duzListe.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">{t.bos}</p>
                ) : (
                  <>
                    {sayfaSonuc.length > 0 && <Grup baslik={t.sayfalar} />}
                    {sayfaSonuc.map((h) => {
                      idx++;
                      return (
                        <Satir
                          key={h.href}
                          ikon="📄"
                          etiket={h.etiket}
                          secili={idx === secili}
                          onClick={() => git(h)}
                        />
                      );
                    })}
                    {kontrolSonuc.length > 0 && <Grup baslik={t.kontroller} />}
                    {kontrolSonuc.map((h) => {
                      idx++;
                      return (
                        <Satir
                          key={h.href}
                          ikon="🎛"
                          etiket={h.etiket}
                          secili={idx === secili}
                          onClick={() => git(h)}
                        />
                      );
                    })}
                    {kisiler.length > 0 && <Grup baslik={t.kisiler} />}
                    {kisiler.map((kisi) => {
                      idx++;
                      return (
                        <Satir
                          key={kisi.kod}
                          ikon="👤"
                          etiket={kisi.ad}
                          alt={kisi.takim ?? undefined}
                          sag={kisi.kod}
                          secili={idx === secili}
                          onClick={() => void kisiSec(kisi)}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Grup({ baslik }: { baslik: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
      {baslik}
    </p>
  );
}

function Satir({
  ikon,
  etiket,
  alt,
  sag,
  secili,
  onClick,
}: {
  ikon: string;
  etiket: string;
  alt?: string;
  sag?: string;
  secili: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        secili ? "bg-royal/40" : "hover:bg-royal/20"
      }`}
    >
      <span aria-hidden>{ikon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-100">{etiket}</span>
        {alt && <span className="block truncate text-xs text-slate-400">{alt}</span>}
      </span>
      {sag && (
        <span className="shrink-0 rounded-md bg-gold/15 px-2 py-1 font-mono text-sm font-bold tracking-widest text-gold-light">
          {sag}
        </span>
      )}
    </button>
  );
}
