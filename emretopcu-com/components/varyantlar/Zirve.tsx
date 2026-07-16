"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ArrowUpRight,
  InstagramLogo,
  PlayCircle,
  WhatsappLogo,
} from "@phosphor-icons/react";
import {
  AYNA_URL,
  INSTAGRAM_URL,
  LIDER_PROFIL_URL,
  TRIBUTE_VIDEO_ID,
  WHATSAPP_URL,
  type Dil,
  type Icerik,
} from "@/lib/icerik";
import { DilProvider, useC, useDil } from "./dil";

// Varyant D "Zirve": scroll koreografili ödül-sitesi seviyesi tasarım.
// Abanoz zemin + tek altın vurgu. Yapışkan kart destesi, yatay kaydırma,
// kelime kelime beliren manifesto, canlı sayaçlar, manyetik butonlar.
// Tüm hareket prefers-reduced-motion'a saygılıdır.

const GECIS = [0.16, 1, 0.3, 1] as const;

// 3D sahne yalnızca tarayıcıda yüklenir (WebGL, SSR'de çalışmaz).
const Ag3D = dynamic(() => import("./Ag3D"), { ssr: false });

/* Dil değiştirici: TR / EN arasında geçiş (statik route'lara link). */
function DilSecici() {
  const dil = useDil();
  return (
    <div className="flex items-center gap-1 text-sm">
      <a
        href="/"
        aria-current={dil === "tr" ? "true" : undefined}
        className={
          dil === "tr" ? "font-semibold text-altin" : "text-duman hover:text-fildisi"
        }
      >
        TR
      </a>
      <span className="text-black/20">/</span>
      <a
        href="/en"
        aria-current={dil === "en" ? "true" : undefined}
        className={
          dil === "en" ? "font-semibold text-altin" : "text-duman hover:text-fildisi"
        }
      >
        EN
      </a>
    </div>
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
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-abanoz/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-base font-semibold tracking-tight">
          Emre Topçu
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {c.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-duman transition-colors hover:text-fildisi"
            >
              {link.etiket}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <DilSecici />
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-altin/40 px-4 py-1.5 text-sm text-altin transition-colors hover:bg-altin hover:text-fildisi active:scale-[0.98]"
          >
            <WhatsappLogo size={15} weight="fill" />
            {c.ui.calis}
          </a>
        </div>
      </div>
    </header>
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
          <PerdeSatir gecikme={0.15}>{c.hero.baslikSatir1}</PerdeSatir>
          <PerdeSatir gecikme={0.28}>
            <span className="text-altin">{c.hero.baslikSatir2}</span>
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
            className="flex flex-wrap items-center gap-4"
          >
            <Manyetik>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi transition-transform active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="fill" />
                {c.ui.calis}
              </a>
            </Manyetik>
            <Manyetik>
              <a
                href="#manifesto"
                className="inline-flex items-center gap-2 rounded-full border border-black/20 px-7 py-3.5 text-fildisi transition-colors hover:border-black/45 active:scale-[0.98]"
              >
                {c.ui.hikaye}
              </a>
            </Manyetik>
          </motion.div>
        </div>
      </motion.div>
    </section>
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

  return (
    <section id="manifesto" className="scroll-mt-24 py-28 md:py-40">
      <div className="mx-auto max-w-4xl px-6" ref={ref}>
        <motion.div
          initial={azalt ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="mb-12 flex items-center gap-5"
        >
          <Image
            src="/portre.jpg"
            alt="Emre Topçu"
            width={88}
            height={88}
            className="rounded-full border-2 border-altin/50"
          />
          <div>
            <p className="text-xl font-semibold tracking-tight">Emre Topçu</p>
            <p className="text-sm text-duman">{c.hakkimda.unvan}</p>
          </div>
        </motion.div>
        <p className="text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl md:leading-snug">
          {azalt
            ? c.hakkimda.paragraflar[0]
            : kelimeler.map((kelime, i) => (
                <Kelime
                  key={i}
                  kelime={kelime}
                  ilerleme={scrollYProgress}
                  bas={i / kelimeler.length}
                  son={(i + 1) / kelimeler.length}
                />
              ))}
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
    </section>
  );
}

/* Sektörün söylenmeyen gerçeği — teori perdesi, kitaba (2017) tarihli imza. */
function Teori() {
  const c = useC();
  return (
    <section className="py-24 md:py-40">
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
          className="text-3xl leading-tight font-semibold tracking-tight text-fildisi md:text-6xl"
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
    <section id="lider-tipleri" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.liderTipleri.baslik}
        </motion.h2>
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
function Gercekler() {
  const c = useC();
  return (
    <section id="gercekler" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-4 text-sm font-medium tracking-[0.2em] text-altin uppercase"
        >
          {c.gercekler.etiket}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="max-w-[24ch] text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.gercekler.baslik}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: GECIS }}
          className="mt-4 max-w-[52ch] text-duman"
        >
          {c.gercekler.altMetin}
        </motion.p>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {c.gercekler.kartlar.map((k, i) => (
            <TiltKart key={k.baslik}>
              <motion.article
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: GECIS }}
                className="flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-black/10 bg-abanoz-2 p-7 transition-colors hover:border-altin/40"
              >
                <h3 className="text-xl font-semibold tracking-tight text-fildisi md:text-2xl">
                  {k.baslik}
                </h3>
                <p className="mt-3 leading-relaxed text-duman">
                  {k.aciklama}
                </p>
              </motion.article>
            </TiltKart>
          ))}
        </div>
      </div>
    </section>
  );
}

/* SSS — akordeon, en çok sorulan sorular. */
function Sss() {
  const c = useC();
  const [acik, setAcik] = useState<number | null>(0);
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.sss.baslik}
        </motion.h2>
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

/* OneTeam konumlandırma perdesi — Vaat'ten önce köprü. */
function OneTeamPerde() {
  const c = useC();
  return (
    <section className="py-24 md:py-32">
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
    </section>
  );
}

/* Kapanış cümlesi — Deyince'den İletişim'e sinematik köprü. */
function KapanisCumlesi() {
  const c = useC();
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: GECIS }}
          className="text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl"
        >
          {c.kapanisCumlesi}
        </motion.p>
      </div>
    </section>
  );
}

