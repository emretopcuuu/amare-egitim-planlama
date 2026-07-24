import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ICERIK, WHATSAPP_URL } from "@/lib/icerik";

const SOZLER = ICERIK.tr.sozler;

export function generateStaticParams() {
  return SOZLER.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = SOZLER.find((x) => x.slug === slug);
  if (!s) return {};
  const baslik = `"${s.soz}" — Emre Topçu`;
  return {
    title: baslik,
    description: s.arka,
    alternates: { canonical: `/soz/${slug}` },
    openGraph: {
      title: baslik,
      description: s.arka,
      url: `https://emretopcu.ai/soz/${slug}`,
      images: [{ url: `/soz/${slug}.png`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`/soz/${slug}.png`] },
  };
}

export default async function SozSayfa({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = SOZLER.find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-abanoz px-6 py-20 text-center font-sahne text-fildisi">
      <p className="mb-10 text-sm font-medium tracking-[0.2em] text-altin uppercase">
        Emre Topçu
      </p>
      <blockquote className="max-w-[20ch] font-lux text-4xl leading-[1.15] font-semibold tracking-tight md:text-6xl">
        <span className="text-altin/40">“</span>
        {s.soz}
        <span className="text-altin/40">”</span>
      </blockquote>
      <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-duman">
        {s.arka}
      </p>
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi"
        >
          Benimle çalış
        </a>
        <a
          href="/"
          className="text-sm text-duman underline-offset-2 hover:text-altin hover:underline"
        >
          emretopcu.ai
        </a>
      </div>
    </main>
  );
}
