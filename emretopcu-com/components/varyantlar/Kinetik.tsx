import {
  ArrowUpRight,
  EnvelopeSimple,
  InstagramLogo,
} from "@phosphor-icons/react/dist/ssr";
import Reveal from "@/components/Reveal";
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

// Varyant C "Kinetik ajans": off-black zemin, tek kobalt vurgu, çok büyük
// tipografi, marquee bandı (sayfada bir adet), asimetrik grid, keskin köşeler.

const NAV_LINKLER = [
  { href: "#hakkimda", etiket: "Hakkımda" },
  { href: "#yolculuk", etiket: "Yolculuk" },
  { href: "#egitimler", etiket: "Eğitimler" },
  { href: "#ayna", etiket: "Liderlik Aynası" },
];

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-gece/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#" className="text-base font-bold tracking-tight">
          Emre Topçu
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKLER.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gri transition-colors hover:text-kar"
            >
              {link.etiket}
            </a>
          ))}
        </nav>
        <a
          href={`mailto:${EPOSTA}`}
          className="bg-kobalt px-4 py-1.5 text-sm font-medium text-kar transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
        >
          Bana yaz
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex min-h-[100dvh] flex-col justify-between">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pt-24">
        <h1
          className="yukselen text-[13vw] leading-[0.98] font-bold tracking-tighter uppercase md:text-8xl"
          style={{ "--d": "0.05s" } as React.CSSProperties}
        >
          Liderlik sahnede değil,
          <br />
          <span className="text-kobalt">aynada</span> başlar.
        </h1>
        <div
          className="yukselen mt-12 grid gap-8 md:grid-cols-12 md:items-end"
          style={{ "--d": "0.2s" } as React.CSSProperties}
        >
          <p className="max-w-[42ch] text-lg leading-relaxed text-gri md:col-span-6">
            {HERO.altMetin}
          </p>
          <div className="flex flex-wrap gap-3 md:col-span-6 md:justify-end">
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 bg-kobalt px-7 py-3.5 font-medium text-kar transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={18} weight="bold" />
              Bana yaz
            </a>
            <a
              href="#yolculuk"
              className="inline-flex items-center gap-2 border border-white/20 px-7 py-3.5 font-medium text-kar transition-colors hover:border-white/50 active:scale-[0.98]"
            >
              Yolculuğu gör
            </a>
          </div>
        </div>
      </div>
      {/* Tek marquee: eğitim arşivi başlıkları akar */}
      <div className="mt-16 overflow-hidden border-y border-white/10 py-4">
        <div className="marquee-band gap-0">
          {[0, 1].map((tekrar) => (
            <div key={tekrar} className="flex shrink-0" aria-hidden={tekrar === 1}>
              {EGITIMLER.map((egitim) => (
                <span
                  key={`${tekrar}-${egitim.baslik}`}
                  className="px-6 text-lg font-medium whitespace-nowrap text-gri uppercase"
                >
                  {egitim.baslik} <span className="px-4 text-kobalt">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hakkimda() {
  return (
    <section id="hakkimda" className="scroll-mt-24 py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="md:pl-[20%]">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight uppercase md:text-5xl">
              {HAKKIMDA.baslik}
            </h2>
          </Reveal>
          {HAKKIMDA.paragraflar.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              <p className="mt-7 max-w-[52ch] text-xl leading-relaxed text-gri md:text-2xl">
                {p}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Yolculuk() {
  return (
    <section id="yolculuk" className="scroll-mt-24 py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight uppercase md:text-5xl">
            Yolculuk
          </h2>
        </Reveal>
        <div className="mt-14">
          {YOLCULUK.map((adim, i) => (
            <Reveal key={adim.baslik} delay={i * 0.05}>
              <div className="group grid items-baseline gap-3 border-t border-white/10 py-10 transition-colors hover:bg-gece-2 md:grid-cols-[220px_1fr] md:gap-10 md:px-4">
                <p className="text-4xl font-bold tracking-tighter text-white/25 transition-colors group-hover:text-kobalt md:text-5xl">
                  {adim.yil}
                </p>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {adim.baslik}
                  </h3>
                  <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-gri">
                    {adim.aciklama}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Egitimler() {
  const kolonlar = [
    "md:col-span-7",
    "md:col-span-5",
    "md:col-span-5",
    "md:col-span-7",
    "md:col-span-6",
    "md:col-span-6",
  ];
  return (
    <section id="egitimler" className="scroll-mt-24 py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight uppercase md:text-5xl">
            Sahneden seçmeler
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-gri">
            Ekip içi eğitim arşivinden bazı başlıklar. Hepsi sahada denenmiş
            içerik.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          {EGITIMLER.map((egitim, i) => (
            <Reveal key={egitim.baslik} delay={(i % 2) * 0.08} className={kolonlar[i]}>
              <article
                className={`flex h-full min-h-[200px] flex-col justify-between border border-white/10 p-7 transition-colors hover:border-kobalt ${
                  i === 0
                    ? "bg-gradient-to-br from-kobalt/25 to-gece-2"
                    : i === 3
                      ? "bg-gradient-to-tl from-kobalt/15 to-gece-2"
                      : "bg-gece-2"
                }`}
              >
                <p className="text-sm text-gri">{egitim.yil}</p>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {egitim.baslik}
                  </h3>
                  <p className="mt-3 max-w-[46ch] leading-relaxed text-gri">
                    {egitim.ozet}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ayna() {
  return (
    <section id="ayna" className="scroll-mt-24 bg-kobalt py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tighter uppercase md:text-6xl">
            {AYNA.baslik}
          </h2>
          <p className="mt-6 max-w-[52ch] text-xl leading-relaxed text-kar/85">
            {AYNA.aciklama}
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-12 grid gap-8 border-t border-white/25 pt-10 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
            {AYNA.rakamlar.map((r) => (
              <div key={r.etiket}>
                <p className="text-sm text-kar/70">{r.etiket}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                  {r.deger}
                </p>
              </div>
            ))}
            <a
              href={AYNA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gece px-6 py-3 font-medium text-kar transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              ayna.oneteamglobal.ai
              <ArrowUpRight size={18} weight="bold" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Ilkeler() {
  return (
    <section className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {ILKELER.map((ilke, i) => (
          <Reveal key={ilke.baslik} delay={i * 0.06}>
            <div className="border-t border-white/10 py-12 last:border-b md:py-16">
              <h3 className="text-4xl font-bold tracking-tighter uppercase transition-colors hover:text-kobalt md:text-6xl">
                {ilke.baslik}
              </h3>
              <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-gri md:text-xl">
                {ilke.aciklama}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Iletisim() {
  return (
    <section id="iletisim" className="scroll-mt-24 py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 className="text-[11vw] leading-[1] font-bold tracking-tighter uppercase md:text-7xl">
            {ILETISIM.baslikSatir1}
            <br />
            <span className="text-kobalt">{ILETISIM.baslikSatir2}</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 bg-kobalt px-8 py-4 text-lg font-medium text-kar transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={20} weight="bold" />
              Bana yaz
            </a>
            {/* TODO: Instagram kullanıcı adını doğrula ve linki güncelle */}
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 px-8 py-4 text-lg font-medium text-kar transition-colors hover:border-white/50 active:scale-[0.98]"
            >
              <InstagramLogo size={20} weight="bold" />
              Instagram
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-gri md:flex-row">
        <p>© 2026 Emre Topçu</p>
        <a
          href={AYNA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-kar"
        >
          Liderlik Aynası
        </a>
      </div>
    </footer>
  );
}

export default function Kinetik() {
  return (
    <div
      className="min-h-[100dvh] bg-gece font-kinetik text-kar selection:bg-kobalt selection:text-kar"
      style={{ colorScheme: "dark" }}
    >
      <Nav />
      <main>
        <Hero />
        <Hakkimda />
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
