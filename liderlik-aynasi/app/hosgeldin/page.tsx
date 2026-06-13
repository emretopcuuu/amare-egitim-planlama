import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { tr } from "@/lib/i18n/tr";
import Konfeti from "@/components/Konfeti";

export const metadata = { title: "Hoş geldin — Liderlik Aynası" };

const t = tr.hosgeldin;

// Kendini puanladıktan SONRA, değerlendirme hub'ına geçmeden önce gösterilen
// kutlama + kamp deneyimi bilgilendirmesi. İlk kez kullananlara teker teker
// ne yaşayacaklarını anlatır. Mobil öncelikli: tek ekran, büyük yazı, akıcı.
export default async function HosGeldinPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <Konfeti anahtar="kutlama-hosgeldin" />
      <div className="mx-auto my-auto w-full max-w-md px-5 py-5">
        <div className="kart-cam relative overflow-hidden rounded-3xl p-6">
          <div className="text-center">
            <p className="text-4xl">🎉</p>
            <p className="prizma-serif mt-2 text-xs uppercase tracking-[0.4em] text-emerald-300">
              {t.rozet}
            </p>
            <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold leading-tight">
              {t.baslik(session.ad)}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-slate-200">
              {t.altBaslik}
            </p>
          </div>

          <div className="mt-5 space-y-3 text-[0.95rem] leading-relaxed text-slate-300">
            <p>{t.paragraf1}</p>
            <p>{t.paragraf2}</p>
            <p>{t.paragraf3}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-royal-light">
              {t.nelerBaslik}
            </p>
            <ul className="mt-2 space-y-2 text-[0.95rem] text-slate-100">
              <li>{t.madde1}</li>
              <li>{t.madde2}</li>
              <li>{t.madde3}</li>
            </ul>
          </div>

          <Link
            href="/degerlendir"
            className="parilti btn-kor mt-6 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold transition-transform hover:scale-[1.01]"
          >
            {t.basla}
          </Link>
        </div>
      </div>
    </main>
  );
}
