import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;

// Oda QR açılışı: kampa fiziksel giriş anı. QR, kamp_kilit_kodu'nu taşır;
// doğruysa oturum sahibinin camp_unlocked_at'i mühürlenir → sistem devamlılığı
// başlar. Boş kod = kilit yapılandırılmamış, açma reddedilir.
export default async function AcSayfa({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const { k } = await searchParams;
  const db = supabaseAdmin();
  const { data: kilit } = await db
    .from("settings")
    .select("value")
    .eq("key", "kamp_kilit_kodu")
    .maybeSingle();
  const dogruKod = (kilit?.value ?? "").trim();

  if (dogruKod && k && k.trim() === dogruKod) {
    await db
      .from("participants")
      .update({ camp_unlocked_at: new Date().toISOString() })
      .eq("id", session.sub)
      .is("camp_unlocked_at", null);
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="kart-cam max-w-md rounded-3xl p-10">
        <p className="text-5xl" aria-hidden>
          🔒
        </p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
          {t.acHataBaslik}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.acHataMetin}</p>
        <Link
          href="/"
          className="btn-kor mt-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold"
        >
          {tr.degerlendir.anaSayfayaDon}
        </Link>
      </div>
    </main>
  );
}
