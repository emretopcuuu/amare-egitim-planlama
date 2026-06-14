import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { higgsYapilandirildiMi } from "@/lib/higgs";
import { tr } from "@/lib/i18n/tr";
import CanliAynaYonetim from "./CanliAynaYonetim";

export const metadata = { title: "Canlı Ayna — Liderlik Aynası" };

const t = tr.admin.canliAyna;
const ACI_SIRA = ["duz", "sag", "sol"];

type YuzKare = { aci: string; path: string };

export default async function CanliAynaAdminPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data: katilimcilar } = await db
    .from("participants")
    .select("id, full_name, profil_foto_path, yuz_fotolari")
    .eq("role", "participant")
    .order("full_name");

  // Sadece Canlı Ayna karesi olanlar
  const ilgili = (katilimcilar ?? [])
    .map((k) => {
      const kareler = (Array.isArray(k.yuz_fotolari) ? (k.yuz_fotolari as YuzKare[]) : [])
        .filter((x) => x && typeof x.path === "string")
        .slice()
        .sort((a, b) => ACI_SIRA.indexOf(a.aci) - ACI_SIRA.indexOf(b.aci));
      return { ...k, kareler };
    })
    .filter((k) => k.kareler.length > 0);

  // Tüm yolları tek seferde imzala (verimlilik)
  const tumYollar = ilgili.flatMap((k) => [
    ...(k.profil_foto_path ? [k.profil_foto_path] : []),
    ...k.kareler.map((x) => x.path),
  ]);
  const imzaHarita = new Map<string, string>();
  if (tumYollar.length > 0) {
    const { data: imzalilar } = await db.storage
      .from("sesler")
      .createSignedUrls(tumYollar, 3600);
    for (const im of imzalilar ?? []) {
      if (im.path && im.signedUrl) imzaHarita.set(im.path, im.signedUrl);
    }
  }

  // Video durumları
  const durumHarita = new Map<string, string>();
  const idler = ilgili.map((k) => k.id);
  if (idler.length > 0) {
    const { data: profiller } = await db
      .from("voice_profiles")
      .select("participant_id, video_status")
      .in("participant_id", idler);
    for (const p of profiller ?? []) durumHarita.set(p.participant_id, p.video_status);
  }

  const kisiler = ilgili.map((k) => ({
    id: k.id,
    ad: k.full_name,
    selfie: k.profil_foto_path ? imzaHarita.get(k.profil_foto_path) ?? null : null,
    kareler: k.kareler
      .map((x) => ({ aci: x.aci, url: imzaHarita.get(x.path) ?? "" }))
      .filter((x) => x.url),
    tam: !!k.profil_foto_path && k.kareler.length >= 3,
    durum: durumHarita.get(k.id) ?? "yok",
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      {!higgsYapilandirildiMi() && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          ⚠️ {t.higgsKapali}
        </p>
      )}
      {kisiler.length === 0 ? (
        <p className="rounded-2xl bg-midnight-card/40 p-6 text-sm text-slate-400 ring-1 ring-royal/20">
          {t.yok}
        </p>
      ) : (
        <CanliAynaYonetim kisiler={kisiler} uretimAcik={higgsYapilandirildiMi()} />
      )}
    </main>
  );
}
