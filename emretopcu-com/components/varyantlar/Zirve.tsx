"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ArrowUp,
  ArrowUpRight,
  CaretDown,
  CheckCircle,
  Copy,
  InstagramLogo,
  List,
  Moon,
  PlayCircle,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSimpleX,
  Sun,
  WhatsappLogo,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useTema } from "@/lib/tema";
import { sozKartiPaylas, sozStoryPaylas, projKartiPaylas } from "@/lib/sozKart";
import { soruCevaplar, enIyiCevap } from "@/lib/soruCevap";
import { olcum } from "@/lib/olcum";
import { POPULER } from "@/lib/populer";
import {
  EPOSTA,
  INSTAGRAM_URL,
  LIDER_PROFIL_URL,
  TRIBUTE_VIDEO_ID,
  WHATSAPP_URL,
  YOUTUBE_KANAL_URL,
  whatsappUrl,
  kitapHaberUrl,
  bultenMailto,
  DIL_YOL,
  DIL_ETIKET,
  type Dil,
  type Icerik,
} from "@/lib/icerik";
import { DilProvider, useC, useDil } from "./dil";

// Sayfadaki tüm bölüm bağlantı hedefleri (scroll-spy için, sırayla).
const BOLUM_IDLERI = [
  "manifesto",
  "yolculuk",
  "videolar",
  "konusmalar",
  "iletisim",
] as const;

