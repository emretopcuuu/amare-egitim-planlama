import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

const t = tr.hata;

export const metadata = { title: "Bulunamadı — Liderlik Aynası" };

// #6 İnsanca 404: boş/teknik sayfa değil; sıcak mesaj + güvenli sonraki adım.
export default function Bulunamadi() {
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md p-5">
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-5xl">{t.bulunamadiSimge}</p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold leading-tight">
            {t.bulunamadiBaslik}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            {t.bulunamadiAciklama}
          </p>
          <Link
            href="/"
            className="btn-kor mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            {t.anaSayfa}
          </Link>
        </div>
      </div>
    </main>
  );
}
