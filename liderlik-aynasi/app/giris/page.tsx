import { Suspense } from "react";
import GirisForm from "./GirisForm";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <GirisForm />
      </Suspense>
    </main>
  );
}
