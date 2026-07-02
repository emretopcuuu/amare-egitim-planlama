"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.altNav;

// İnce çizgi ikon seti: emoji yerine (cihazdan cihaza değişen, kaba duran ve
// premium koyu temayla çelişen) currentColor ile boyanan, zarif SVG'ler.
type IkonAd = "ana" | "degerlendir" | "koc" | "gorevler" | "duvar" | "program";
function Ikon({ ad, className = "" }: { ad: IkonAd; className?: string }) {
  const ortak = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (ad) {
    case "ana":
      return (
        <svg {...ortak}>
          <path d="M3 10.75 12 3l9 7.75" />
          <path d="M5.25 9.5V20a1 1 0 0 0 1 1h11.5a1 1 0 0 0 1-1V9.5" />
          <path d="M9.75 21v-6.25h4.5V21" />
        </svg>
      );
    case "degerlendir":
      return (
        <svg {...ortak}>
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.8l-5.2 2.72.99-5.8-4.21-4.1 5.82-.85z" />
        </svg>
      );
    case "gorevler":
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "duvar":
      return (
        <svg {...ortak}>
          <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.5" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M4 16.5 9 12l3 3 3.5-3.5L20.5 16" />
        </svg>
      );
    case "koc":
      return (
        <svg {...ortak}>
          <path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
          <path d="M8.5 10h7M8.5 12.75h4" />
        </svg>
      );
    case "program":
      return (
        <svg {...ortak}>
          <rect x="3.5" y="4.75" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 9h17M8 3v3.5M16 3v3.5" />
          <path d="M7 13h4M7 16.5h7" />
        </svg>
      );
  }
}

// En sık kullanılan 4 hedef için alt çubuk (başparmak erişimi). İkincil her
// şey üstteki ☰ menüde kalır. Katılımcı dışı/tam ekran rotalarda gizlenir.
// Görev + Program HER ZAMAN birincil: ikisi de alt çubukta, her ekrandan tek
// dokunuş. İkincil olan "Duvar" üst ☰ menüde kalır. "Değerlendir" dalga
// kapalıyken Koç'a döner (aşağıda, bağlam-duyarlı).
const SEKMELER: { href: string; ikon: IkonAd; etiket: string }[] = [
  { href: "/", ikon: "ana", etiket: t.ana },
  { href: "/gorevler", ikon: "gorevler", etiket: t.gorevler },
  { href: "/program", ikon: "program", etiket: t.program },
  { href: "/degerlendir", ikon: "degerlendir", etiket: t.degerlendir },
];

// Bu önekler katılımcı deneyimi değil (admin/büyük ekran/tam ekran) — çubuk yok.
// /pusula tam ekran FAZ 0 akışıdır (Nedenler + "kampta görüşürüz" beklemesi);
// kamp açılmadan görev/değerlendirme sekmeleri görünmesin.
const GIZLI = ["/giris", "/admin", "/ekran", "/sahne", "/yansiman", "/pusula", "/degerler", "/on-farkindalik", "/hedef", "/sozum", "/takip", "/sahitlik", "/mini360", "/ayna-esi", "/kocu", "/grup/sohbet"];

type Kivilcim = {
  toplam: number;
  unvan: string;
  sonraki: string | null;
  kalan: number;
  yuzde: number;
  dalgaAcik?: boolean;
  gorevBekleyen?: number;
};

