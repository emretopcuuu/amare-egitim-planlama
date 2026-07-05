"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  animate,
  type MotionValue,
} from "motion/react";
import {
  ArrowUpRight,
  EnvelopeSimple,
  InstagramLogo,
} from "@phosphor-icons/react";
import {
  AYNA,
  AYNA_URL,
  EGITIMLER,
  EPOSTA,
  HAKKIMDA,
  HERO,
  ILETISIM,
  ILKELER,
  YOLCULUK,
} from "@/lib/icerik";

// Varyant D "Zirve": scroll koreografili ödül-sitesi seviyesi tasarım.
// Abanoz zemin + tek altın vurgu. Yapışkan kart destesi, yatay kaydırma,
// kelime kelime beliren manifesto, canlı sayaçlar, manyetik butonlar.
// Tüm hareket prefers-reduced-motion'a saygılıdır.

const GECIS = [0.16, 1, 0.3, 1] as const;

// 3D sahne yalnızca tarayıcıda yüklenir (WebGL, SSR'de çalışmaz).
const Sahne3D = dynamic(() => import("./Sahne3D"), { ssr: false });

const NAV_LINKLER = [
  { href: "#manifesto", etiket: "Hakkımda" },
  { href: "#yolculuk", etiket: "Yolculuk" },
  { href: "#egitimler", etiket: "Eğitimler" },
  { href: "#ayna", etiket: "Liderlik Aynası" },
];

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
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-abanoz/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-base font-semibold tracking-tight">
          Emre Topçu
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKLER.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-duman transition-colors hover:text-fildisi"
            >
              {link.etiket}
            </a>
          ))}
        </nav>
        <a
          href={`mailto:${EPOSTA}`}
          className="rounded-full border border-altin/40 px-4 py-1.5 text-sm text-altin transition-colors hover:bg-altin hover:text-abanoz active:scale-[0.98]"
        >
          Bana yaz
        </a>
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
        <h1 className="text-[17vw] leading-[0.92] font-semibold tracking-tighter uppercase md:text-[10.5rem]">
          <PerdeSatir gecikme={0.1}>Emre</PerdeSatir>
          <PerdeSatir gecikme={0.22}>
            <span className="text-altin">Topçu</span>
          </PerdeSatir>
        </h1>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
          <motion.p
            initial={azalt ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48, ease: GECIS }}
            className="max-w-[38ch] text-lg leading-relaxed text-fildisi/85 md:text-xl"
          >
            {HERO.baslikSatir1} {HERO.baslikSatir2}
          </motion.p>
          <motion.div
            initial={azalt ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.62, ease: GECIS }}
            className="flex flex-wrap items-center gap-4"
          >
            <Manyetik>
              <a
                href={`mailto:${EPOSTA}`}
                className="inline-flex items-center gap-2 rounded-full bg-altin px-7 py-3.5 font-medium text-abanoz transition-transform active:scale-[0.98]"
              >
                <EnvelopeSimple size={18} weight="bold" />
                Bana yaz
              </a>
            </Manyetik>
            <Manyetik>
              <a
                href="#manifesto"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-fildisi transition-colors hover:border-white/45 active:scale-[0.98]"
              >
                Hikayeyi gör
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
  const azalt = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.45"],
  });
  const kelimeler = HAKKIMDA.paragraflar[0].split(" ");

  return (
    <section id="manifesto" className="scroll-mt-24 py-28 md:py-40">
      <div className="mx-auto max-w-4xl px-6" ref={ref}>
        <p className="text-2xl leading-snug font-medium tracking-tight text-fildisi md:text-4xl md:leading-snug">
          {azalt
            ? HAKKIMDA.paragraflar[0]
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
          {HAKKIMDA.paragraflar[1]}
        </motion.p>
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
  adim: (typeof YOLCULUK)[number];
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
          className="pointer-events-none absolute -top-24 left-0 text-[34vw] leading-none font-semibold tracking-tighter text-white/[0.05] select-none md:-top-40 md:text-[22rem]"
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
            Yolculuk
          </h2>
          {YOLCULUK.map((adim) => (
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
        {YOLCULUK.map((adim, i) => (
          <FilmBolumu
            key={adim.baslik}
            adim={adim}
            indeks={i}
            toplam={YOLCULUK.length}
            ilerleme={scrollYProgress}
          />
        ))}
      </div>
    </section>
  );
}

/* Dikey scroll'u yatay yolculuğa çeviren eğitim rafı. */
function Egitimler() {
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
            Sahneden seçmeler
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {EGITIMLER.map((egitim) => (
              <article
                key={egitim.baslik}
                className="rounded-2xl border border-white/10 bg-abanoz-2 p-7"
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
            Sahneden seçmeler
          </h2>
          <p className="mt-3 max-w-[52ch] text-duman">
            Ekip içi eğitim arşivinden bazı başlıklar. Hepsi sahada denenmiş
            içerik.
          </p>
        </div>
        <motion.div
          ref={rayRef}
          style={{ x }}
          className="mt-12 flex w-max gap-6 pl-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {EGITIMLER.map((egitim, i) => (
            <TiltKart key={egitim.baslik} className="shrink-0">
              <article
                className={`flex h-[320px] w-[300px] flex-col justify-between rounded-2xl border border-white/10 p-8 md:h-[360px] md:w-[420px] ${
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

/* Görünür olunca sayan rakam. */
function Sayac({ hedef, ek }: { hedef: number; ek: string }) {
  const azalt = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const gorunur = useInView(ref, { once: true, amount: 0.6 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !gorunur) return;
    if (azalt) {
      el.textContent = `${hedef}`;
      return;
    }
    const kontrol = animate(0, hedef, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${Math.round(v)}`;
      },
    });
    return () => kontrol.stop();
  }, [gorunur, hedef, azalt]);

  return (
    <span>
      <span ref={ref}>0</span>
      {ek}
    </span>
  );
}

const AYNA_SAYACLAR = [
  { etiket: "Katılımcı", hedef: 29, ek: " lider" },
  { etiket: "Süre", hedef: 3, ek: " gün" },
  { etiket: "Değerlendirme", hedef: 360, ek: "°" },
  { etiket: "Kuruluş", hedef: 2026, ek: "" },
];

function Ayna() {
  return (
    <section id="ayna" className="scroll-mt-24 bg-abanoz py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: GECIS }}
          className="relative overflow-hidden rounded-3xl border border-altin/25 bg-abanoz-2 p-10 md:p-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(700px 420px at 12% 0%, rgba(212, 176, 106, 0.14), transparent 60%)",
            }}
          />
          <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {AYNA.baslik}
              </h2>
              <p className="mt-5 max-w-[46ch] leading-relaxed text-duman">
                {AYNA.aciklama}
              </p>
              <Manyetik>
                <a
                  href={AYNA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-altin/50 px-6 py-3 font-medium text-altin transition-colors hover:bg-altin hover:text-abanoz active:scale-[0.98]"
                >
                  ayna.oneteamglobal.ai
                  <ArrowUpRight size={18} weight="bold" />
                </a>
              </Manyetik>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-10">
              {AYNA_SAYACLAR.map((s) => (
                <div key={s.etiket}>
                  <dt className="text-sm text-duman">{s.etiket}</dt>
                  <dd className="mt-1 text-4xl font-semibold tracking-tight text-fildisi">
                    <Sayac hedef={s.hedef} ek={s.ek} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Ilkeler() {
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
          Üç ilke
        </motion.h2>
        <div className="mt-10">
          {ILKELER.map((ilke, i) => (
            <motion.div
              key={ilke.baslik}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: GECIS }}
              className="group border-t border-white/10 py-12 last:border-b md:py-14"
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

function Iletisim() {
  return (
    <section id="iletisim" className="scroll-mt-24 py-28 md:py-40">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: GECIS }}
          className="text-4xl font-semibold tracking-tight md:text-6xl"
        >
          {ILETISIM.baslikSatir1}
          <br />
          <span className="text-altin">{ILETISIM.baslikSatir2}</span>
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.12, ease: GECIS }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Manyetik>
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 rounded-full bg-altin px-8 py-4 text-lg font-medium text-abanoz transition-transform active:scale-[0.98]"
            >
              <EnvelopeSimple size={20} weight="bold" />
              Bana yaz
            </a>
          </Manyetik>
          {/* TODO: Instagram kullanıcı adını doğrula ve linki güncelle */}
          <Manyetik>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-lg text-fildisi transition-colors hover:border-white/40 active:scale-[0.98]"
            >
              <InstagramLogo size={20} weight="bold" />
              Instagram
            </a>
          </Manyetik>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-abanoz py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-duman md:flex-row">
        <p>© 2026 Emre Topçu</p>
        <a
          href={AYNA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-fildisi"
        >
          Liderlik Aynası
        </a>
      </div>
    </footer>
  );
}

export default function Zirve() {
  const azalt = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div
      className="relative z-0 min-h-[100dvh] bg-abanoz font-sahne text-fildisi selection:bg-altin selection:text-abanoz"
      style={{ colorScheme: "dark" }}
    >
      {/* Tüm sayfanın arkasında yaşayan sinematik 3D sahne */}
      <Sahne3D ilerleme={scrollYProgress} hareket={!azalt} />
      <Nav />
      <main>
        <Hero />
        <Manifesto />
        <Yolculuk />
        <Egitimler />
        <Ayna />
        <Ilkeler />
        <Iletisim />
      </main>
      <Footer />
    </div>
  );
}
