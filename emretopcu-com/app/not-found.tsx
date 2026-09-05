import Link from "next/link";

// Markalı 404 — kırık linki bile bir başlangıca çevirir.
export default function BulunamadiSayfasi() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-abanoz px-6 font-sahne text-fildisi">
      <div className="max-w-xl text-center">
        <p className="font-lux text-7xl text-altin/40 md:text-8xl">404</p>
        <h1 className="mt-6 font-lux text-3xl font-semibold tracking-tight md:text-5xl">
          Bu sayfa yok.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-duman">
          Ama hikâye burada başlıyor olabilir. Aradığın sayfa taşınmış ya da hiç
          var olmamış — önemli olan bundan sonra nereye gideceğin.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi transition-transform active:scale-[0.98]"
          >
            Ana sayfa
          </Link>
          <Link
            href="/dusunuyorum"
            className="rounded-full border border-altin/40 px-7 py-3.5 font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
          >
            2 dakikalık teste başla
          </Link>
        </div>
        <p className="mt-8 text-sm text-duman" lang="en">
          Page not found — <Link href="/en" className="text-altin underline-offset-2 hover:underline">continue in English</Link>.
        </p>
      </div>
    </main>
  );
}
