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

// Varyant B "Editoryal ışık": kırık beyaz zemin, mürekkep metin, orman yeşili
// tek vurgu, dergi düzeni, keskin köşeler, sakin hareket.

const NAV_LINKLER = [
  { href: "#hakkimda", etiket: "Hakkımda" },
  { href: "#yolculuk", etiket: "Yolculuk" },
  { href: "#egitimler", etiket: "Eğitimler" },
  { href: "#ayna", etiket: "Liderlik Aynası" },
];

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-murekkep/10 bg-kagit/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-base font-bold tracking-tight">
          Emre Topçu
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKLER.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-kursun underline-offset-4 transition-colors hover:text-murekkep hover:underline"
            >
              {link.etiket}
            </a>
          ))}
        </nav>
        <a
          href={`mailto:${EPOSTA}`}
          className="bg-orman px-4 py-1.5 text-sm font-medium text-kagit transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
        >
          Bana yaz
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex min-h-[100dvh] items-end border-b border-murekkep/10">
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-16 md:pb-24">
        <h1
          className="yukselen max-w-[22ch] text-5xl leading-[1.02] font-bold tracking-tight md:text-7xl"
          style={{ "--d": "0.05s" } as React.CSSProperties}
        >
          {HERO.baslikSatir1} {HERO.baslikSatir2}
        </h1>
        <div className="mt-12 grid gap-10 border-t border-murekkep/15 pt-8 md:grid-cols-12 md:items-start">
          <p
            className="yukselen max-w-[42ch] text-lg leading-relaxed text-kursun md:col-span-6"
            style={{ "--d": "0.18s" } as React.CSSProperties}
          >
            {HERO.altMetin}
          </p>
          <div
            className="yukselen md:col-span-3"
            style={{ "--d": "0.24s" } as React.CSSProperties}
          >
            <p className="text-sm text-kursun">{HERO.konum}</p>
            <p className="text-sm font-medium text-murekkep">{HERO.rol}</p>
          </div>
          <div
            className="yukselen flex flex-wrap gap-3 md:col-span-3 md:justify-end"
            style={{ "--d": "0.3s" } as React.CSSProperties}
          >
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 bg-orman px-6 py-3 font-medium text-kagit transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={18} weight="bold" />
              Bana yaz
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hakkimda() {
  return (
    <section id="hakkimda" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-3xl font-bold tracking-tight md:text-5xl">
            {HAKKIMDA.baslik}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {HAKKIMDA.paragraflar.map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-kursun">
                {p}
              </p>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Yolculuk() {
  return (
    <section id="yolculuk" className="scroll-mt-24 bg-kagit-2 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Yolculuk
          </h2>
        </Reveal>
        <div className="mt-12">
          {YOLCULUK.map((adim, i) => (
            <Reveal key={adim.baslik} delay={i * 0.05}>
              <div className="grid gap-2 border-t border-murekkep/15 py-8 md:grid-cols-[140px_1fr_1.4fr] md:gap-8">
                <p className="text-sm font-bold text-orman">{adim.yil}</p>
                <h3 className="text-xl font-bold tracking-tight text-murekkep md:text-2xl">
                  {adim.baslik}
                </h3>
                <p className="max-w-[52ch] leading-relaxed text-kursun">
                  {adim.aciklama}
                </p>
              </div>
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
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Sahneden seçmeler
          </h2>
          <p className="mt-4 max-w-[52ch] text-kursun">
            Ekip içi eğitim arşivinden bazı başlıklar. Hepsi sahada denenmiş
            içerik.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-px border border-murekkep/15 bg-murekkep/15 md:grid-cols-2">
          {EGITIMLER.map((egitim, i) => (
            <Reveal key={egitim.baslik} delay={(i % 2) * 0.08}>
              <article
                className={`h-full p-8 transition-colors ${
                  i % 4 === 0 ? "bg-orman-acik" : "bg-kagit"
                } hover:bg-orman hover:text-kagit group`}
              >
                <p className="text-sm text-kursun group-hover:text-kagit/70">
                  {egitim.yil}
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight">
                  {egitim.baslik}
                </h3>
                <p className="mt-4 max-w-[46ch] leading-relaxed text-kursun group-hover:text-kagit/85">
                  {egitim.ozet}
                </p>
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
    <section id="ayna" className="scroll-mt-24 bg-orman-acik py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            {AYNA.baslik}
          </h2>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-kursun">
            {AYNA.aciklama}
          </p>
          <a
            href={AYNA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 bg-orman px-6 py-3 font-medium text-kagit transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
          >
            ayna.oneteamglobal.ai
            <ArrowUpRight size={18} weight="bold" />
          </a>
        </Reveal>
        <Reveal delay={0.12}>
          <dl className="grid grid-cols-2 gap-px border border-murekkep/15 bg-murekkep/15">
            {AYNA.rakamlar.map((r) => (
              <div key={r.etiket} className="bg-kagit p-8">
                <dt className="text-sm text-kursun">{r.etiket}</dt>
                <dd className="mt-1 text-3xl font-bold tracking-tight text-murekkep md:text-4xl">
                  {r.deger}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

function Ilkeler() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Üç ilke
          </h2>
        </Reveal>
        <div className="mt-14 space-y-14">
          {ILKELER.map((ilke, i) => (
            <Reveal key={ilke.baslik} delay={i * 0.08}>
              <h3 className="text-2xl font-bold tracking-tight text-orman md:text-3xl">
                {ilke.baslik}
              </h3>
              <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-kursun">
                {ilke.aciklama}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Iletisim() {
  return (
    <section
      id="iletisim"
      className="border-t border-murekkep/10 py-28 md:py-36"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-4xl font-bold tracking-tight md:text-6xl">
            {ILETISIM.baslikSatir1} {ILETISIM.baslikSatir2}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${EPOSTA}`}
              className="inline-flex items-center gap-2 bg-orman px-7 py-3.5 font-medium text-kagit transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            >
              <EnvelopeSimple size={18} weight="bold" />
              Bana yaz
            </a>
            {/* TODO: Instagram kullanıcı adını doğrula ve linki güncelle */}
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-murekkep/25 px-7 py-3.5 font-medium text-murekkep transition-colors hover:border-murekkep active:scale-[0.98]"
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
    <footer className="border-t border-murekkep/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-kursun md:flex-row">
        <p>© 2026 Emre Topçu</p>
        <a
          href={AYNA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-murekkep"
        >
          Liderlik Aynası
        </a>
      </div>
    </footer>
  );
}

export default function Editoryal() {
  return (
    <div
      className="min-h-[100dvh] bg-kagit font-editoryal text-murekkep selection:bg-orman selection:text-kagit"
      style={{ colorScheme: "light" }}
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
