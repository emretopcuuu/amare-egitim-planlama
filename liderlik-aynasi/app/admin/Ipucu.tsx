"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";

// #10 Admin yardım katmanı: her kontrolün/bölümün yanında küçük "?" → ne işe
// yarar, ne zaman/hangi aşamada kullanılır, nelere dikkat edilir. Yerine bakan
// bir görevli bile soru sormadan işi yürütebilsin.
//
// İçerik tek bir string ya da "ETİKET: içerik" biçiminde paragraf dizisi olur
// (ör. "NE: ...", "NE ZAMAN: ...", "DİKKAT: ..."). Popover bu etiketleri
// otomatik tanır ve İKİ ANA BAŞLIK + DİKKAT altında madde madde toplar:
//   • Ne işe yarar?            (NE / NEDEN / NE OLUR / İÇİNDE / DOKUN …)
//   • Ne zaman & nasıl?        (NE ZAMAN / ADIM ADIM / NASIL / KURAL …)
//   • Dikkat                   (DİKKAT)
// Etiketsiz paragraflar başlıksız, düz metin olarak en üstte kalır (geriye
// dönük uyumlu). YENİ ÖZELLİK EKLENDİĞİNDE: açıklamayı tr.admin.yardim içinde
// aynı "ETİKET: …" biçimiyle yaz; gruplamayı bu component halleder.

// Etiket → grup eşlemesi. Anahtarlar BÜYÜK harf, ":" hariç.
const NE_ISE = new Set([
  "NE",
  "NEDEN",
  "İÇİNDE",
  "ETKİSİ",
  "DOKUN",
  "İZLE",
  "ROL",
  "İKİ ANAHTAR",
  "NE YAPARSIN",
  "AÇINCA NE OLUR",
  "BASINCA NE OLUR",
  "KAPATINCA NE OLUR",
  "RENK = ACİLİYET",
  "RENK",
  "ORTADA",
  "EN ÜSTTE",
  "EN ALTTA",
  "OTOMATİK SESSİZLİK",
  "SÜRPRİZ DUYURULAR",
  "UYANDIR/DURDUR",
  "TOPLU HATIRLAT",
]);
const NE_ZAMAN = new Set([
  "NE ZAMAN",
  "ADIM ADIM",
  "NASIL",
  "NASIL KULLANILIR",
  "ÖN KOŞUL",
  "KURAL",
  "GÜVENLİK",
]);

type Grupli = {
  serbest: string[]; // etiketsiz paragraflar (eski format)
  neIse: string[];
  neZaman: string[];
  dikkat: string[];
};

// "ETİKET: içerik" paragraflarını gruplara ayır. Etiket yoksa serbest metne düşer.
function grupla(paragraflar: string[]): Grupli {
  const sonuc: Grupli = { serbest: [], neIse: [], neZaman: [], dikkat: [] };
  for (const p of paragraflar) {
    const eslesme = /^([A-ZİĞÜŞÇÖ][A-ZİĞÜŞÇÖ0-9 /=]*?):\s*([\s\S]+)$/.exec(p.trim());
    if (!eslesme) {
      sonuc.serbest.push(p);
      continue;
    }
    const etiket = eslesme[1].trim();
    const icerik = eslesme[2].trim();
    if (etiket === "DİKKAT") sonuc.dikkat.push(icerik);
    else if (NE_ZAMAN.has(etiket)) sonuc.neZaman.push(icerik);
    else if (NE_ISE.has(etiket)) sonuc.neIse.push(icerik);
    else sonuc.serbest.push(p); // tanınmayan etiket → olduğu gibi göster
  }
  return sonuc;
}

function Bolum({
  ikon,
  baslik,
  maddeler,
  renk,
}: {
  ikon: string;
  baslik: string;
  maddeler: string[];
  renk: string;
}) {
  if (maddeler.length === 0) return null;
  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${renk}`}>
        <span aria-hidden>{ikon}</span>
        {baslik}
      </p>
      <ul className="space-y-1.5">
        {maddeler.map((m, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-200">
            <span aria-hidden className="mt-[0.15rem] text-slate-500">
              •
            </span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Ipucu({
  metin,
  baslik,
}: {
  metin: string | readonly string[];
  baslik?: string;
}) {
  const [acik, setAcik] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [konum, setKonum] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxH: number;
  } | null>(null);

  function degis() {
    if (acik) {
      setAcik(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const genislik = 320; // 20rem
      const left = Math.max(8, Math.min(r.left, window.innerWidth - genislik - 8));
      // Dikey sınır: altta yer yoksa (ekran dibindeki butonlar) üstte aç —
      // taşmasın. Yüksekliği uygun boşluğa göre sınırla (içeride kaydırılır).
      const altBosluk = window.innerHeight - r.bottom;
      const ustBosluk = r.top;
      const ustte = altBosluk < 260 && ustBosluk > altBosluk;
      setKonum(
        ustte
          ? { left, bottom: window.innerHeight - r.top + 6, maxH: ustBosluk - 16 }
          : { left, top: r.bottom + 6, maxH: altBosluk - 16 }
      );
    }
    setAcik(true);
  }

  // Kaydırma / yeniden boyutlandırmada konum kaymasın diye kapat.
  useEffect(() => {
    if (!acik) return;
    const kapat = () => setAcik(false);
    window.addEventListener("resize", kapat);
    window.addEventListener("scroll", kapat, true);
    return () => {
      window.removeEventListener("resize", kapat);
      window.removeEventListener("scroll", kapat, true);
    };
  }, [acik]);

  const paragraflar = Array.isArray(metin) ? (metin as string[]) : [metin as string];
  const grup = grupla(paragraflar);
  const yardim = tr.admin.ipucu;

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          // Tıklanır kapsayıcı (Link, <summary>) içinde de güvenli: parent'ı tetikleme.
          e.preventDefault();
          e.stopPropagation();
          degis();
        }}
        aria-label={yardim.ac}
        aria-expanded={acik}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10"
      >
        ?
      </button>
      {acik &&
        konum &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setAcik(false)}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <div
              role="tooltip"
              style={{
                position: "fixed",
                left: konum.left,
                top: konum.top,
                bottom: konum.bottom,
                maxHeight: konum.maxH,
              }}
              className="z-[61] w-80 max-w-[calc(100vw-1rem)] space-y-3 overflow-y-auto rounded-xl border border-royal-light/40 bg-midnight-card p-4 shadow-2xl"
            >
              {baslik && <p className="text-sm font-bold text-gold-light">{baslik}</p>}
              {/* Etiketsiz (eski) paragraflar düz metin olarak en üstte */}
              {grup.serbest.length > 0 && (
                <div className="space-y-2">
                  {grup.serbest.map((p, i) => (
                    <p key={i} className="text-sm font-normal leading-relaxed text-slate-200">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              <Bolum ikon="🎯" baslik={yardim.neIse} maddeler={grup.neIse} renk="text-emerald-300" />
              <Bolum ikon="🕐" baslik={yardim.neZaman} maddeler={grup.neZaman} renk="text-sky-300" />
              <Bolum ikon="⚠️" baslik={yardim.dikkat} maddeler={grup.dikkat} renk="text-amber-300" />
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
