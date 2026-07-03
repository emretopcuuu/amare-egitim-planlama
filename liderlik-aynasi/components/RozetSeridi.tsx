import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rozetleriGetir } from "@/lib/rozet";

// [KURULUM 7/8] Kimlik başlığının altında kazanılan rozetler + El Ele girişi.
// Kurulum motive edici olsun: İlk Işık/El Ele burada parlar. Kendi verisini
// çeker (OnboardingRayi deseni) → home page tek satır ekler.
export default async function RozetSeridi() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return null;

  const db = supabaseAdmin();
  const [rozetler, { count: pushSayisi }] = await Promise.all([
    rozetleriGetir(db, session.sub),
    db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("participant_id", session.sub),
  ]);
  const pushVar = (pushSayisi ?? 0) > 0;
  const elEleVar = rozetler.some((r) => r.kod === "el_ele");

  // Hiç rozet yok ve push da yoksa: bu şerit gürültü — gizle (bildirim kartı
  // zaten ayrı yerde kişiyi kuruluma çağırıyor).
  if (rozetler.length === 0 && !pushVar) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/20 bg-white/[0.02] p-3">
      {rozetler.map((r) => (
        <span
          key={r.kod}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-sm font-semibold text-gold-light"
        >
          {r.ikon} {r.ad}
        </span>
      ))}
      {/* Push var ama henüz el ele tutuşmadıysa: komşunu doğrulamaya çağır. */}
      {pushVar && !elEleVar && (
        <Link
          href="/el-ele"
          className="inline-flex items-center gap-1 rounded-full border border-royal-light/40 bg-royal/15 px-2.5 py-1 text-sm font-semibold text-royal-light transition-colors hover:bg-royal/25"
        >
          🤝 Yanındakiyle el ele →
        </Link>
      )}
    </div>
  );
}