export default function AltNav() {
  const pathname = usePathname();
  // Tam ekran odak rotalar + tek kişi puanlama sihirbazı (/degerlendir/<id>):
  // çubuk gizli, dolaşma yok. Liste (/degerlendir) çubuğu korur.
  const gizli =
    GIZLI.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    /^\/degerlendir\/[^/]+$/.test(pathname);
  const [kiv, setKiv] = useState<Kivilcim | null>(null);
  // Instagram tarzı: aşağı kaydırınca kapsül küçülür (etiketler gizlenir),
  // yukarı kaydırınca büyür. Scroll iç kapsayıcılarda da olabildiği için
  // capture:true ile yakalanır (scroll event bubble etmez).
  const [kompakt, setKompakt] = useState(false);

  // Çubuk görünürken içerik altına nefes payı bırak (sabit çubuk içeriği örtmesin)
  useEffect(() => {
    document.body.classList.toggle("alt-nav-acik", !gizli);
    return () => document.body.classList.remove("alt-nav-acik");
  }, [gizli]);

  // #2 Kalıcı Kıvılcım şeridi: her ekranda ilerleme görünür kalsın.
  useEffect(() => {
    if (gizli) return;
    let iptal = false;
    fetch("/api/kivilcim")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!iptal && d) setKiv(d);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [gizli, pathname]);

  // Kaydırma yönüne göre kompakt aç/kapa (Instagram gibi). capture:true → iç
  // overflow-y-auto kapsayıcıların scroll'unu da yakalar.
  useEffect(() => {
    if (gizli) return;
    let sonY = -1;
    let bekleyen = false;
    // Scroll her karede onlarca kez tetiklenir; setKompakt'ı rAF'a sıkıştır →
    // ana iş parçacığı dokunuşa daha hızlı yanıt verir (akış pürüzsüzleşir).
    function isle(y: number) {
      if (sonY < 0) {
        sonY = y;
        return;
      }
      if (y > sonY + 8 && y > 56) setKompakt(true); // aşağı → küçül
      else if (y < sonY - 8) setKompakt(false); // yukarı → büyü
      sonY = y;
    }
    function onScroll(e: Event) {
      const hedef = e.target as HTMLElement | Document;
      const y =
        hedef === document || hedef === (document.scrollingElement as unknown)
          ? window.scrollY
          : (hedef as HTMLElement).scrollTop ?? window.scrollY;
      if (bekleyen) return;
      bekleyen = true;
      requestAnimationFrame(() => {
        bekleyen = false;
        isle(y);
      });
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
  }, [gizli]);

  if (gizli) return null;

  function aktifMi(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  // B1: bağlam-duyarlı çubuk. Dalga kapalıyken "Değerlendir" sekmesi ölü kalır;
  // onun yerine her zaman değerli olan "Ayna Koçu"nu göster. Dalga açıkken
  // (yükleme dahil değilse) değerlendirme öne döner.
  const sekmeler = SEKMELER.map((s) =>
    s.href === "/degerlendir" && kiv && kiv.dalgaAcik === false
      ? { href: "/kocu", ikon: "koc" as IkonAd, etiket: t.koc }
      : s
  );

  return (
    <div
      className="alt-nav fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-3 print:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.55rem)" }}
    >
      {/* Bekleyen görev dürtüsü — kapsülün üstünde yüzen küçük pill */}
      {(kiv?.gorevBekleyen ?? 0) > 0 && !pathname.startsWith("/gorevler") && (
        <Link
          href="/gorevler"
          onClick={() => titret(8)}
          className="flex items-center gap-2 rounded-full border border-gold/30 bg-midnight/85 px-4 py-1.5 text-xs font-semibold text-gold-light shadow-lg backdrop-blur-xl transition-transform active:scale-95"
        >
          <span aria-hidden>🤖</span>
          <span>
            {(kiv?.gorevBekleyen ?? 0) > 1
              ? `${kiv?.gorevBekleyen} bekleyen görev`
              : "Bekleyen görevin var"}
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {/* YÜZEN KAPSÜL — buzlu cam, yuvarlak ada; kaydırınca küçülür/büyür */}
      <nav
        className={`alt-nav flex items-center rounded-[2rem] border border-white/12 bg-midnight/70 shadow-[0_12px_44px_-10px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-300 ${
          kompakt ? "w-auto gap-0.5 px-1.5 py-1" : "w-full max-w-md gap-1 px-2 py-1"
        }`}
      >
        {sekmeler.map((s) => {
          const aktif = aktifMi(s.href);
          // Görev her zaman öne çıksın: bekleyen görev varsa sekmede nokta rozeti.
          const gorevVar = s.href === "/gorevler" && (kiv?.gorevBekleyen ?? 0) > 0;
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => titret(10)}
              aria-label={gorevVar ? `${s.etiket} · bekleyen görev var` : s.etiket}
              aria-current={aktif ? "page" : undefined}
              className={`group relative flex select-none flex-col items-center justify-center rounded-[1.4rem] transition-all duration-300 active:scale-90 ${
                kompakt ? "w-12 py-1.5" : "flex-1 py-1"
              } ${aktif ? "text-gold-light" : "text-slate-300"}`}
            >
              {/* İkon kabı — aktifte gold dolgu + halka + ışıma; dokununca zemin belirir */}
              <span
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  kompakt ? "h-8 w-8" : "h-10 w-10"
                } ${
                  aktif
                    ? "bg-gold/18 ring-1 ring-gold/45 shadow-[0_0_22px_-5px_rgba(212,175,55,0.6)]"
                    : "ring-1 ring-transparent group-active:bg-white/12"
                }`}
              >
                <Ikon
                  ad={s.ikon}
                  className={`transition-all duration-300 ${
                    kompakt ? "h-[1.35rem] w-[1.35rem]" : "h-[1.65rem] w-[1.65rem]"
                  } ${aktif ? "scale-105" : ""}`}
                />
                {gorevVar && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-midnight" />
                  </span>
                )}
              </span>
              {/* Etiket — kapsül büyükken görünür; kaydırınca (kompakt) gizlenir */}
              <span
                className={`overflow-hidden text-[0.68rem] font-semibold leading-none transition-all duration-300 ${
                  kompakt ? "mt-0 max-h-0 opacity-0" : "mt-0.5 max-h-4 opacity-95"
                }`}
              >
                {s.etiket}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