/* Katlama şeridi — gerçek büyüme rakamları, ok işaretleriyle art arda. */
function KatlamaSeridi() {
  const c = useC();
  return (
    <section className="pb-20 md:pb-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-8 text-center text-sm font-medium tracking-[0.2em] text-altin uppercase"
        >
          {c.katlamaSeridi.etiket}
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-8 md:gap-x-5">
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
      </div>
    </section>
  );
}

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

  if (azalt) {
    return (
      <section id="yolculuk" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-4xl space-y-16 px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
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
    <section id="yolculuk" ref={ref} className="relative h-[520vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {c.yolculuk.map((adim, i) => (
          <FilmBolumu
            key={adim.baslik}
            adim={adim}
            indeks={i}
            toplam={c.yolculuk.length}
            ilerleme={scrollYProgress}
          />
        ))}
      </div>
    </section>
  );
}

/* Dikey scroll'u yatay yolculuğa çeviren eğitim rafı. */
function Egitimler() {
  const c = useC();
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rayRef = useRef<HTMLDivElement>(null);
  const [mesafe, setMesafe] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -mesafe]);

  useEffect(() => {
    const hesapla = () => {
      const ray = rayRef.current;
      if (!ray) return;
      setMesafe(Math.max(0, ray.scrollWidth - window.innerWidth + 48));
    };
    hesapla();
    window.addEventListener("resize", hesapla);
    return () => window.removeEventListener("resize", hesapla);
  }, []);

  if (azalt) {
    return (
      <section id="egitimler" className="scroll-mt-24 bg-abanoz py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {c.ui.egitimlerBaslik}
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {c.egitimler.map((egitim) => (
              <article
                key={egitim.baslik}
                className="rounded-2xl border border-black/10 bg-abanoz-2 p-7"
              >
                <p className="text-sm text-duman">{egitim.yil}</p>
                <h3 className="mt-3 text-2xl font-semibold">{egitim.baslik}</h3>
                <p className="mt-3 text-duman">{egitim.ozet}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="egitimler" ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden bg-abanoz">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {c.ui.egitimlerBaslik}
          </h2>
          <p className="mt-3 max-w-[52ch] text-duman">{c.ui.egitimlerAlt}</p>
        </div>
        <motion.div
          ref={rayRef}
          style={{ x }}
          className="mt-12 flex w-max gap-6 pl-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {c.egitimler.map((egitim, i) => (
            <TiltKart key={egitim.baslik} className="shrink-0">
              <article
                className={`flex h-[320px] w-[300px] flex-col justify-between rounded-2xl border border-black/10 p-8 md:h-[360px] md:w-[420px] ${
                  i % 3 === 0
                    ? "bg-gradient-to-br from-altin/15 to-abanoz-2"
                    : "bg-abanoz-2"
                }`}
              >
                <p className="text-sm text-duman">{egitim.yil}</p>
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-fildisi md:text-3xl">
                    {egitim.baslik}
                  </h3>
                  <p className="mt-4 max-w-[40ch] leading-relaxed text-duman">
                    {egitim.ozet}
                  </p>
                </div>
              </article>
            </TiltKart>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* Kanıt: büyük sayan rakamlar. Arkadaki ağ görünür kalsın diye yarı saydam. */
function Rakamlar() {
  const c = useC();
  return (
    <section className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: GECIS }}
          className="mb-14 max-w-[30ch] text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl"
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
                {r.deger}
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
      </div>
    </section>
  );
}

/* Felsefe: kendi sözleri, dev puntolarla scroll ile sırayla belirir. */
function Sozler() {
  const c = useC();
  return (
    <section className="py-24 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="space-y-16 md:space-y-28">
          {c.sozler.map((soz, i) => (
            <motion.blockquote
              key={soz}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ duration: 0.8, ease: GECIS }}
              className={`max-w-[20ch] text-3xl leading-[1.15] font-semibold tracking-tight md:text-6xl ${
                i % 2 === 1 ? "ml-auto text-right" : ""
              }`}
            >
              <span className="text-altin/40">“</span>
              {soz}
              <span className="text-altin/40">”</span>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Benimle çalışmak: 3 vaat. */
function Vaat() {
  const c = useC();
  return (
    <section id="calis" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="max-w-[16ch] text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.vaat.baslik}
        </motion.h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {c.vaat.maddeler.map((m, i) => (
            <motion.div
              key={m.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: GECIS }}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-abanoz-2 p-8 transition-colors hover:border-altin/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-altin/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-0"
              />
              <p className="relative text-4xl font-semibold tracking-tighter text-altin/30">
                0{i + 1}
              </p>
              <h3 className="relative mt-5 text-xl font-semibold tracking-tight text-fildisi md:text-2xl">
                {m.baslik}
              </h3>
              <p className="relative mt-3 leading-relaxed text-duman">
                {m.aciklama}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ilkeler() {
  const c = useC();
  return (
    <section className="bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.ui.ilkelerBaslik}
        </motion.h2>
        <div className="mt-10">
          {c.ilkeler.map((ilke, i) => (
            <motion.div
              key={ilke.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: GECIS }}
              className="group border-t border-black/10 py-12 last:border-b md:py-14"
            >
              <h3 className="text-3xl font-semibold tracking-tight text-fildisi transition-colors group-hover:text-altin md:text-5xl">
                {ilke.baslik}
              </h3>
              <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-duman">
                {ilke.aciklama}
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
          </span>
        </button>
      )}
    </div>
  );
}

/* Öne çıkan konuşmalar — imza keynote'lar. */
function Konusmalar() {
  const c = useC();
  return (
    <section id="konusmalar" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {c.ui.konusmalarBaslik}
            </h2>
            <p className="mt-4 max-w-[52ch] text-duman">
              {c.ui.konusmalarAlt}
            </p>
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
          {c.konusmalar.map((k, i) => (
            <motion.article
              key={k.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: GECIS }}
              className={`group flex min-h-[220px] flex-col justify-between rounded-2xl border border-black/10 p-7 transition-colors hover:border-altin/40 ${
                i === 0
                  ? "bg-gradient-to-br from-altin/15 to-abanoz-2 md:col-span-2 lg:col-span-1"
                  : "bg-abanoz-2"
              }`}
            >
              <p className="text-4xl font-semibold tracking-tighter text-altin/30">
                0{i + 1}
              </p>
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
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: GECIS }}
          className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {c.deyince.baslik1}
          <br />
          <span className="text-altin">{c.deyince.baslik2}</span>
        </motion.h2>
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

        {/* Tekrar eden kelimeler — etiket bulutu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1, ease: GECIS }}
          className="mt-10 flex flex-wrap gap-3"
        >
          {c.deyince.kelimeler.map((k) => (
            <span
              key={k}
              className="rounded-full border border-altin/25 bg-altin/5 px-5 py-2 text-sm font-medium text-altin md:text-base"
            >
              {k}
            </span>
          ))}
        </motion.div>
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
          className="text-4xl font-semibold tracking-tight md:text-6xl"
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
              href={WHATSAPP_URL}
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
      </div>
    </section>
  );
}

function Footer() {
  const c = useC();
  return (
    <footer className="border-t border-black/5 bg-abanoz py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-duman md:flex-row">
        <p>© 2026 Emre Topçu</p>
        <a
          href={AYNA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-fildisi"
        >
          {c.ui.aynaLink}
        </a>
      </div>
    </footer>
  );
}

/* Sayfa gövdesi — dil context'i içinde çalışır. */
function ZirveIc() {
  const dil = useDil();
  const azalt = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div
      lang={dil}
      className="relative z-0 min-h-[100dvh] bg-abanoz font-sahne text-fildisi selection:bg-altin selection:text-fildisi"
      style={{ colorScheme: "light" }}
    >
      {/* Tüm sayfanın arkasında yaşayan sinematik 3D sahne */}
      <Ag3D ilerleme={scrollYProgress} hareket={!azalt} />
      <Nav />
      <main>
        <Hero />
        <Manifesto />
        <Teori />
        <KatlamaSeridi />
        <Rakamlar />
        <Yolculuk />
        <LiderTipleri />
        <Gercekler />
        <Sozler />
        <Konusmalar />
        <Egitimler />
        <OneTeamPerde />
        <Vaat />
        <Ilkeler />
        <Sss />
        <Deyince />
        <KapanisCumlesi />
        <Iletisim />
      </main>
      <Footer />
    </div>
  );
}

export default function Zirve({ dil = "tr" }: { dil?: Dil }) {
  return (
    <DilProvider dil={dil}>
      <ZirveIc />
    </DilProvider>
  );
}
