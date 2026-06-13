import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import FotoModerasyon from "./FotoModerasyon";

export const metadata = { title: "Fotoğraf Moderasyonu — Liderlik Aynası" };

const t = tr.admin.fotoModerasyon;

export default async function FotoModerasyonPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const kova = db.storage.from("sesler");
  const { data: bekleyenler } = await db
    .from("photos")
    .select("id, path, caption, gonderen:participants!photos_participant_id_fkey(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const fotolar = await Promise.all(
    (bekleyenler ?? []).map(async (f) => {
      const { data } = await kova.createSignedUrl(f.path, 3600);
      return {
        id: f.id,
        url: data?.signedUrl ?? null,
        caption: f.caption,
        gonderen: f.gonderen?.full_name ?? "—",
      };
    })
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      <FotoModerasyon fotolar={fotolar} />
    </main>
  );
}
