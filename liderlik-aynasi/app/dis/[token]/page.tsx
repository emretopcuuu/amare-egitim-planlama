import { supabaseAdmin } from "@/lib/supabase/server";
import { tokenDogrula, DIS_SORULAR } from "@/lib/eylulDis";
import DisForm from "./DisForm";

export const metadata = { title: "Kısa Değerlendirme — Liderlik Aynası" };
export const revalidate = 0;

// [E11] DIŞ DEĞERLENDİRİCİ — OTURUMSUZ public sayfa. Jeton geçerliyse kişinin
// adını + kısa formu gösterir. Giriş/kayıt istemez; kimlik toplamaz (anonim).
export default async function DisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const kontrol = await tokenDogrula(supabaseAdmin(), token);

  if (!kontrol.gecerli) {
    const mesaj =
      kontrol.sebep === "kullanildi"
        ? "Bu bağlantı zaten kullanıldı. Teşekkürler 🙏"
        : kontrol.sebep === "suresi"
          ? "Bu bağlantının süresi doldu."
          : "Bağlantı geçersiz.";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl" aria-hidden>🪞</p>
        <p className="mt-4 max-w-sm text-slate-300">{mesaj}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🪞 Kısa Değerlendirme</h1>
          <p className="mt-1 text-sm text-slate-400">
            <span className="text-gold-light">{kontrol.ad}</span> gelişim yolculuğunda senin dürüst gözünü istiyor.
            2 dakika sürer, isim istemez.
          </p>
        </header>
        <DisForm token={token} ad={kontrol.ad ?? "Bu kişi"} sorular={DIS_SORULAR.map((s) => ({ ...s }))} />
      </div>
    </main>
  );
}
