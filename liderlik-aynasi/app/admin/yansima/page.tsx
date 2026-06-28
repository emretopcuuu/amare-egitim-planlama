import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sesYapilandirildiMi } from "@/lib/eleven";
import YansimaYukleyici from "./YansimaYukleyici";
import SesKlonPanel from "./SesKlonPanel";
import SesTemizlikPanel from "./SesTemizlikPanel";

export const metadata = { title: "Yansıma Videoları — Liderlik Aynası" };

// Önden üretilmiş kişisel yansıma videolarını katılımcılara bağlama paneli.
// Videolar kamp öncesi harici olarak (MCP) üretilir; burada her kişiye
// sesi gömülü tek mp4 yüklenir → QR sayfasında ('/yansiman') servis edilir.
export default async function YansimaYonetimPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [kayitlar, sesProf, klonSonuc] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, login_code, profil:voice_profiles(consent, video_status)")
      .eq("role", "participant")
      .order("full_name"),
    db
      .from("voice_profiles")
      .select("participant_id, status, updated_at, participants!inner(full_name)")
      .eq("status", "kayitli")
      .not("sample_path", "is", null),
    db
      .from("voice_profiles")
      .select("participant_id", { count: "exact", head: true })
      .eq("status", "klonlandi"),
  ]);

  // Klonlama bekleyenler
  const bekleyenSes = (sesProf.data ?? []).map((v) => {
    const p = Array.isArray(v.participants) ? v.participants[0] : v.participants;
    return {
      id: v.participant_id,
      ad: (p as { full_name: string } | null)?.full_name ?? "?",
      tarih: v.updated_at,
    };
  });

  // İstemciye yalnız şekillendirilmiş DTO (rater/target kimliği yok).
  const liste = (kayitlar.data ?? []).map((k) => {
    const p = Array.isArray(k.profil) ? k.profil[0] : k.profil;
    return {
      kod: k.login_code,
      ad: k.full_name,
      riza: p?.consent === true,
      durum: (p?.video_status ?? "yok") as string,
    };
  });

  const hazirSayisi = liste.filter((l) => l.durum === "hazir").length;
  const rizaliSayisi = liste.filter((l) => l.riza).length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">Yansıma Videoları</h1>
        <p className="mt-1 text-sm text-slate-400">
          Önden üretilmiş kişisel videoyu (sesi gömülü tek mp4) her katılımcıya
          bağla. Yalnız açık rıza vermiş kişilere yüklenir.{" "}
          <span className="text-slate-300">
            {hazirSayisi}/{rizaliSayisi} hazır
          </span>
          .
        </p>
      </div>

      <SesTemizlikPanel />

      <SesKlonPanel
        bekleyen={bekleyenSes}
        klonlandi={klonSonuc.count ?? 0}
        apiAcik={sesYapilandirildiMi()}
      />

      <YansimaYukleyici liste={liste} />
    </main>
  );
}
