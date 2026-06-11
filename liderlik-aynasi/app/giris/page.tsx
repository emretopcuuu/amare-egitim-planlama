import { Suspense } from "react";
import GirisForm from "./GirisForm";
import GolArkaplan from "@/components/gol/GolArkaplan";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
  return (
    <main className="evren-gol flex min-h-screen flex-1 items-center justify-center overflow-hidden p-6">
      <GolArkaplan />
      <Suspense>
        <GirisForm />
      </Suspense>
    </main>
  );
}
