import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import KariyerSenkron from "./KariyerSenkron";

export const metadata = { title: "Kariyer Senkron — Liderlik Aynası" };

// [E12] İŞ VERİSİ KÖPRÜSÜ — kariyer seviyelerini dış kaynaktan (amare) ya da CSV ile
// senkronla. Yalnız YÜKSELİŞ uygulanır; atlayan kişiye kutlama push'u gider.
export default async function KariyerSenkronPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");
  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🏅 Kariyer Senkron</h1>
        <p className="mt-1 text-sm text-slate-400">
          Katılımcı kariyer seviyelerini dış kaynaktan çek. Yalnız <b>kariyer seviyesi</b> + telefon/e-posta eşleşmesi
          taşınır; başka veri gelmez. Sadece <b>yükseliş</b> uygulanır, atlayan kişiye kutlama gider.
        </p>
      </div>
      <KariyerSenkron />
    </main>
  );
}
