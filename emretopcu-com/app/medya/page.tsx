import type { Metadata } from "next";
import Image from "next/image";
import {
  EPOSTA,
  ICERIK,
  INSTAGRAM_URL,
  WHATSAPP_URL,
  YOUTUBE_KANAL_URL,
} from "@/lib/icerik";

export const metadata: Metadata = {
  title: "Medya Kiti | Emre Topçu",
  description:
    "Emre Topçu'yu sahneye davet edecekler için: portreler, hazır biyografiler, konuşma başlıkları ve iletişim.",
  alternates: { canonical: "/medya" },
};

const BIO_TEK =
  "Emre Topçu — One Team Global Presidential Diamond; doğrudan satışta ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir lider.";

const BIO_KISA =
  "Emre Topçu, 2013'te başladığı işte sekiz ayda Diamond, üç buçuk yılda Presidential Diamond oldu. Bugün 4 kıtada 250.000'e yakın kişilik bir müşteri ağının kurulmasına vesile olmuş; İstanbul'da yaşıyor ve iş insanlarına başarı koçluğu yapıyor. 'İlk 72 Saat' (2017) kitabının yazarı.";

const BASLIKLAR = ICERIK.tr.konusmalar.map((k) => k.baslik);

function Bolum({
  no,
  baslik,
  children,
}: {
  no: string;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-black/10 py-12">
      <div className="flex items-baseline gap-3">
        <span className="font-lux text-sm text-altin">{no}</span>
        <h2 className="font-lux text-2xl font-semibold tracking-tight md:text-3xl">
          {baslik}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function MedyaKiti() {
  return (
    <main className="min-h-[100dvh] bg-abanoz font-sahne text-fildisi">
      <header className="border-b border-black/10">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <a href="/" className="text-base font-semibold tracking-tight">
            Emre Topçu
          </a>
          <a
            href="/"
            className="text-sm text-duman transition-colors hover:text-altin"
          >
            ← Ana sayfa
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-medium tracking-[0.2em] text-altin uppercase">
          Medya Kiti
        </p>
        <h1 className="mt-4 font-lux text-4xl font-semibold tracking-tight md:text-6xl">
          Emre Topçu'yu sahneye davet edin
        </h1>
        <p className="mt-5 max-w-[54ch] text-lg text-duman">
          Etkinlik, panel veya röportaj için hazır malzemeler. Kopyalayın,
          indirin, kullanın.
        </p>

        <Bolum no="01" baslik="Portreler">
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { src: "/portre.jpg", ad: "Portre (renkli)" },
              { src: "/portre-duotone.webp", ad: "Portre (duotone)" },
            ].map((p) => (
              <figure key={p.src} className="group">
                <div className="overflow-hidden rounded-2xl border border-altin/20">
                  <Image
                    src={p.src}
                    alt={p.ad}
                    width={640}
                    height={800}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <figcaption className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-duman">{p.ad}</span>
                  <a
                    href={p.src}
                    download
                    className="font-medium text-altin underline-offset-2 hover:underline"
                  >
                    İndir
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </Bolum>

        <Bolum no="02" baslik="Biyografi (3 uzunluk)">
          <div className="space-y-8">
            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.15em] text-altin uppercase">
                Tek cümle
              </p>
              <p className="leading-relaxed text-fildisi/90">{BIO_TEK}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.15em] text-altin uppercase">
                Kısa
              </p>
              <p className="leading-relaxed text-fildisi/90">{BIO_KISA}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.15em] text-altin uppercase">
                Uzun
              </p>
              <div className="space-y-4 leading-relaxed text-fildisi/90">
                {ICERIK.tr.hakkimda.paragraflar.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </Bolum>

        <Bolum no="03" baslik="Konuşma başlıkları">
          <ul className="grid gap-3 sm:grid-cols-2">
            {BASLIKLAR.map((b) => (
              <li
                key={b}
                className="rounded-xl border border-black/10 bg-abanoz-2 px-4 py-3 text-fildisi/90"
              >
                {b}
              </li>
            ))}
          </ul>
        </Bolum>

        <Bolum no="04" baslik="İletişim ve davet">
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-altin px-6 py-3 font-medium text-fildisi"
            >
              WhatsApp'tan davet et
            </a>
            <a
              href={`mailto:${EPOSTA}`}
              className="rounded-full border border-altin/40 px-6 py-3 font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
            >
              {EPOSTA}
            </a>
          </div>
          <div className="mt-6 flex gap-5 text-sm text-duman">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-altin"
            >
              Instagram
            </a>
            <a
              href={YOUTUBE_KANAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-altin"
            >
              YouTube
            </a>
          </div>
        </Bolum>
      </div>
    </main>
  );
}
