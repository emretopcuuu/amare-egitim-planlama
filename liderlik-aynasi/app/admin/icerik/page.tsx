import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import IcerikStudyo from "./IcerikStudyo";

export const metadata = { title: "İçerik Stüdyosu — Liderlik Aynası" };

const t = tr.admin.icerik;

// GELİŞTİRME #10 (2.tur): İçerik Stüdyosu — admin koda dokunmadan AYNA'nın
// tonunu ve günün temasını ayarlar; AYNA üretimine canlı yansır.
export default async function IcerikPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ayna_ek_ton", "gunun_temasi", "gunun_cumlesi", "ders_kavrami"]);
  const harita = new Map((data ?? []).map((s) => [s.key, s.value]));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      <IcerikStudyo
        ekTon={harita.get("ayna_ek_ton") ?? ""}
        gununTemasi={harita.get("gunun_temasi") ?? ""}
        gununCumlesi={harita.get("gunun_cumlesi") ?? ""}
        dersKavrami={harita.get("ders_kavrami") ?? ""}
      />
    </main>
  );
}
