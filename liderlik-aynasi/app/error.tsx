"use client";

import { useEffect } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

const t = tr.hata;

// #6 İnsanca hata ekranı: teknik yığın izi yerine sıcak, markalı tek mesaj +
// tek büyük çözüm butonu ("Tekrar dene") ve güvenli çıkış ("Ana sayfa").
export default function Hata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Geliştirici görsün; kullanıcı asla teknik metin görmez.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md p-5">
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-5xl">{t.simge}</p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.aciklama}</p>
          <button
            onClick={() => reset()}
            className="btn-kor mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            {t.tekrar}
          </button>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {t.anaSayfa}
          </Link>
        </div>
      </div>
    </main>
  );
}
