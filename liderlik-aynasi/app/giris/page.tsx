import { Suspense } from "react";
import Link from "next/link";
import GirisForm from "./GirisForm";
import YaziBoyu from "@/components/YaziBoyu";
import { tr } from "@/lib/i18n/tr";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
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
        <div className="mt-6 w-full">
          <YaziBoyu />
        </div>
      </div>
    </main>
  );
}
