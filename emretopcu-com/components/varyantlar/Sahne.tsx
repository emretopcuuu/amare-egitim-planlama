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

// Varyant A "Sahne": koyu zemin, tek buz mavisi vurgu, ölçülü hareket.

const NAV_LINKLER = [
  { href: "#hakkimda", etiket: "Hakkımda" },
  { href: "#yolculuk", etiket: "Yolculuk" },
  { href: "#egitimler", etiket: "Eğitimler" },
  { href: "#ayna", etiket: "Liderlik Aynası" },
];

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-base font-semibold tracking-tight">
          Emre Topçu
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKLER.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-mist transition-colors hover:text-bone"
            >
              {link.etiket}
            </a>
          ))}
        </nav>
        <a
          href={`mailto:${EPOSTA}`}
          className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-bone transition-colors hover:border-buz hover:text-buz active:scale-[0.98]"
        >
          Bana yaz
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 78% 18%, rgba(134, 201, 232, 0.09), transparent 65%)",
        }}
      />
      <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pt-24 pb-16 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <h1
            className="yukselen text-5xl leading-[1.04] font-semibold tracking-tight md:text-6xl"
            style={{ "--d": "0.05s" } as React.CSSProperties}
          >
            {HERO.baslikSatir1}
            <br />
            {HERO.baslikSatir2}
          </h1>
          <p
            className="yukselen mt-6 max-w-[46ch] text-lg leading-relaxed text-mist"
            style={{ "--d": "0.18s" } as React.CSSProperties}
          >
            {HERO.altMetin}
          </p>
          <div
            className="yukselen mt-9 flex flex-wrap items-center gap-4"
            style={{ "--d": "0.3s" } as React.CSSProperties}
          >
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 rounded-full bg-buz px-6 py-3 font-medium text-ink transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={18} weight="bold" />
              Bana yaz
            </a>
            <a
              href="#yolculuk"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-bone transition-colors hover:border-white/35 active:scale-[0.98]"
            >
              Yolculuğu gör
            </a>
          </div>
        </div>
        <div
          className="yukselen md:col-span-5"
          style={{ "--d": "0.24s" } as React.CSSProperties}
        >
          {/* TODO: Buraya gerçek portre gelecek: /public/portre.jpg (1200x1500). */}
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-ink-2">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(420px 420px at 30% 20%, rgba(134, 201, 232, 0.16), transparent 60%), radial-gradient(360px 360px at 85% 90%, rgba(134, 201, 232, 0.08), transparent 55%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl font-semibold tracking-tighter text-bone/90">
                ET
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-ink/60 px-5 py-4 backdrop-blur-sm">
              <p className="text-sm text-mist">{HERO.konum}</p>
              <p className="text-sm text-bone">{HERO.rol}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hakkimda() {
  return (
    <section id="hakkimda" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {HAKKIMDA.baslik}
          </h2>
        </Reveal>
        {HAKKIMDA.paragraflar.map((p, i) => (
          <Reveal key={i} delay={0.1 + i * 0.08}>
            <p className="mt-6 text-lg leading-relaxed text-mist">{p}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Yolculuk() {
  return (
    <section id="yolculuk" className="scroll-mt-24 bg-ink-2/50 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Yolculuk
          </h2>
        </Reveal>
        <div className="mt-14 space-y-14 border-l border-white/10 pl-8 md:pl-12">
          {YOLCULUK.map((adim, i) => (
            <Reveal key={adim.baslik} delay={i * 0.06}>
              <p className="text-sm font-medium text-buz">{adim.yil}</p>
              <h3 className="mt-2 text-xl font-medium text-bone md:text-2xl">
                {adim.baslik}
              </h3>
              <p className="mt-3 max-w-[52ch] leading-relaxed text-mist">
                {adim.aciklama}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Egitimler() {
  return (
    <section id="egitimler" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Sahneden seçmeler
          </h2>
          <p className="mt-4 max-w-[52ch] text-mist">
            Ekip içi eğitim arşivinden bazı başlıklar. Hepsi sahada denenmiş
            içerik.
          </p>
        </Reveal>
      </div>
      <Reveal delay={0.1}>
        <div className="mt-12 overflow-x-auto pb-4 [scrollbar-width:thin]">
          <div className="mx-auto flex w-max snap-x gap-5 px-6 md:px-[max(1.5rem,calc((100vw-72rem)/2))]">
            {EGITIMLER.map((egitim, i) => (
              <article
                key={egitim.baslik}
                className={`w-[280px] shrink-0 snap-start rounded-2xl border border-white/10 p-6 transition-colors hover:border-white/25 md:w-[320px] ${
                  i % 3 === 0
                    ? "bg-gradient-to-br from-buz/10 to-ink-2"
                    : "bg-ink-2"
                }`}
              >
                <p className="text-sm text-mist">{egitim.yil}</p>
                <h3 className="mt-3 text-xl font-medium leading-snug text-bone">
                  {egitim.baslik}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-mist">
                  {egitim.ozet}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Ayna() {
  return (
    <section id="ayna" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-2 p-10 md:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(700px 400px at 15% 0%, rgba(134, 201, 232, 0.14), transparent 60%)",
              }}
            />
            <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {AYNA.baslik}
                </h2>
                <p className="mt-5 max-w-[46ch] leading-relaxed text-mist">
                  {AYNA.aciklama}
                </p>
                <a
                  href={AYNA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-buz/50 px-6 py-3 font-medium text-buz transition-colors hover:bg-buz hover:text-ink active:scale-[0.98]"
                >
                  ayna.oneteamglobal.ai
                  <ArrowUpRight size={18} weight="bold" />
                </a>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-10">
                {AYNA.rakamlar.map((r) => (
                  <div key={r.etiket}>
                    <dt className="text-sm text-mist">{r.etiket}</dt>
                    <dd className="mt-1 text-4xl font-semibold tracking-tight text-bone">
                      {r.deger}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Ilkeler() {
  return (
    <section className="bg-ink-2/50 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Üç ilke
          </h2>
        </Reveal>
        <div className="mt-12 divide-y divide-white/10 border-t border-white/10">
          {ILKELER.map((ilke, i) => (
            <Reveal key={ilke.baslik} delay={i * 0.08}>
              <div className="grid gap-3 py-10 md:grid-cols-[1fr_1.4fr] md:gap-12">
                <h3 className="text-2xl font-semibold tracking-tight text-bone md:text-3xl">
                  {ilke.baslik}
                </h3>
                <p className="max-w-[52ch] self-center leading-relaxed text-mist">
                  {ilke.aciklama}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Iletisim() {
  return (
    <section id="iletisim" className="scroll-mt-24 py-28 md:py-40">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {ILETISIM.baslikSatir1}
            <br />
            {ILETISIM.baslikSatir2}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 rounded-full bg-buz px-7 py-3.5 font-medium text-ink transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={18} weight="bold" />
              Bana yaz
            </a>
            {/* TODO: Instagram kullanıcı adını doğrula ve linki güncelle */}
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-bone transition-colors hover:border-white/35 active:scale-[0.98]"
            >
              <InstagramLogo size={18} weight="bold" />
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
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-mist md:flex-row">
        <p>© 2026 Emre Topçu</p>
        <a
          href={AYNA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-bone"
        >
          Liderlik Aynası
        </a>
      </div>
    </footer>
  );
}

export default function Sahne() {
  return (
    <div
      className="min-h-[100dvh] bg-ink font-sahne text-bone selection:bg-buz selection:text-ink"
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
