import { Suspense } from "react";
import GirisForm from "./GirisForm";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center overflow-hidden p-6">
      <Suspense>
        <GirisForm />
      </Suspense>
    </main>
  );
}
