import { Suspense } from "react";
import GirisForm from "./GirisForm";

export const metadata = { title: "Giriş — Liderlik Aynası" };

export default function GirisPage() {
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-sm flex-col items-center p-5">
        <Suspense>
          <GirisForm />
        </Suspense>
      </div>
    </main>
  );
}
