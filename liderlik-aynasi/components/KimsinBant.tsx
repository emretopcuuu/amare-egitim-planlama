import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Onboarding/Pusula/Kamp ekranlarında "kimin sayfasındayız" göstergesi.
// Üst-orta küçük bir bant; isim + (varsa) avatar. Aday akışında oryantasyon kaybını önler.
export default async function KimsinBant() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return null;

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name, profil_foto_path")
    .eq("id", session.sub)
    .maybeSingle();

  if (!kisi?.full_name) return null;

  let avatarUrl: string | null = null;
  if (kisi.profil_foto_path) {
    const { data } = await db.storage
      .from("sesler")
      .createSignedUrl(kisi.profil_foto_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  const ilkHarf = kisi.full_name.trim().charAt(0).toUpperCase();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-30 flex justify-center px-4 print:hidden">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/30 bg-midnight-card/85 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-md">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            aria-hidden
            className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-gold/40"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[0.7rem] font-bold text-gold-light ring-1 ring-gold/40"
          >
            {ilkHarf}
          </span>
        )}
        <span className="max-w-[55vw] truncate">{kisi.full_name}</span>
      </div>
    </div>
  );
}
