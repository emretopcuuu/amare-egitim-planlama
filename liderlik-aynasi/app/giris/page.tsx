import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { guvenliNext } from "@/lib/guvenliNext";
import GirisForm from "./GirisForm";
import YaziBoyu from "@/components/YaziBoyu";
import TemaSecimi from "@/components/TemaSecimi";
import { tr } from "@/lib/i18n/tr";

export const metadata = { title: "Giriş — Liderlik Aynası" };

// Aday tekrar kod girmesin: oturum hâlâ geçerliyse (ve QR'dan yeni bir kod
// gelmiyorsa) doğruca içeri al. Yalnız farklı bir kod paylaşımı formu açar.
export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ kod?: string; next?: string }>;
}) {
  const { kod, next } = await searchParams;
  if (!kod) {
    const session = await getSession();
    if (session) {
      // Oturum varsa: katılımcı geldiği hedefe (next), admin paneline döner.
      const hedef =
        session.rol === "participant" ? guvenliNext(next) ?? "/" : "/admin";
      redirect(hedef);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-sm flex-col items-center p-5">
        <Suspense>
          <GirisForm />
        </Suspense>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
          {tr.kvkk.girisNot}{" "}
          <Link
            href="/gizlilik"
            className="text-royal-light underline underline-offset-2 hover:text-slate-200"
          >
            {tr.kvkk.girisLink}
          </Link>
        </p>
        <div className="mt-6 w-full space-y-3">
          <YaziBoyu />
          <TemaSecimi />
        </div>
      </div>
    </main>
  );
}
