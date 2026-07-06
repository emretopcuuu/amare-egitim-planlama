import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipEttiklerim, takipDurum } from "@/lib/sozTakip";
import SahitlikPanel from "./SahitlikPanel";

export const metadata = { title: "Şahitliğin — Liderlik Aynası" };

// FAZ B — Şahit paneli. Lider, sözüne şahit olduğu kişileri takip eder; takılana
// dürtme/teşvik gönderir, gerekirse arar.
export default async function SahitlikSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  // [Şahitlik geliştirme #9] Önce kendi adımın — başkasını dürtmeden önce
  // şahidin kendi aynasına baksın.
  const [kisiler, kendiDurum] = await Promise.all([
    takipEttiklerim(db, session.sub),
    takipDurum(db, session.sub),
  ]);

  // [Şahitlik geliştirme #1 + #2] Foto + söz sesi — storage path'leri imzalı
  // URL'e çevrilir (client'a çıplak path sızmaz). N+1 ama şahit listesi küçük
  // (en fazla 5 kişi, TANIK_HEDEF).
  const kisilerZengin = await Promise.all(
    kisiler.map(async (k) => {
      const [fotoRes, sesRes] = await Promise.all([
        k.profilFotoPath
          ? db.storage.from("sesler").createSignedUrl(k.profilFotoPath, 3600)
          : Promise.resolve({ data: null }),
        k.sozSesPath
          ? db.storage.from("sesler").createSignedUrl(k.sozSesPath, 3600)
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...k,
        fotoUrl: fotoRes.data?.signedUrl ?? null,
        sozSesUrl: sesRes.data?.signedUrl ?? null,
      };
    })
  );

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <SahitlikPanel kisiler={kisilerZengin} kendiDurum={kendiDurum} />
    </main>
  );
}
