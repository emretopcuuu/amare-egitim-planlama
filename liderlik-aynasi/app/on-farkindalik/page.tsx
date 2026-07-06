import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import { sonucOnerileri } from "@/lib/onFarkindalik";
import OnFarkindalikAkis from "./OnFarkindalikAkis";
import OnboardingRayi from "@/components/OnboardingRayi";
import OnKosulKapisi from "@/components/OnKosulKapisi";

export const metadata = { title: "Ön Farkındalık — Liderlik Aynası" };

// ÖN FARKINDALIK — Faz A (Katman 1). Akış sırasında Hedef'ten SONRA gelir;
// tamamlandıktan sonra gözden geçirmek için her zaman erişilebilir.
export default async function OnFarkindalikSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [{ data: yanitVeri }, { data: ofDurum }, { data: hedefDurum }] = await Promise.all([
    db
      .from("on_farkindalik_yanit")
      .select("madde_kod, deger_sayi, deger_metin")
      .eq("participant_id", session.sub),
    db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
    db.from("hedef").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
  ]);

  // ÖN KOŞUL: Hedef bitmeden ÖF'e (derin-linkle) girene nazik yön. Yalnız ÖF'e
  // HENÜZ başlamamış/bitirmemiş + Hedef'i mühürlememiş kişide fire eder; ÖF'ü
  // tamamlamış kişi her zaman içeri girebilir (gözden geçirme). Normal akış
  // zaten Pusula → Hedef → ÖF sırasını uyguluyor.
  if (!ofDurum?.tamamlandi_at && !hedefDurum?.tamamlandi_at) {
    return (
      <OnKosulKapisi
        baslik={tr.onKosul.hedefBaslik}
        metin={tr.onKosul.hedefMetin}
        dugmeMetin={tr.onKosul.hedefDugme}
        dugmeYol="/hedef"
      />
    );
  }

  const sayilar: Record<string, number> = {};
  const metinler: Record<string, string> = {};
  for (const r of yanitVeri ?? []) {
    if (r.deger_sayi !== null) sayilar[r.madde_kod] = r.deger_sayi;
    if (r.deger_metin !== null) metinler[r.madde_kod] = r.deger_metin;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+3.5rem+0.5rem)]">
        <OnboardingRayi />
      </div>
      <div className="mx-auto w-full max-w-md p-5">
        <OnFarkindalikAkis
          baslangicSayi={sayilar}
          baslangicMetin={metinler}
          oneri={sonucOnerileri(sayilar)}
        />
      </div>
    </main>
  );
}