/* Sayfada hangi bölümde olduğumuzu döndürür (nav scroll-spy). */
function useAktifBolum() {
  const [aktif, setAktif] = useState<string | null>(null);
  useEffect(() => {
    const gozlemci = new IntersectionObserver(
      (girisler) => {
        const gorunur = girisler
          .filter((g) => g.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (gorunur[0]) setAktif(gorunur[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const id of BOLUM_IDLERI) {
      const el = document.getElementById(id);
      if (el) gozlemci.observe(el);
    }
    return () => gozlemci.disconnect();
  }, []);
  return aktif;
}

// Varyant D "Zirve": scroll koreografili ödül-sitesi seviyesi tasarım.
// Abanoz zemin + tek altın vurgu. Yapışkan kart destesi, yatay kaydırma,
// kelime kelime beliren manifesto, canlı sayaçlar, manyetik butonlar.
// Tüm hareket prefers-reduced-motion'a saygılıdır.

const GECIS = [0.16, 1, 0.3, 1] as const;

/* Açılış mührü: yalnız ilk ziyarette 1.7 saniyelik marka anı. */
function Acilis() {
  const azalt = useReducedMotion();
  const [goster, setGoster] = useState(false);
  useEffect(() => {
    if (azalt) return;
    try {
      if (localStorage.getItem("emretopcu_acilis")) return;
      localStorage.setItem("emretopcu_acilis", "1");
    } catch {
      return;
    }
    setGoster(true);
    const t = setTimeout(() => setGoster(false), 1700);
    return () => clearTimeout(t);
  }, [azalt]);
  return (
    <AnimatePresence>
      {goster && (
        <motion.div
          exit={{ y: "-100%" }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-abanoz"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.35em" }}
            animate={{ opacity: 1, letterSpacing: "0.5em" }}
            transition={{ duration: 0.9, ease: GECIS }}
            className="pl-[0.5em] font-lux text-2xl text-fildisi md:text-4xl"
          >
            EMRE TOPÇU
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.45, duration: 0.8, ease: GECIS }}
            className="mt-6 h-[2px] w-44 origin-center bg-altin"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* El yazısı imza — soldan sağa "yazılarak" belirir.
   (Şimdilik stilize; gerçek imza SVG'siyle birebir değiştirilebilir.) */
function Imza({ className = "" }: { className?: string }) {
  const azalt = useReducedMotion();
  return (
    <motion.span
      initial={azalt ? false : { clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
      className={`inline-block font-imza text-altin ${className}`}
      aria-label="Emre Topçu"
    >
      Emre Topçu
    </motion.span>
  );
}

/* Doğrulama rozeti — resmî One Team Global lider profiline giden güven işareti. */
function DogrulamaRozeti({ className = "" }: { className?: string }) {
  const c = useC();
  return (
    <a
      href={LIDER_PROFIL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border border-altin/30 bg-altin/5 px-3 py-1 text-xs font-medium text-altin transition-colors hover:bg-altin/10 ${className}`}
    >
      <CheckCircle size={14} weight="fill" />
      {c.ui.dogrulamaKisa}
    </a>
  );
}

/* Masaüstünde imleci izleyen yumuşak altın ışık. */
function ImlecIsigi() {
  const azalt = useReducedMotion();
  const [aktif, setAktif] = useState(false);
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 90, damping: 22 });
  const sy = useSpring(y, { stiffness: 90, damping: 22 });
  useEffect(() => {
    if (azalt) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    setAktif(true);
    const f = (e: PointerEvent) => {
      x.set(e.clientX - 210);
      y.set(e.clientY - 210);
    };
    window.addEventListener("pointermove", f, { passive: true });
    return () => window.removeEventListener("pointermove", f);
  }, [azalt, x, y]);
  if (!aktif) return null;
  return (
    <motion.div
      aria-hidden
      style={{
        x: sx,
        y: sy,
        background:
          "radial-gradient(circle, rgba(154,122,44,0.09), transparent 62%)",
      }}
      className="pointer-events-none fixed top-0 left-0 z-[4] h-[420px] w-[420px] rounded-full"
    />
  );
}

/* Maskeli başlık: alttan süzülerek açılır (ödül-sitesi reveal'ı). */
function H2Perde({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const azalt = useReducedMotion();
  return (
    <div className="overflow-hidden pb-1">
      <motion.h2
        initial={azalt ? false : { y: "112%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.85, ease: GECIS }}
        className={className}
      >
        {children}
      </motion.h2>
    </div>
  );
}

/* 250.000 sayacı: 5'ten başlar, katlamanın ritmiyle üstel hızlanarak sayar. */
function DramatikSayac() {
  const dil = useDil();
  const azalt = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [basladi, setBasladi] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([g]) => {
        if (g.isIntersecting) {
          setBasladi(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!basladi) return;
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      Math.round(v).toLocaleString(dil === "tr" ? "tr-TR" : "en-US");
    if (azalt) {
      el.textContent = fmt(250000);
      return;
    }
    // Gerçek katlama serisi: 5 → 19 → 88 → 243 → 2.008 → 250.000
    const adimlar: Array<[number, number]> = [
      [19, 0.45],
      [88, 0.45],
      [243, 0.35],
      [2008, 0.4],
      [250000, 1.1],
    ];
    let iptal = false;
    (async () => {
      let onceki = 5;
      el.textContent = fmt(5);
      for (const [hedef, sure] of adimlar) {
        if (iptal) return;
        await new Promise<void>((res) => {
          animate(onceki, hedef, {
            duration: sure,
            ease: "easeIn",
            onUpdate: (v) => {
              el.textContent = fmt(v);
            },
            onComplete: () => res(),
          });
        });
        onceki = hedef;
      }
    })();
    return () => {
      iptal = true;
    };
  }, [basladi, dil, azalt]);
  return <span ref={ref}>5</span>;
}

/* Katlama simülasyonu: dokun, ağın patlayışını yaşa (1→2→4→8→16). */
const SIM_HALKA = [0, 36, 64, 94, 126];
const SIM_BOY = [6, 5, 4.2, 3.4, 2.8];
function simDugumleri() {
  const arr: { x: number; y: number; seviye: number; ebeveyn: number | null }[] =
    [{ x: 0, y: 0, seviye: 0, ebeveyn: null }];
  for (let L = 1; L < 5; L++) {
    const n = 2 ** L;
    for (let k = 0; k < n; k++) {
      const a =
        ((k + 0.5) / n) * Math.PI * 2 - Math.PI / 2 + (L % 2 ? 0.14 : -0.1);
      arr.push({
        x: Math.cos(a) * SIM_HALKA[L],
        y: Math.sin(a) * SIM_HALKA[L],
        seviye: L,
        ebeveyn: 2 ** (L - 1) - 1 + Math.floor(k / 2),
      });
    }
  }
  return arr;
}

function KatlamaSim() {
  const c = useC();
  const dil = useDil();
  const [seviye, setSeviye] = useState(-1);
  const dugumler = useMemo(simDugumleri, []);
  const kisi = seviye < 0 ? 0 : 2 ** seviye;
  return (
    <div className="mx-auto mt-14 max-w-sm text-center">
      <svg viewBox="-140 -140 280 280" className="mx-auto w-full max-w-[320px]">
        {dugumler.map(
          (d, i) =>
            d.ebeveyn !== null &&
            d.seviye <= seviye && (
              <motion.line
                key={`c-${i}`}
                x1={dugumler[d.ebeveyn].x}
                y1={dugumler[d.ebeveyn].y}
                x2={d.x}
                y2={d.y}
                stroke="var(--color-altin)"
                strokeOpacity={0.35}
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: (i % 16) * 0.03 }}
              />
            ),
        )}
        {dugumler.map(
          (d, i) =>
            d.seviye <= seviye && (
              <motion.circle
                key={`n-${i}`}
                cx={d.x}
                cy={d.y}
                fill="var(--color-altin)"
                initial={{ r: 0 }}
                animate={{ r: SIM_BOY[d.seviye] }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 16,
                  delay: (i % 16) * 0.03,
                }}
              />
            ),
        )}
        {seviye < 0 && (
          <circle
            r={6}
            fill="none"
            stroke="var(--color-altin)"
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        )}
      </svg>
      <div className="mt-4 flex min-h-16 flex-col items-center gap-3">
        {seviye < 4 ? (
          <>
            {seviye >= 0 && (
              <p className="text-sm text-duman">
                {dil === "tr" ? `Ağ: ${kisi} kişi` : `Network: ${kisi}`}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSeviye((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-altin/50 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi active:scale-[0.97]"
            >
              {seviye < 0 ? c.ui.simBasla : c.ui.simKatla}
            </button>
          </>
        ) : (
          <>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: GECIS }}
              className="max-w-[30ch] font-lux text-lg text-fildisi"
            >
              “{c.ui.simSon}”
            </motion.p>
            <button
              type="button"
              onClick={() => setSeviye(-1)}
              className="text-sm text-duman underline-offset-2 hover:underline"
            >
              {c.ui.simSifirla}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// 3D sahne yalnızca tarayıcıda yüklenir (WebGL, SSR'de çalışmaz).
const Ag3D = dynamic(() => import("./Ag3D"), { ssr: false });

// Arka plandaki tek sahnenin "ağ → dünya" morf değerini bölümler arası paylaşır.
const MorfContext = createContext<MotionValue<number> | null>(null);

/* "4 kıta, 38 ülke" — arka plandaki ağ küresi burada dünyaya DÖNÜŞÜR.
   Bölüm yüksek tutulur; scroll ilerlemesi morf değerine (0→1→0) yazılır,
   böylece küre girişte dünyaya akar, çıkışta ağa geri döner. */
function DunyaBolum() {
  const c = useC();
  const morf = useContext(MorfContext);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Üçgen zarf: 0 (giriş) → 1 (orta) → 0 (çıkış).
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (morf) morf.set(1 - Math.abs(p - 0.5) * 2);
  });
  return (
    <section ref={ref} className="relative h-[170vh]">
      <div className="sticky top-0 flex h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <H2Perde className="mx-auto max-w-[16ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.dunya.baslik}
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mx-auto mt-5 max-w-[52ch] text-duman"
        >
          {c.dunya.altMetin}
        </motion.p>
        <span className="mt-6 text-xs font-medium tracking-[0.15em] text-altin uppercase">
          {c.dunya.merkez}
        </span>
      </div>
    </section>
  );
}

/* Dil değiştirici: TR / EN / RU / AZ (statik route'lara link). */
const DILLER: Dil[] = ["tr", "en", "de", "es", "ru", "az"];
function DilSecici() {
  const dil = useDil();
  return (
    <div className="flex items-center gap-1 text-sm">
      {DILLER.map((d, i) => (
        <span key={d} className="flex items-center gap-1">
          {i > 0 && <span className="text-black/20">/</span>}
          <a
            href={DIL_YOL[d]}
            aria-current={dil === d ? "true" : undefined}
            className={
              dil === d
                ? "font-semibold text-altin"
                : "text-duman hover:text-fildisi"
            }
          >
            {DIL_ETIKET[d]}
          </a>
        </span>
      ))}
    </div>
  );
}

/* Gündüz/gece geçişi — tek dokunuşla mürekkep laciverti sinema salonu. */
function TemaSecici() {
  const dil = useDil();
  const [tema, cevir] = useTema();
  const gece = tema === "gece";
  return (
    <button
      type="button"
      onClick={cevir}
      aria-label={
        gece
          ? dil === "tr"
            ? "Gündüz moduna geç"
            : "Switch to light mode"
          : dil === "tr"
            ? "Gece moduna geç"
            : "Switch to dark mode"
      }
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-duman transition-colors hover:bg-altin/10 hover:text-altin"
    >
      {gece ? <Sun size={18} weight="fill" /> : <Moon size={18} weight="fill" />}
    </button>
  );
}

/* Manyetik buton: imlece doğru hafifçe kayar, ayrılınca yayla geri döner. */
function Manyetik({ children }: { children: ReactNode }) {
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });

  return (
    <motion.div
      ref={ref}
      style={azalt ? undefined : { x: sx, y: sy }}
      onPointerMove={(e) => {
        if (azalt || !ref.current) return;
        const k = ref.current.getBoundingClientRect();
        x.set((e.clientX - (k.left + k.width / 2)) * 0.18);
        y.set((e.clientY - (k.top + k.height / 2)) * 0.18);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-flex"
    >
      {children}
    </motion.div>
  );
}

/* 3D eğilme kartı: imleç üzerindeyken kart perspektifle eğilir. */
function TiltKart({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 16 });
  const sry = useSpring(ry, { stiffness: 180, damping: 16 });

  return (
    <motion.div
      ref={ref}
      style={
        azalt
          ? undefined
          : { rotateX: srx, rotateY: sry, transformPerspective: 900 }
      }
      onPointerMove={(e) => {
        if (azalt || !ref.current) return;
        const k = ref.current.getBoundingClientRect();
        const px = (e.clientX - k.left) / k.width - 0.5;
        const py = (e.clientY - k.top) / k.height - 0.5;
        rx.set(py * -8);
        ry.set(px * 10);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  const c = useC();
  const aktif = useAktifBolum();
  const [menuAcik, setMenuAcik] = useState(false);

  // Menü açıkken arka planın kaymasını engelle.
  useEffect(() => {
    document.body.style.overflow = menuAcik ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAcik]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-abanoz/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="text-base font-semibold tracking-tight">
            Emre Topçu
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {c.nav.map((link) => {
              const secili = aktif === link.href.replace("#", "");
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={secili ? "true" : undefined}
                  className={`text-sm transition-colors ${
                    secili
                      ? "font-medium text-altin"
                      : "text-duman hover:text-fildisi"
                  }`}
                >
                  {link.etiket}
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <TemaSecici />
            <DilSecici />
            <a
              href={whatsappUrl("menü")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-altin/40 px-4 py-1.5 text-sm text-altin transition-colors hover:bg-altin hover:text-fildisi active:scale-[0.98] sm:inline-flex"
            >
              <WhatsappLogo size={15} weight="fill" />
              {c.ui.calis}
            </a>
            {/* Mobil menü düğmesi */}
            <button
              type="button"
              onClick={() => setMenuAcik(true)}
              aria-label={c.ui.menuAc}
              className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-fildisi transition-colors hover:bg-black/5 md:hidden"
            >
              <List size={22} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Tam ekran mobil menü — header'ın DIŞINDA (header'ın backdrop-filter'ı
          fixed çocuk için containing block oluşturduğundan burada tutulur). */}
      <AnimatePresence>
        {menuAcik && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: GECIS }}
            className="fixed inset-0 z-[70] flex flex-col bg-abanoz md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <span className="text-base font-semibold tracking-tight">
                Emre Topçu
              </span>
              <div className="-mr-1 flex items-center gap-1">
                <TemaSecici />
                <button
                  type="button"
                  onClick={() => setMenuAcik(false)}
                  aria-label={c.ui.menuKapat}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fildisi transition-colors hover:bg-black/5"
                >
                  <X size={22} weight="bold" />
                </button>
              </div>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-2 px-6">
              {c.nav.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAcik(false)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 + i * 0.06, ease: GECIS }}
                  className="border-b border-black/10 py-5 text-3xl font-semibold tracking-tight text-fildisi"
                >
                  {link.etiket}
                </motion.a>
              ))}
            </nav>
            <div className="px-6 pb-10">
              <a
                href={whatsappUrl("menü")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuAcik(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-altin px-7 py-4 font-medium text-fildisi active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="fill" />
                {c.ui.calis}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* Satır satır perde açılışı yapan başlık. */
function PerdeSatir({
  children,
  gecikme = 0,
}: {
  children: ReactNode;
  gecikme?: number;
}) {
  const azalt = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span
        className="block"
        initial={azalt ? false : { y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay: gecikme, ease: GECIS }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* Kinetik başlık satırı: Outfit variable ekseninde harf harf ağırlık dalgası.
   İmleç harfe yaklaştıkça kalınlaşır; reduced-motion'da sabit kalır. */
function KinetikSatir({
  metin,
  className = "",
}: {
  metin: string;
  className?: string;
}) {
  const azalt = useReducedMotion();
  const harfler = Array.from(metin);
  if (azalt) return <span className={className}>{metin}</span>;
  return (
    <span className={className}>
      {harfler.map((h, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ fontWeight: 600 }}
          initial={{ fontWeight: 600 }}
          whileHover={{ fontWeight: 900, scaleY: 1.04 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          {h === " " ? " " : h}
        </motion.span>
      ))}
    </span>
  );
}

function Hero() {
  const c = useC();
  const azalt = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const sonuklesme = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100dvh] items-end overflow-hidden"
    >
      {/* 3D sahne üstünde okunabilirlik için alt scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-abanoz/85 to-transparent"
      />
      <motion.div
        style={azalt ? undefined : { y, opacity: sonuklesme }}
        className="relative mx-auto w-full max-w-6xl px-6 pt-24 pb-14 md:pb-20"
      >
        <motion.p
          initial={azalt ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: GECIS }}
          className="mb-6 text-sm font-medium tracking-[0.2em] text-altin uppercase"
        >
          {c.hero.isim} <span className="text-duman">— {c.hero.rol}</span>
        </motion.p>
        <h1 className="text-[16vw] leading-[0.9] font-semibold tracking-tighter uppercase md:text-[9.5rem]">
          <PerdeSatir gecikme={0.15}>
            <KinetikSatir metin={c.hero.baslikSatir1} />
          </PerdeSatir>
          <PerdeSatir gecikme={0.28}>
            <KinetikSatir metin={c.hero.baslikSatir2} className="text-altin" />
          </PerdeSatir>
        </h1>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
          <motion.p
            initial={azalt ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: GECIS }}
            className="max-w-[44ch] text-lg leading-relaxed text-fildisi/80 md:text-xl"
          >
            {c.hero.altMetin}
          </motion.p>
          <motion.div
            initial={azalt ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.68, ease: GECIS }}
            className="flex flex-col items-start gap-2"
          >
            <Manyetik>
              <a
                href={whatsappUrl("hero")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi transition-transform active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="fill" />
                {c.ui.calis}
              </a>
            </Manyetik>
            <p className="max-w-[30ch] text-sm leading-snug text-duman">
              {c.ui.whatsappNot}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Kaydırma ipucu — ilk scroll'da yumuşakça kaybolur */}
      <motion.div
        aria-hidden
        style={azalt ? undefined : { opacity: sonuklesme }}
        className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-duman"
      >
        <span className="text-[11px] font-medium tracking-[0.2em] uppercase">
          {c.ui.kaydir}
        </span>
        <motion.span
          animate={azalt ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <CaretDown size={18} weight="bold" />
        </motion.span>
      </motion.div>
    </section>
  );
}

/* 2.5D derinlik portresi: imleç/eğime göre iki katman (portre + altın halka)
   zıt yönde kayar; hafif perspektif eğim "nefes alan" derinlik verir.
   Tek fotoğrafla; reduced-motion'da sabit. */
function DerinlikPortre() {
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), {
    stiffness: 140,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), {
    stiffness: 140,
    damping: 18,
  });
  const px = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), {
    stiffness: 120,
    damping: 20,
  });
  const py = useSpring(useTransform(my, [-0.5, 0.5], [-14, 14]), {
    stiffness: 120,
    damping: 20,
  });

  const hareket = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const cikis = () => {
    mx.set(0);
    my.set(0);
  };

  if (azalt) {
    return (
      <Image
        src="/portre-duotone.webp"
        alt="Emre Topçu"
        width={640}
        height={800}
        className="w-full max-w-[280px] rounded-3xl border border-altin/25 shadow-[0_18px_50px_rgba(26,26,29,0.12)]"
      />
    );
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={hareket}
      onPointerLeave={cikis}
      style={{ perspective: 900 }}
      className="w-full max-w-[280px]"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative"
      >
        <motion.span
          aria-hidden
          style={{ x: px, y: py, translateZ: -40 }}
          className="absolute -inset-3 rounded-[2rem] border border-altin/25"
        />
        <Image
          src="/portre-duotone.webp"
          alt="Emre Topçu"
          width={640}
          height={800}
          className="relative w-full rounded-3xl border border-altin/25 shadow-[0_18px_50px_rgba(26,26,29,0.14)]"
        />
      </motion.div>
    </motion.div>
  );
}

/* Scroll ilerledikçe kelime kelime beliren manifesto. */
function Kelime({
  kelime,
  ilerleme,
  bas,
  son,
}: {
  kelime: string;
  ilerleme: MotionValue<number>;
  bas: number;
  son: number;
}) {
  const opacity = useTransform(ilerleme, [bas, son], [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {kelime}{" "}
    </motion.span>
  );
}

function Manifesto() {
  const c = useC();
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.45"],
  });
  const kelimeler = c.hakkimda.paragraflar[0].split(" ");

  const ilkKelime = kelimeler[0] ?? "";
  const ilkHarf = ilkKelime.charAt(0);
  const ilkKalan = ilkKelime.slice(1);

  return (
    <section id="manifesto" className="scroll-mt-24 py-28 md:py-40">
      <div
        className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[280px_1fr] md:gap-16"
        ref={ref}
      >
        {/* Editoryal duotone portre + isim + imza */}
        <motion.div
          initial={azalt ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: GECIS }}
          className="md:sticky md:top-28 md:self-start"
        >
          <DerinlikPortre />
          <p className="mt-5 text-xl font-semibold tracking-tight">
            Emre Topçu
          </p>
          <p className="text-sm text-duman">{c.hakkimda.unvan}</p>
          <DogrulamaRozeti className="mt-3" />
          <Imza className="mt-3 text-3xl" />
        </motion.div>

        <div>
          <p
            aria-label={c.hakkimda.paragraflar[0]}
            className="text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-[2.1rem] md:leading-snug"
          >
            <span aria-hidden>
              <span className="harf-buyuk">{ilkHarf}</span>
              {azalt ? (
                ilkKalan + " " + kelimeler.slice(1).join(" ")
              ) : (
                <>
                  <Kelime
                    kelime={ilkKalan}
                    ilerleme={scrollYProgress}
                    bas={0}
                    son={1 / kelimeler.length}
                  />
                  {kelimeler.slice(1).map((kelime, i) => (
                    <Kelime
                      key={i}
                      kelime={kelime}
                      ilerleme={scrollYProgress}
                      bas={(i + 1) / kelimeler.length}
                      son={(i + 2) / kelimeler.length}
                    />
                  ))}
                </>
              )}
            </span>
          </p>
          <motion.p
            initial={azalt ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: GECIS }}
            className="mt-10 max-w-[56ch] text-lg leading-relaxed text-duman"
          >
            {c.hakkimda.paragraflar[1]}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

/* Sektörün söylenmeyen gerçeği — teori perdesi, kitaba (2017) tarihli imza. */
function Teori() {
  const c = useC();
  return (
    <section id="teori" className="scroll-mt-24 py-24 md:py-40">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-6 text-sm font-medium tracking-[0.2em] text-altin uppercase"
        >
          {c.teori.etiket}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.1, ease: GECIS }}
          className="font-lux text-3xl leading-tight font-semibold tracking-tight text-fildisi md:text-6xl"
        >
          {c.teori.ana}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.2, ease: GECIS }}
          className="mx-auto mt-8 max-w-[54ch] text-lg leading-relaxed text-duman"
        >
          {c.teori.alt}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.35, ease: GECIS }}
          className="mt-6 text-sm font-medium tracking-widest text-altin/70 uppercase"
        >
          — {c.teori.imza}
        </motion.p>

        {/* Katlamayı dokunarak yaşa */}
        <KatlamaSim />
      </div>
    </section>
  );
}

/* Üç Çeşit Lider — kendini teşhis ettiren kart destesi. */
// Üç lider tipinin kaderini kelimesiz anlatan imza eğrileri.
const IMZA_EGRI_YOLLARI = [
  "M2 10 C 20 4, 30 6, 38 16 C 44 24, 50 34, 58 36 L 96 36",
  "M2 30 C 14 16, 20 30, 30 18 C 40 6, 46 26, 56 16 C 64 8, 70 26, 80 20 C 86 16, 90 26, 96 24",
  "M2 36 C 24 34, 40 26, 54 16 C 68 6, 80 4, 96 2",
];

function ImzaEgri({ tip }: { tip: number }) {
  const azalt = useReducedMotion();
  return (
    <svg viewBox="0 0 98 40" className="h-10 w-full" aria-hidden fill="none">
      <motion.path
        d={IMZA_EGRI_YOLLARI[tip]}
        stroke={tip === 2 ? "var(--color-altin)" : "currentColor"}
        strokeOpacity={tip === 2 ? 1 : 0.35}
        strokeWidth={tip === 2 ? 2.5 : 2}
        strokeLinecap="round"
        strokeDasharray={tip === 0 ? "4 3" : undefined}
        initial={azalt ? undefined : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.1, ease: GECIS, delay: 0.2 }}
      />
    </svg>
  );
}

function LiderTipleri() {
  const c = useC();
  return (
    <section id="lider-tipleri" className="scroll-mt-24 bg-abanoz py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <H2Perde className="max-w-[20ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.liderTipleri.baslik}
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 max-w-[52ch] text-duman"
        >
          {c.liderTipleri.altMetin}
        </motion.p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {c.liderTipleri.tipler.map((t, i) => (
            <TiltKart key={t.baslik}>
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: GECIS }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-8 ${
                  i === 2
                    ? "border-altin/40 bg-gradient-to-br from-altin/15 to-abanoz-2"
                    : "border-black/10 bg-abanoz-2"
                }`}
              >
                <p className="text-4xl font-semibold tracking-tighter text-altin/30">
                  0{i + 1}
                </p>
                <h3 className="relative mt-5 text-xl font-semibold tracking-tight text-fildisi md:text-2xl">
                  {t.baslik}
                </h3>
                <p className="relative mt-3 leading-relaxed text-duman">
                  {t.aciklama}
                </p>
                <div className="relative mt-6 text-duman/60">
                  <ImzaEgri tip={i} />
                </div>
              </motion.div>
            </TiltKart>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Sektör Gerçekleri — kimsenin söylemediği gerçekler, kart destesi. */
function GercekKarti({
  k,
  i,
}: {
  k: { baslik: string; aciklama: string };
  i: number;
}) {
  return (
    <TiltKart>
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: GECIS }}
        className="flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-black/10 bg-abanoz-2 p-7 transition-[transform,border-color] hover:border-altin/40 active:scale-[0.99]"
      >
        <h3 className="text-xl font-semibold tracking-tight text-fildisi md:text-2xl">
          {k.baslik}
        </h3>
        <p className="mt-3 leading-relaxed text-duman">{k.aciklama}</p>
      </motion.article>
    </TiltKart>
  );
}

function Gercekler() {
  const c = useC();
  const [acik, setAcik] = useState(false);
  return (
    <section id="gercekler" className="scroll-mt-24 bg-abanoz py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <H2Perde className="max-w-[24ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.gercekler.baslik}
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 max-w-[52ch] text-duman"
        >
          {c.gercekler.altMetin}
        </motion.p>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {c.gercekler.kartlar.map((k, i) => (
            <GercekKarti key={k.baslik} k={k} i={i} />
          ))}
        </div>
        {acik && (
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {c.gercekler.kartlarEk.map((k, i) => (
              <GercekKarti key={k.baslik} k={k} i={i} />
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setAcik((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-altin/40 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
          >
            {acik ? c.gercekler.az : c.gercekler.daha}
          </button>
        </div>
      </div>
    </section>
  );
}

/* SSS — akordeon, en çok sorulan sorular. */
/* "Emre'ye sor" — sitedeki gerçek metinlerden bulanık aramalı Q&A. */
function EmreyeSor() {
  const c = useC();
  const havuz = useMemo(() => soruCevaplar(c), [c]);
  const [sorgu, setSorgu] = useState("");
  const [cevap, setCevap] = useState<{ bulundu: boolean; metin: string } | null>(
    null,
  );
  const sor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sorgu.trim()) return;
    const sc = enIyiCevap(sorgu, havuz);
    olcum("emreye-sor");
    setCevap(sc ? { bulundu: true, metin: sc.cevap } : { bulundu: false, metin: c.ui.sorBos });
  };
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-[2rem] border border-black/5 bg-abanoz/80 p-8 shadow-[0_20px_60px_rgba(26,26,29,0.06)] backdrop-blur-md md:p-12">
        <H2Perde className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.ui.sorBaslik}
        </H2Perde>
        <p className="mt-4 max-w-[52ch] text-duman">{c.ui.sorAlt}</p>
        <form onSubmit={sor} className="mt-8 flex gap-3">
          <input
            value={sorgu}
            onChange={(e) => setSorgu(e.target.value)}
            placeholder={c.ui.sorYaz}
            className="w-full rounded-full border border-black/15 bg-abanoz-2 px-5 py-3.5 text-fildisi outline-none focus:border-altin/60"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-altin px-6 py-3.5 font-medium text-fildisi active:scale-[0.98]"
          >
            {c.ui.sorBaslik}
          </button>
        </form>
        <AnimatePresence mode="wait">
          {cevap && (
            <motion.div
              key={cevap.metin}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: GECIS }}
              className="mt-8 rounded-2xl border border-altin/20 bg-abanoz-2/60 p-6"
            >
              <p className="text-lg leading-relaxed text-fildisi/90">
                {cevap.metin}
              </p>
              {!cevap.bulundu && (
                <a
                  href={whatsappUrl("emreye-sor")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 font-medium text-altin underline-offset-2 hover:underline"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  {c.ui.calis}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Sss() {
  const c = useC();
  const [acik, setAcik] = useState<number | null>(0);
  return (
    <section id="sss" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-6">
        <H2Perde className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.sss.baslik}
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 text-duman"
        >
          {c.sss.altMetin}
        </motion.p>
        <div className="mt-10">
          {c.sss.sorular.map((s, i) => {
            const secili = acik === i;
            return (
              <motion.div
                key={s.soru}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: GECIS }}
                className="border-t border-black/10 py-6 last:border-b"
              >
                <button
                  type="button"
                  onClick={() => setAcik(secili ? null : i)}
                  aria-expanded={secili}
                  className="flex w-full items-center justify-between gap-6 text-left"
                >
                  <span className="text-lg font-semibold tracking-tight text-fildisi md:text-xl">
                    {s.soru}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-2xl text-altin transition-transform duration-300 ${
                      secili ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: secili ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="mt-4 max-w-[64ch] leading-relaxed text-duman">
                      {s.cevap}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Kapanış — davet mektubu: mühür + söz + imza. */
function KapanisCumlesi() {
  const c = useC();
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 28, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: -0.6 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: GECIS }}
          className="rounded-3xl border border-altin/25 bg-abanoz-2 p-10 text-center shadow-[0_24px_70px_rgba(26,26,29,0.10)] md:p-14"
        >
          <div
            aria-hidden
            className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-altin/60 font-lux text-base text-altin"
          >
            ET
          </div>
          <p className="mt-8 font-lux text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-3xl">
            {c.kapanisCumlesi}
          </p>
          <Imza className="mt-8 text-4xl" />
          <p className="mt-6 text-sm text-duman">{c.ui.mektupNot}</p>
        </motion.div>
      </div>
    </section>
  );
}

/* Katlama şeridi — gerçek büyüme rakamları, ok işaretleriyle art arda. */
/* Film bölümü: sabit ekranda, scroll ilerledikçe beliren/kaybolan sahne. */
function FilmBolumu({
  adim,
  indeks,
  toplam,
  ilerleme,
}: {
  adim: Icerik["yolculuk"][number];
  indeks: number;
  toplam: number;
  ilerleme: MotionValue<number>;
}) {
  const bas = indeks / toplam;
  const son = (indeks + 1) / toplam;
  const kenar = 0.3 / toplam;
  const opacity = useTransform(
    ilerleme,
    [bas, bas + kenar, son - kenar, son],
    [0, 1, 1, indeks === toplam - 1 ? 1 : 0],
  );
  const y = useTransform(ilerleme, [bas, son], [60, -60]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex items-center"
    >
      <div className="relative mx-auto w-full max-w-5xl px-6">
        <p
          aria-hidden
          className="pointer-events-none absolute -top-24 left-0 text-[34vw] leading-none font-semibold tracking-tighter text-black/[0.04] select-none md:-top-40 md:text-[22rem]"
        >
          {adim.yil}
        </p>
        <p className="text-sm font-medium tracking-widest text-altin uppercase">
          {adim.yil}
        </p>
        <h3 className="mt-4 max-w-[16ch] text-4xl font-semibold tracking-tight text-fildisi md:text-6xl">
          {adim.baslik}
        </h3>
        <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-fildisi/75 md:text-xl">
          {adim.aciklama}
        </p>
      </div>
    </motion.div>
  );
}

function Yolculuk() {
  const c = useC();
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const toplam = c.yolculuk.length;
  const [aktifAdim, setAktifAdim] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setAktifAdim(Math.min(toplam - 1, Math.floor(p * toplam)));
  });

  if (azalt) {
    return (
      <section id="yolculuk" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-4xl space-y-16 px-6">
          <h2 className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
            {c.ui.yolculukBaslik}
          </h2>
          {c.yolculuk.map((adim) => (
            <div key={adim.baslik}>
              <p className="text-sm font-medium tracking-widest text-altin uppercase">
                {adim.yil}
              </p>
              <h3 className="mt-3 text-3xl font-semibold">{adim.baslik}</h3>
              <p className="mt-4 max-w-[52ch] text-lg text-duman">
                {adim.aciklama}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="yolculuk" ref={ref} className="relative h-[360vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {c.yolculuk.map((adim, i) => (
          <FilmBolumu
            key={adim.baslik}
            adim={adim}
            indeks={i}
            toplam={toplam}
            ilerleme={scrollYProgress}
          />
        ))}
        {/* İlerleme noktaları — kaçıncı sahnedeyiz */}
        <div className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col items-center gap-3 md:right-10">
          {c.yolculuk.map((adim, i) => (
            <span
              key={adim.baslik}
              aria-hidden
              className={`w-2 rounded-full transition-all duration-500 ${
                i === aktifAdim ? "h-6 bg-altin" : "h-2 bg-fildisi/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* Kanıt: büyük sayan rakamlar. Arkadaki ağ görünür kalsın diye yarı saydam. */
/* Katlama projeksiyonu: ziyaretçi kendi aylık el sıkışma sayısını girer,
   ekleme (doğrusal) ile katlama (üstel) farkını kendi rakamıyla görür ve
   paylaşır. Açıkça matematik projeksiyonu; kazanç vaadi değil. */
function KatlamaProjeksiyon() {
  const c = useC();
  const dil = useDil();
  const [n, setN] = useState(5);
  const aylar = Array.from({ length: 12 }, (_, i) => i + 1);
  const katlama = aylar.map((m) => Math.round(n * Math.pow(1.4, m - 1)));
  const ekleme = aylar.map((m) => n * m);
  const maks = katlama[katlama.length - 1];
  const ay6 = katlama[5];
  const ay12 = katlama[11];
  const nokta = (arr: number[]) =>
    arr
      .map((v, i) => `${(i / 11) * 100},${60 - (v / maks) * 56}`)
      .join(" ");
  return (
    <section className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <H2Perde className="max-w-[18ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.proj.baslik}
        </H2Perde>
        <p className="mt-4 max-w-[52ch] text-duman">{c.proj.alt}</p>
        <div className="mt-10 rounded-3xl border border-altin/15 bg-abanoz-2/50 p-6 backdrop-blur-sm md:p-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-lux text-5xl text-altin md:text-6xl">{n}</span>
            <span className="text-duman">{c.proj.kisiEtiket}</span>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              aria-label={c.proj.kisiEtiket}
              className="mt-2 w-full cursor-pointer accent-altin sm:mt-0 sm:ml-auto sm:w-56"
            />
          </div>
          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            className="mt-8 h-48 w-full md:h-64"
            aria-hidden
          >
            <polyline
              points={nokta(ekleme)}
              fill="none"
              stroke="var(--color-duman)"
              strokeOpacity="0.5"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={nokta(katlama)}
              fill="none"
              stroke="var(--color-altin)"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="font-lux text-3xl text-fildisi md:text-4xl">
                {ay6.toLocaleString(dil === "en" ? "en-US" : "tr-TR")}
              </p>
              <p className="text-sm text-duman">{c.proj.ay6}</p>
            </div>
            <div>
              <p className="font-lux text-3xl text-altin md:text-4xl">
                {ay12.toLocaleString(dil === "en" ? "en-US" : "tr-TR")}
              </p>
              <p className="text-sm text-duman">{c.proj.ay12}</p>
            </div>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-duman/80">
            {c.proj.uyari}
          </p>
          <button
            type="button"
            onClick={() => { projKartiPaylas(n, ay6, ay12, dil); olcum("proj-paylas"); }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-altin/40 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
          >
            <ShareNetwork size={15} weight="bold" />
            {c.proj.kartPaylas}
          </button>
        </div>
      </div>
    </section>
  );
}

function Rakamlar() {
  const c = useC();
  return (
    <section id="rakamlar" className="relative scroll-mt-24 overflow-hidden py-24 md:py-32">
      {/* Rakamların yüzü: arka planda soluk portre silüeti */}
      <Image
        aria-hidden
        src="/portre-duotone.webp"
        alt=""
        width={640}
        height={800}
        className="pointer-events-none absolute top-1/2 right-[-60px] hidden w-[440px] -translate-y-1/2 rotate-2 opacity-[0.07] blur-[1.5px] select-none md:block"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-14 max-w-[30ch] font-lux text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl"
        >
          {c.ui.rakamlarBaslik}
        </motion.p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-14 md:grid-cols-4">
          {c.rakamlar.map((r, i) => (
            <motion.div
              key={r.etiket}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: GECIS }}
            >
              <p
                className="text-5xl font-semibold tracking-tighter text-altin md:text-7xl"
                style={{ textShadow: "0 2px 24px rgba(241,239,233,0.92)" }}
              >
                {r.deger.startsWith("250") ? <DramatikSayac /> : r.deger}
                <span className="text-2xl text-altin/70 md:text-3xl">
                  {r.ek}
                </span>
              </p>
              <p
                className="mt-3 text-sm leading-snug text-fildisi/70 md:text-base"
                style={{ textShadow: "0 1px 12px rgba(241,239,233,0.92)" }}
              >
                {r.etiket}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-8 border-t border-black/10 pt-14 md:gap-x-5">
          {c.katlamaSeridi.adimlar.map((adim, i) => (
            <div key={adim.etiket} className="flex items-center gap-x-3 md:gap-x-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: GECIS }}
                className="text-center"
              >
                <p
                  className={`font-semibold tracking-tighter ${
                    i === c.katlamaSeridi.adimlar.length - 1
                      ? "text-4xl text-altin md:text-6xl"
                      : "text-2xl text-fildisi/70 md:text-4xl"
                  }`}
                >
                  {adim.deger}
                </p>
                <p className="mt-2 max-w-[16ch] text-xs leading-snug text-duman md:text-sm">
                  {adim.etiket}
                </p>
              </motion.div>
              {i < c.katlamaSeridi.adimlar.length - 1 && (
                <motion.span
                  aria-hidden
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.12 + 0.1, ease: GECIS }}
                  className="text-xl text-altin/40 md:text-2xl"
                >
                  →
                </motion.span>
              )}
            </div>
          ))}
        </div>
        <KariyerKaydirici />
      </div>
    </section>
  );
}

/* Kariyer zaman kaydırıcısı: 2013'ten bugüne gerçek kilometre taşları
   (uydurma ağ sayısı yok — yalnız doğrulanmış kariyer basamakları). */
function KariyerKaydirici() {
  const c = useC();
  const veri = c.kariyerZaman;
  const [i, setI] = useState(veri.length - 1);
  const akt = veri[i];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: GECIS }}
      className="mt-16 rounded-3xl border border-altin/15 bg-abanoz-2/50 p-8 backdrop-blur-sm md:p-10"
    >
      <p className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
        {c.ui.kariyerKaydirBaslik}
      </p>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-lux text-5xl leading-none text-fildisi md:text-7xl">
          {akt.yil}
        </span>
        {akt.ay && <span className="text-lg text-duman">{akt.ay}</span>}
      </div>
      <p className="mt-3 font-lux text-2xl text-altin md:text-3xl">{akt.rutbe}</p>
      <p className="mt-2 max-w-[46ch] text-duman">{akt.not}</p>
      <input
        type="range"
        min={0}
        max={veri.length - 1}
        step={1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        aria-label={c.ui.kariyerKaydirBaslik}
        className="mt-8 w-full cursor-pointer accent-altin"
      />
      <div className="mt-2 flex justify-between">
        {veri.map((v, k) => (
          <button
            key={`${v.yil}-${k}`}
            type="button"
            onClick={() => setI(k)}
            aria-label={`${v.yil} ${v.rutbe}`}
            className={`text-xs tabular-nums transition-colors ${
              k === i ? "font-semibold text-altin" : "text-duman hover:text-fildisi"
            }`}
          >
            {v.yil}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* Felsefe: kendi sözleri; dokununca sözün arka yüzü (açılımı) görünür. */
function Sozler() {
  const c = useC();
  const [acik, setAcik] = useState<number | null>(null);
  return (
    <section id="sozler" className="relative scroll-mt-24 overflow-hidden py-24 md:py-40">
      {/* Filigran tırnak */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 left-2 font-lux text-[14rem] leading-none text-altin/[0.06] select-none md:text-[24rem]"
      >
        “
      </span>
      <div className="relative mx-auto max-w-5xl px-6">
        <p className="mb-12 flex items-center gap-2 text-sm font-medium tracking-[0.2em] text-duman uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-altin" />
          {c.ui.sozIpucu}
        </p>
        <div className="space-y-16 md:space-y-28">
          {c.sozler.map((s, i) => {
            const secili = acik === i;
            return (
              <motion.blockquote
                key={s.soz}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.8, ease: GECIS }}
                className={`max-w-[24ch] ${i % 2 === 1 ? "ml-auto text-right" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setAcik(secili ? null : i)}
                  aria-expanded={secili}
                  className={`block w-full cursor-pointer ${
                    i % 2 === 1 ? "text-right" : "text-left"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {secili ? (
                      <motion.span
                        key="arka"
                        initial={{ opacity: 0, rotateX: 70 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        exit={{ opacity: 0, rotateX: -70 }}
                        transition={{ duration: 0.35, ease: GECIS }}
                        className="block text-xl leading-relaxed text-duman md:text-2xl"
                      >
                        {s.arka}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="on"
                        initial={{ opacity: 0, rotateX: 70 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        exit={{ opacity: 0, rotateX: -70 }}
                        transition={{ duration: 0.35, ease: GECIS }}
                        className="block font-lux text-3xl leading-[1.15] font-semibold tracking-tight md:text-6xl"
                      >
                        <span className="text-altin/40">“</span>
                        {s.soz}
                        <span className="text-altin/40">”</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <div
                  className={`mt-4 flex gap-4 ${
                    i % 2 === 1 ? "flex-row-reverse" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { sozKartiPaylas(s.soz); olcum("soz-paylas"); }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-duman transition-colors hover:text-altin"
                  >
                    <ShareNetwork size={15} weight="bold" />
                    {c.ui.sozKartPaylas}
                  </button>
                  <button
                    type="button"
                    onClick={() => { sozStoryPaylas(s.soz); olcum("soz-story"); }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-duman transition-colors hover:text-altin"
                  >
                    {c.ui.sozKartStory}
                  </button>
                </div>
              </motion.blockquote>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Genel video kartı: kalıcı thumbnail (Vimeo/YouTube), tıklanınca oynatıcı.
   Facade deseni: yüklenene kadar sadece görsel — performans + gizlilik. */
function VideoKart({
  v,
}: {
  v: Icerik["videolar"]["liste"][number];
}) {
  const c = useC();
  const [oynat, setOynat] = useState(false);
  const src =
    v.platform === "vimeo"
      ? `https://player.vimeo.com/video/${v.id}?autoplay=1&title=0&byline=0&portrait=0`
      : `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-abanoz-2 transition-colors hover:border-altin/40">
      <div className="relative aspect-video w-full overflow-hidden">
        {oynat ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={src}
            title={v.baslik}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setOynat(true)}
            className="absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`${v.baslik} — ${c.ui.izle}`}
          >
            <Image
              src={v.gorsel}
              alt={v.baslik}
              width={800}
              height={450}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {v.sure}
            </span>
            <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-altin/90 text-fildisi backdrop-blur transition-transform group-hover:scale-110">
              <PlayCircle size={30} weight="fill" />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-semibold tracking-tight text-fildisi">
          {v.baslik}
        </h3>
        <p className="mt-2 leading-relaxed text-duman">{v.ozet}</p>
      </div>
    </article>
  );
}

/* Kamera karşısında — gerçek eğitim videoları (Vimeo/YouTube). */
/* Popüler bir YouTube videosu kartı — kalıcı thumbnail, tıklayınca oynatıcı. */
function PopulerKart({ id, baslik }: { id: string; baslik: string }) {
  const [oynat, setOynat] = useState(false);
  return (
    <div className="w-[76vw] shrink-0 snap-start sm:w-[340px]">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-black/10 bg-abanoz-2">
        {oynat ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={baslik}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setOynat(true);
              olcum("populer-izle");
            }}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label={baslik}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt={baslik}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-altin/90 text-fildisi transition-transform group-hover:scale-110">
              <PlayCircle size={30} weight="fill" />
            </span>
          </button>
        )}
      </div>
      <p className="mt-3 font-medium text-fildisi">{baslik}</p>
    </div>
  );
}

/* "En çok izlenenler" — YouTube kanalının popülerliğe göre ilk videoları,
   yatay kaydırmalı şerit. */
function PopulerStrip() {
  const c = useC();
  return (
    <div className="mt-12">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
          {c.ui.populerBaslik}
        </span>
        <span className="text-sm text-duman">{c.ui.populerAlt}</span>
      </div>
      <div className="mt-5 flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {POPULER.map((v) => (
          <PopulerKart key={v.id} id={v.id} baslik={v.baslik} />
        ))}
      </div>
    </div>
  );
}

/* En yeni YouTube videosu — /son-video.json'dan (haftalık GitHub Action tazeler).
   Boşsa hiç görünmez; site "kendi kendine yaşar". */
function SonVideo() {
  const c = useC();
  const [v, setV] = useState<{ id: string; baslik: string } | null>(null);
  const [oynat, setOynat] = useState(false);
  useEffect(() => {
    fetch("/son-video.json")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.id === "string" && d.id) setV(d);
      })
      .catch(() => {});
  }, []);
  if (!v) return null;
  return (
    <div className="mt-12 overflow-hidden rounded-3xl border border-altin/30 bg-abanoz-2">
      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <div className="relative aspect-video">
          {oynat ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
              title={v.baslik}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setOynat(true)}
              className="absolute inset-0 h-full w-full cursor-pointer"
              aria-label={v.baslik}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                alt={v.baslik}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-altin/90 text-fildisi">
                <PlayCircle size={34} weight="fill" />
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col justify-center p-6 md:p-8">
          <span className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
            {c.ui.sonEtiket}
          </span>
          <h3 className="mt-3 font-lux text-2xl font-semibold tracking-tight text-fildisi">
            {v.baslik}
          </h3>
        </div>
      </div>
    </div>
  );
}

function Videolar() {
  const c = useC();
  return (
    <section id="videolar" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <H2Perde className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.videolar.baslik}
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 max-w-[54ch] text-duman"
        >
          {c.videolar.altMetin}
        </motion.p>
        <PopulerStrip />
        <SonVideo />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {c.videolar.liste.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.08, ease: GECIS }}
            >
              <VideoKart v={v} />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-duman"
        >
          <span>{c.videolar.kanalNot}</span>
          <a
            href={YOUTUBE_KANAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-altin underline-offset-2 hover:underline"
          >
            {c.videolar.kanalEtiket}
            <ArrowUpRight size={16} weight="bold" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* Benimle çalışmak: 3 vaat. */
function Vaat() {
  const c = useC();
  return (
    <section id="calis" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-6 text-sm font-medium tracking-[0.2em] text-altin uppercase"
        >
          {c.oneteamPerde.etiket}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.1, ease: GECIS }}
          className="text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl"
        >
          {c.oneteamPerde.ana}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.2, ease: GECIS }}
          className="mx-auto mt-8 max-w-[52ch] text-lg leading-relaxed text-duman"
        >
          {c.oneteamPerde.alt}
        </motion.p>
      </div>
      <div className="mx-auto mt-20 max-w-6xl px-6">
        <H2Perde className="max-w-[18ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.surec.baslik}
        </H2Perde>
        <div className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-8">
          {/* Adımları bağlayan altın hat */}
          <div
            aria-hidden
            className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-altin/25 md:block"
          />
          {c.surec.adimlar.map((adim, i) => (
            <motion.div
              key={adim.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: GECIS }}
              className="relative"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full border border-altin/60 bg-abanoz font-lux text-lg text-altin">
                {i + 1}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-fildisi">
                {adim.baslik}
              </h3>
              <p className="mt-3 leading-relaxed text-duman">
                {adim.aciklama}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* YouTube facade: tıklanana kadar sadece kapak görseli (gerçek yüz) + oynat
   düğmesi yüklenir; tıklayınca iframe gelir. Performans + gerçek yüz kapağı. */
function VideoKapak({ id }: { id: string }) {
  const c = useC();
  const [oynat, setOynat] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-black/10 bg-abanoz-2">
      {oynat ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="Emre Topçu"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setOynat(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label="Videoyu oynat"
        >
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt="Emre Topçu — tanıyanların gözünden"
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-abanoz/70 to-transparent" />
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-altin/90 px-6 py-3 font-medium text-fildisi backdrop-blur transition-transform group-hover:scale-105">
            <PlayCircle size={24} weight="fill" />
            {c.ui.izle}
            <span className="text-fildisi/70">· {c.ui.videoSure}</span>
          </span>
        </button>
      )}
    </div>
  );
}

/* Sahneden — konuşmalar + eğitim arşivi, tek birleşik kart ızgarası. */
function Arsiv() {
  const c = useC();
  const tumler = [
    ...c.konusmalar.map((k) => ({ ...k, etiket: undefined as string | undefined })),
    ...c.egitimler.map((e) => ({ baslik: e.baslik, ozet: e.ozet, etiket: e.yil })),
  ];
  return (
    <section id="konusmalar" className="scroll-mt-24 bg-abanoz py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <h2 className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
              {c.ui.sahneBaslik}
            </h2>
            <p className="mt-4 max-w-[52ch] text-duman">{c.ui.sahneAlt}</p>
          </div>
          <Manyetik>
            <a
              href={LIDER_PROFIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-altin/40 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
            >
              {c.ui.tumKonusmalar}
              <ArrowUpRight size={16} weight="bold" />
            </a>
          </Manyetik>
        </motion.div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tumler.map((k, i) => (
            <motion.article
              key={k.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.06, ease: GECIS }}
              className={`group flex min-h-[200px] flex-col justify-between rounded-2xl border border-black/10 p-7 transition-[transform,border-color] hover:border-altin/40 active:scale-[0.99] ${
                i === 0
                  ? "bg-gradient-to-br from-altin/15 to-abanoz-2 md:col-span-2 lg:col-span-1"
                  : "bg-abanoz-2"
              }`}
            >
              <p className="text-sm text-duman">{k.etiket ?? `0${i + 1}`}</p>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-fildisi">
                  {k.baslik}
                </h3>
                <p className="mt-3 leading-relaxed text-duman">{k.ozet}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* "Emre Topçu deyince..." — tribute videosundaki gerçek, kolektif ifadeler.
   Öne çıkan sözler + tekrar eden kelimelerden oluşan otantik sosyal kanıt. */
function Deyince() {
  const c = useC();
  return (
    <section className="bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <H2Perde className="max-w-[20ch] font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          {c.deyince.baslik1}
          <br />
          <span className="text-altin">{c.deyince.baslik2}</span>
        </H2Perde>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 max-w-[52ch] text-duman"
        >
          {c.deyince.altMetin}
        </motion.p>

        {/* Tribute videosu — gerçek yüzler */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1, ease: GECIS }}
          className="mt-12 grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center"
        >
          <VideoKapak id={TRIBUTE_VIDEO_ID} />
          <p className="text-lg leading-relaxed text-duman">
            {c.deyince.videoAciklama}
          </p>
        </motion.div>

        {/* Öne çıkan sözler */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {c.deyince.sozler.map((soz, i) => (
            <motion.blockquote
              key={soz}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.08, ease: GECIS }}
              className="rounded-2xl border border-black/10 bg-abanoz-2 p-7 text-xl leading-snug font-medium tracking-tight text-fildisi/90 md:text-2xl"
            >
              <span className="text-altin/50">“</span>
              {soz}
              <span className="text-altin/50">”</span>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function Iletisim() {
  const c = useC();
  return (
    <section id="iletisim" className="relative scroll-mt-24 py-28 md:py-40">
      {/* metnin okunması için ağın üstünde yumuşak karartma */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[820px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(241,239,233,0.94) 0%, rgba(241,239,233,0.72) 45%, transparent 72%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: GECIS }}
          className="font-lux text-4xl font-semibold tracking-tight md:text-6xl"
        >
          {c.iletisim.baslikSatir1}
          <br />
          <span className="text-altin">{c.iletisim.baslikSatir2}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.1, ease: GECIS }}
          className="mx-auto mt-8 max-w-[48ch] text-lg leading-relaxed text-duman"
        >
          {c.iletisim.altMetin}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.2, ease: GECIS }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Manyetik>
            <a
              href={whatsappUrl("iletişim")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-altin px-8 py-4 text-lg font-medium text-fildisi transition-transform active:scale-[0.98]"
            >
              <WhatsappLogo size={20} weight="fill" />
              {c.ui.calis}
            </a>
          </Manyetik>
          <Manyetik>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-8 py-4 text-lg text-fildisi transition-colors hover:border-black/40 active:scale-[0.98]"
            >
              <InstagramLogo size={20} weight="bold" />
              {c.ui.instagram}
            </a>
          </Manyetik>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.35, ease: GECIS }}
          className="mx-auto mt-6 max-w-[38ch] text-sm leading-snug text-duman"
        >
          {c.ui.whatsappNot}
        </motion.p>
      </div>
    </section>
  );
}

/* Kitap ilgi listesi + Pazartesi Notları bülteni (backend yok; WhatsApp/e-posta). */
function KitapBulten() {
  const c = useC();
  const dil = useDil();
  return (
    <section className="border-t border-black/5 bg-abanoz py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-6 px-6 md:grid-cols-2">
        <div className="rounded-3xl border border-altin/20 bg-abanoz-2/60 p-8">
          <p className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
            {c.kitap.etiket}
          </p>
          <h3 className="mt-4 font-lux text-2xl font-semibold tracking-tight md:text-3xl">
            {c.kitap.baslik}
          </h3>
          <p className="mt-3 text-duman">{c.kitap.metin}</p>
          <a
            href={kitapHaberUrl(dil)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-altin/40 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi active:scale-[0.98]"
          >
            {c.kitap.dugme}
            <ArrowUpRight size={16} weight="bold" />
          </a>
        </div>
        <BultenForm />
      </div>
    </section>
  );
}

/* Pazartesi Notları kaydı — /api/bulten'e POST; yapılandırılmamışsa (Turnstile/
   KV yoksa) sessizce e-posta (mailto) yedeğine düşer. */
function BultenForm() {
  const c = useC();
  const [eposta, setEposta] = useState("");
  const [durum, setDurum] = useState<"bos" | "gonderiliyor" | "ok" | "hata">(
    "bos",
  );
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return;
    setDurum("gonderiliyor");
    try {
      const r = await fetch("/api/bulten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eposta, token: "" }),
      });
      if (r.ok) {
        setDurum("ok");
        return;
      }
      setDurum("hata");
    } catch {
      setDurum("hata");
    }
  };
  return (
    <div className="rounded-3xl border border-altin/20 bg-abanoz-2/60 p-8">
      <h3 className="font-lux text-2xl font-semibold tracking-tight md:text-3xl">
        {c.bulten.baslik}
      </h3>
      <p className="mt-3 text-duman">{c.bulten.metin}</p>
      {durum === "ok" ? (
        <p className="mt-6 font-medium text-altin">{c.bulten.tesekkur}</p>
      ) : (
        <>
          <form onSubmit={gonder} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              placeholder={c.bulten.eposta}
              className="w-full rounded-full border border-black/15 bg-abanoz px-5 py-3 text-fildisi outline-none focus:border-altin/60"
            />
            <button
              type="submit"
              disabled={durum === "gonderiliyor"}
              className="shrink-0 rounded-full bg-altin px-6 py-3 text-sm font-medium text-fildisi active:scale-[0.98] disabled:opacity-60"
            >
              {c.bulten.dugme}
            </button>
          </form>
          {durum === "hata" && (
            <p className="mt-3 text-sm text-duman">
              {c.bulten.hata}{" "}
              <a
                href={bultenMailto(c.bulten.konu, c.bulten.govde)}
                className="font-medium text-altin underline-offset-2 hover:underline"
              >
                {EPOSTA}
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Footer() {
  const c = useC();
  return (
    <footer className="border-t border-black/5 bg-abanoz py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center">
        <div
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-full border border-altin/50 font-lux text-sm text-altin"
        >
          ET
        </div>
        <p className="font-lux text-lg text-fildisi/80">{c.ui.footerFelsefe}</p>
        <div className="flex items-center gap-5 text-duman">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="transition-colors hover:text-altin"
          >
            <WhatsappLogo size={22} weight="fill" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="transition-colors hover:text-altin"
          >
            <InstagramLogo size={22} weight="bold" />
          </a>
          <a
            href={YOUTUBE_KANAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="transition-colors hover:text-altin"
          >
            <YoutubeLogo size={22} weight="fill" />
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-duman">
          <a href="/dusunuyorum" className="transition-colors hover:text-altin">
            {c.ui.dusunuyorumLink}
          </a>
          <span className="text-black/15">·</span>
          <a href="/plan" className="transition-colors hover:text-altin">
            {c.ui.planLink}
          </a>
          <span className="text-black/15">·</span>
          <a href="/medya" className="transition-colors hover:text-altin">
            {c.ui.medyaLink}
          </a>
        </div>
        <p className="text-sm text-duman">© 2026 Emre Topçu</p>
      </div>
    </footer>
  );
}

/* Başa dön — ikinci ekrandan sonra sağ altta belirir. */
function BasaDon() {
  const c = useC();
  const { scrollY } = useScroll();
  const [gorunur, setGorunur] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => {
    setGorunur(v > (typeof window !== "undefined" ? window.innerHeight * 1.5 : 1200));
  });
  return (
    <AnimatePresence>
      {gorunur && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={c.ui.basaDon}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: GECIS }}
          className="fixed right-5 bottom-20 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-altin/40 bg-abanoz/80 text-altin shadow-lg backdrop-blur transition-colors hover:bg-altin hover:text-fildisi md:right-8 md:bottom-24"
        >
          <ArrowUp size={20} weight="bold" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* Ortam sesi — Web Audio ile sentezlenmiş yumuşak salon uğultusu (dosya yok).
   Kapalı başlar; açılınca hafif bir oda tonu, teori bölümünde sessizliğe düşer. */
function AmbiyansDugme() {
  const c = useC();
  const [acik, setAcik] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const kaynakRef = useRef<AudioBufferSourceNode | null>(null);

  const kur = () => {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    // 2 sn'lik pembe-benzeri gürültü tamponu (döngü).
    const uzunluk = ctx.sampleRate * 2;
    const tampon = ctx.createBuffer(1, uzunluk, ctx.sampleRate);
    const veri = tampon.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < uzunluk; i++) {
      const beyaz = Math.sin(i * 0.0007) * 0.2 + (((i * 9301 + 49297) % 233280) / 233280 - 0.5);
      b0 = 0.99 * b0 + beyaz * 0.05;
      b1 = 0.96 * b1 + beyaz * 0.05;
      b2 = 0.9 * b2 + beyaz * 0.05;
      veri[i] = (b0 + b1 + b2) * 0.5;
    }
    const kaynak = ctx.createBufferSource();
    kaynak.buffer = tampon;
    kaynak.loop = true;
    const alcak = ctx.createBiquadFilter();
    alcak.type = "lowpass";
    alcak.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    kaynak.connect(alcak).connect(gain).connect(ctx.destination);
    kaynak.start();
    ctxRef.current = ctx;
    gainRef.current = gain;
    kaynakRef.current = kaynak;
  };

  const cevir = async () => {
    if (!acik) {
      if (!ctxRef.current) kur();
      await ctxRef.current?.resume();
      gainRef.current?.gain.linearRampToValueAtTime(
        0.05,
        (ctxRef.current?.currentTime ?? 0) + 1.2,
      );
      setAcik(true);
    } else {
      gainRef.current?.gain.linearRampToValueAtTime(
        0,
        (ctxRef.current?.currentTime ?? 0) + 0.6,
      );
      setAcik(false);
    }
  };

  // Teori bölümü ekranda ortadayken sesi kıs (sinematik sessizlik).
  useEffect(() => {
    if (!acik) return;
    const el = document.getElementById("teori");
    if (!el) return;
    const goz = new IntersectionObserver(
      ([g]) => {
        const hedef = g.isIntersecting ? 0.008 : 0.05;
        gainRef.current?.gain.linearRampToValueAtTime(
          hedef,
          (ctxRef.current?.currentTime ?? 0) + 0.8,
        );
      },
      { rootMargin: "-35% 0px -35% 0px" },
    );
    goz.observe(el);
    return () => goz.disconnect();
  }, [acik]);

  useEffect(() => () => {
    kaynakRef.current?.stop();
    ctxRef.current?.close();
  }, []);

  return (
    <button
      type="button"
      onClick={cevir}
      aria-label={acik ? c.ui.ambiyansKapat : c.ui.ambiyansAc}
      aria-pressed={acik}
      className="fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-altin/40 bg-abanoz/80 text-altin shadow-lg backdrop-blur transition-colors hover:bg-altin hover:text-fildisi md:right-8 md:bottom-8"
    >
      {acik ? (
        <SpeakerHigh size={20} weight="fill" />
      ) : (
        <SpeakerSimpleX size={20} weight="regular" />
      )}
    </button>
  );
}

/* Seç-alıntıla: sayfada bir cümle seçince minik "kartla paylaş" balonu —
   paylaşım motoru 5 sözden tüm siteye genişler. */
function SecAlintila() {
  const c = useC();
  const [poz, setPoz] = useState<{ x: number; y: number; metin: string } | null>(
    null,
  );
  useEffect(() => {
    const kontrol = () => {
      const s = window.getSelection?.();
      const metin = s?.toString().trim() ?? "";
      if (metin.length >= 20 && metin.length <= 240 && s && s.rangeCount) {
        const r = s.getRangeAt(0).getBoundingClientRect();
        if (r.width || r.height) {
          setPoz({ x: r.left + r.width / 2, y: r.top, metin });
          return;
        }
      }
      setPoz(null);
    };
    const kapat = () => setPoz(null);
    document.addEventListener("mouseup", kontrol);
    document.addEventListener("touchend", kontrol);
    window.addEventListener("scroll", kapat, true);
    return () => {
      document.removeEventListener("mouseup", kontrol);
      document.removeEventListener("touchend", kontrol);
      window.removeEventListener("scroll", kapat, true);
    };
  }, []);
  if (!poz) return null;
  return (
    <button
      type="button"
      onClick={() => {
        sozKartiPaylas(poz.metin);
        setPoz(null);
        window.getSelection?.()?.removeAllRanges();
      }}
      style={{ left: poz.x, top: Math.max(12, poz.y - 46) }}
      className="fixed z-[80] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-fildisi px-3.5 py-2 text-xs font-medium text-abanoz shadow-lg"
    >
      <ShareNetwork size={14} weight="bold" />
      {c.ui.alintila}
    </button>
  );
}

/* Dönen ziyaretçiye "kaldığın yer" şeridi — açılış perdesinin akıllı hali. */
function DevamSeridi() {
  const c = useC();
  const [bolum, setBolum] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  // Aktif fasılı sürekli sakla; dönüşte teklif et.
  useEffect(() => {
    const goz = new IntersectionObserver(
      (girisler) => {
        const g = girisler
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (g) {
          const i = FASIL_IDLERI.indexOf(
            g.target.id as (typeof FASIL_IDLERI)[number],
          );
          if (i >= 0) {
            try {
              localStorage.setItem("emretopcu_sonBolum", g.target.id);
            } catch {
              /* yoksay */
            }
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );
    for (const id of FASIL_IDLERI) {
      const el = document.getElementById(id);
      if (el) goz.observe(el);
    }
    return () => goz.disconnect();
  }, []);

  // Dönen ziyaretçi (açılış görülmüş) + anlamlı bir konum varsa teklif göster.
  useEffect(() => {
    try {
      const gorulmus = localStorage.getItem("emretopcu_acilis");
      const son = localStorage.getItem("emretopcu_sonBolum");
      if (gorulmus && son && son !== "manifesto") {
        const i = FASIL_IDLERI.indexOf(son as (typeof FASIL_IDLERI)[number]);
        if (i > 0) {
          setIdx(i);
          setBolum(son);
        }
      }
    } catch {
      /* yoksay */
    }
  }, []);

  if (!bolum) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, delay: 1, ease: GECIS }}
        className="fixed inset-x-0 top-20 z-40 flex justify-center px-4"
      >
        <div className="flex items-center gap-3 rounded-full border border-altin/30 bg-abanoz-2/95 py-2 pr-2 pl-5 text-sm shadow-lg backdrop-blur">
          <span className="text-duman">
            {c.ui.devamBaslik}{" "}
            <span className="font-medium text-fildisi">{c.ui.fasillar[idx]}</span>
          </span>
          <a
            href={`#${bolum}`}
            onClick={() => setBolum(null)}
            className="rounded-full bg-altin px-4 py-1.5 font-medium text-fildisi"
          >
            {c.ui.devamDugme}
          </a>
          <button
            type="button"
            onClick={() => setBolum(null)}
            aria-label={c.ui.menuKapat}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-duman hover:bg-black/5 hover:text-fildisi"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* İlk 72 saat sayacı — ilk ziyaret anını hatırlar; kitabın teorisine sessiz
   bir gönderme ("motivasyonun raf ömrü 72 saat"). Kapatılınca bir daha çıkmaz. */
const ILK_ZIYARET_ANAHTAR = "emretopcu_ilk";
const SAAT_KAPALI_ANAHTAR = "emretopcu_saat_kapali";
function SaatSayaci() {
  const c = useC();
  const { scrollY } = useScroll();
  const [gorunur, setGorunur] = useState(false);
  const [kapali, setKapali] = useState(true);
  const [saat, setSaat] = useState(1);
  const [doldu, setDoldu] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SAAT_KAPALI_ANAHTAR)) return;
      const simdi = Date.now();
      let ilk = localStorage.getItem(ILK_ZIYARET_ANAHTAR);
      if (!ilk) {
        localStorage.setItem(ILK_ZIYARET_ANAHTAR, String(simdi));
        ilk = String(simdi);
      }
      const gecen = Math.floor((simdi - Number(ilk)) / 3600000);
      if (gecen >= 72) setDoldu(true);
      else setSaat(Math.min(72, gecen + 1));
      setKapali(false);
    } catch {
      /* yoksay */
    }
  }, []);

  useMotionValueEvent(scrollY, "change", (v) => {
    setGorunur(
      v > (typeof window !== "undefined" ? window.innerHeight * 0.8 : 700),
    );
  });

  if (kapali) return null;
  const metin = doldu
    ? c.ui.saatDoldu
    : c.ui.saatIcinde.replace("{s}", String(saat));

  return (
    <AnimatePresence>
      {gorunur && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: GECIS }}
          className="fixed bottom-5 left-5 z-40 flex max-w-[15.5rem] items-center gap-2.5 rounded-full border border-altin/25 bg-abanoz-2/90 py-2 pr-2 pl-3.5 text-xs shadow-lg backdrop-blur"
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-altin" />
          <span className="leading-snug text-fildisi/80">{metin}</span>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(SAAT_KAPALI_ANAHTAR, "1");
              } catch {
                /* yoksay */
              }
              setKapali(true);
            }}
            aria-label={c.ui.menuKapat}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-duman hover:bg-black/5 hover:text-fildisi"
          >
            <X size={12} weight="bold" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Dil tercihini hatırlar; farklı dile alışkın ziyaretçiye ince bir şerit. */
const DIL_ANAHTAR = "emretopcu_dil";
function DilSeridi() {
  const dil = useDil();
  const [teklif, setTeklif] = useState(false);
  useEffect(() => {
    let kayitli: string | null = null;
    try {
      kayitli = localStorage.getItem(DIL_ANAHTAR);
    } catch {
      return;
    }
    if (kayitli && kayitli !== dil) {
      setTeklif(true); // önceki tercihi henüz ezme; kullanıcı karar versin
    } else {
      try {
        localStorage.setItem(DIL_ANAHTAR, dil);
      } catch {
        /* yoksay */
      }
    }
  }, [dil]);

  const kapat = () => {
    try {
      localStorage.setItem(DIL_ANAHTAR, dil);
    } catch {
      /* yoksay */
    }
    setTeklif(false);
  };

  // Hedef dil = kayıtlı tercih (mevcut dilden farklı). Metin hedef dile göre.
  let kayitli: Dil = "tr";
  try {
    const k = localStorage.getItem(DIL_ANAHTAR);
    if (
      k === "tr" ||
      k === "en" ||
      k === "de" ||
      k === "es" ||
      k === "ru" ||
      k === "az"
    )
      kayitli = k;
  } catch {
    /* yoksay */
  }
  const hedef = kayitli;
  const link = DIL_YOL[hedef];
  const METIN: Record<Dil, { soru: string; devam: string }> = {
    tr: { soru: "Türkçe devam edilsin mi?", devam: "Devam et" },
    en: { soru: "Continue in English?", devam: "Continue" },
    de: { soru: "Auf Deutsch fortfahren?", devam: "Fortfahren" },
    es: { soru: "¿Continuar en español?", devam: "Continuar" },
    ru: { soru: "Продолжить на русском?", devam: "Продолжить" },
    az: { soru: "Azərbaycanca davam edilsin?", devam: "Davam et" },
  };
  const metin = METIN[hedef].soru;
  const devam = METIN[hedef].devam;

  return (
    <AnimatePresence>
      {teklif && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: GECIS }}
          className="fixed inset-x-0 top-16 z-40 flex justify-center px-4"
        >
          <div className="flex items-center gap-4 rounded-full border border-altin/30 bg-abanoz-2/95 px-5 py-2.5 text-sm shadow-lg backdrop-blur">
            <span className="text-fildisi" lang={hedef}>
              {metin}
            </span>
            <a
              href={link}
              className="font-medium text-altin underline-offset-2 hover:underline"
              lang={hedef}
            >
              {devam}
            </a>
            <button
              type="button"
              onClick={kapat}
              aria-label={dil === "tr" ? "Kapat" : "Dismiss"}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-duman hover:bg-black/5 hover:text-fildisi"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Kitap gibi fasıl rayı — sol kenarda aktif bölüm + derin link kopyala.
   Yalnız geniş ekranda; scroll-spy ile aktif fasılı büyütür. */
const FASIL_IDLERI = [
  "manifesto",
  "teori",
  "rakamlar",
  "yolculuk",
  "gercekler",
  "sozler",
  "konusmalar",
  "videolar",
  "iletisim",
] as const;

function useAktifFasil() {
  const [aktif, setAktif] = useState(0);
  useEffect(() => {
    const gozlemci = new IntersectionObserver(
      (girisler) => {
        const g = girisler
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (g) {
          const i = FASIL_IDLERI.indexOf(g.target.id as (typeof FASIL_IDLERI)[number]);
          if (i >= 0) setAktif(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.5, 1] },
    );
    for (const id of FASIL_IDLERI) {
      const el = document.getElementById(id);
      if (el) gozlemci.observe(el);
    }
    return () => gozlemci.disconnect();
  }, []);
  return aktif;
}

function FasilRayi() {
  const c = useC();
  const aktif = useAktifFasil();
  const [kopyalandi, setKopyalandi] = useState(false);
  const kopyala = () => {
    try {
      const id = FASIL_IDLERI[aktif];
      const u = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard?.writeText(u);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 1600);
    } catch {
      /* yoksay */
    }
  };
  return (
    <div className="group fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-2.5 lg:flex">
      {FASIL_IDLERI.map((id, i) => {
        const s = i === aktif;
        return (
          <a key={id} href={`#${id}`} className="flex items-center gap-3">
            <span
              className={`font-lux text-[0.7rem] tabular-nums transition-colors ${
                s ? "text-altin" : "text-duman/40"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`h-px transition-all duration-300 ${
                s ? "w-7 bg-altin" : "w-3 bg-duman/30 group-hover:w-4"
              }`}
            />
            <span
              className={`whitespace-nowrap text-xs transition-all duration-300 ${
                s
                  ? "text-fildisi opacity-100"
                  : "text-duman opacity-0 group-hover:opacity-60"
              }`}
            >
              {c.ui.fasillar[i]}
            </span>
          </a>
        );
      })}
      <button
        type="button"
        onClick={kopyala}
        aria-label={c.ui.baglantiKopyala}
        className="mt-1 inline-flex items-center gap-1.5 pl-[1.7rem] text-xs text-duman transition-colors hover:text-altin"
      >
        {kopyalandi ? (
          <CheckCircle size={14} weight="fill" className="text-altin" />
        ) : (
          <Copy size={14} />
        )}
        <span
          className={`whitespace-nowrap transition-opacity ${
            kopyalandi ? "text-altin opacity-100" : "opacity-0 group-hover:opacity-60"
          }`}
        >
          {kopyalandi ? c.ui.baglantiKopyalandi : c.ui.baglantiKopyala}
        </span>
      </button>
    </div>
  );
}

/* Sayfa gövdesi — dil context'i içinde çalışır. */
function ZirveIc() {
  const dil = useDil();
  const azalt = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const morf = useMotionValue(0); // ağ → dünya morfu (DunyaBolum sürer)

  return (
    <MorfContext.Provider value={morf}>
    <div
      lang={dil}
      className="relative z-0 min-h-[100dvh] bg-abanoz font-sahne text-fildisi selection:bg-altin selection:text-fildisi"
      style={{ colorScheme: "light" }}
    >
      {/* İlk ziyarette sinematik açılış perdesi */}
      <Acilis />
      {/* Dönen ziyaretçiye "kaldığın yer" şeridi */}
      <DevamSeridi />
      {/* Masaüstünde imleci izleyen altın ışık */}
      <ImlecIsigi />
      {/* Ortam sesi düğmesi (kapalı başlar) */}
      <AmbiyansDugme />
      {/* Tüm sayfanın arkasında yaşayan sinematik 3D sahne */}
      <Ag3D ilerleme={scrollYProgress} morf={morf} hareket={!azalt} />
      {/* İnce altın scroll-ilerleme çizgisi */}
      <motion.div
        aria-hidden
        style={azalt ? undefined : { scaleX: scrollYProgress }}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-altin"
      />
      <Nav />
      <FasilRayi />
      <DilSeridi />
      <main>
        <Hero />
        <Manifesto />
        <Teori />
        <KatlamaProjeksiyon />
        <Rakamlar />
        <DunyaBolum />
        <Yolculuk />
        <LiderTipleri />
        <Gercekler />
        <Sozler />
        <Arsiv />
        <Videolar />
        <Vaat />
        <EmreyeSor />
        <Sss />
        <Deyince />
        <KapanisCumlesi />
        <Iletisim />
      </main>
      <KitapBulten />
      <Footer />
      <BasaDon />
      <SaatSayaci />
      <SecAlintila />
    </div>
    </MorfContext.Provider>
  );
}

export default function Zirve({ dil = "tr" }: { dil?: Dil }) {
  return (
    <DilProvider dil={dil}>
      <ZirveIc />
    </DilProvider>
  );
}
