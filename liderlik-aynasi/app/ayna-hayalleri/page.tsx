import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cinsiyetNormalize } from "@/lib/kisiKimligi";
import { tr } from "@/lib/i18n/tr";
import AynaHayalleriVideo from "@/app/ayna-hayalleri/AynaHayalleriVideo";

const t = tr.pusula;

// Barkod ile kamp açıldıktan sonra, anasayfa açılmadan ÖNCE izlenen tek seferlik
// karşılama videosu ("Rüyasına Uyananlara - Ayna Hayalleri"). Cinsiyete göre
// kadın/erkek versiyon seçilir. /ac'taki mühür-açma mantığına DOKUNMUYOR —
// yalnız başarı ekranının "Devam" butonu buraya, buradaki de "/"e yönlendiriyor.
export default async function AynaHayalleriSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("camp_unlocked_at, cinsiyet")
    .eq("id", session.sub)
    .maybeSingle();

  // Kampı hiç açmamış biri buraya sapmasın (doğrudan link paylaşımı vs.).
  if (!kisi?.camp_unlocked_at) redirect("/ac");

  const cinsiyet = cinsiyetNormalize(kisi.cinsiyet);
  const videoSrc = cinsiyet === "kadin" ? "/videolar/ayna-hayalleri-kadin.mp4" : "/videolar/ayna-hayalleri-erkek.mp4";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-8 text-center">
      <AynaHayalleriVideo
        src={videoSrc}
        oynatBaslik={t.hosgeldinOynatBaslik}
        metin={t.hosgeldinMetin}
        devamDugme={t.hosgeldinDevamDugme}
      />
    </main>
  );
}
