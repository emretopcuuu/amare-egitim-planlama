import { tr } from "@/lib/i18n/tr";

export const metadata = { title: "Kampın Nabzı — Liderlik Aynası" };

// Büyük ekran (TV) görünümü — login gerektirmez, Faz 5'te canlı veriye bağlanacak.
export default function EkranPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-lg font-medium uppercase tracking-[0.3em] text-royal-light">
        {tr.app.name}
      </p>
      <h1 className="text-5xl font-bold text-gold sm:text-7xl">
        {tr.ekran.baslik}
      </h1>
      <p className="mt-4 text-xl text-slate-400">{tr.ekran.yakinda}</p>
    </main>
  );
}
