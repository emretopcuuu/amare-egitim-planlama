import { Suspense } from "react";
import GirisForm from "./GirisForm";
import PrizmaArkaplan from "@/components/prizma/PrizmaArkaplan";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
  return (
    <main className="evren-prizma flex min-h-screen flex-1 items-center justify-center overflow-hidden p-6">
      <PrizmaArkaplan adet={24} />
      <Suspense>
        <GirisForm />
      </Suspense>
    </main>
  );
}
