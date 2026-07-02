import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import KampArkadasiCheckin from "./KampArkadasiCheckin";

export const metadata = { title: "İlk 10 Gün Raporu — Liderlik Aynası" };

// [3.2] 31 TEMMUZ MİNİ-ZİRVE — "İlk 10 Gün Raporu": söz→eylem, ilk redler
// (kutlama diliyle), streak, kamp arkadaşı durumu. Tek ekran, push ile açılır.
export default async function Rapor10GunPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const ad = session.ad.split(" ")[0];
  const [{ data: sonGorevler }, { count: redSayi }, { data: gruplar }] = await Promise.all([
    db.from("missions").select("status, scored_at").eq("participant_id", session.sub)
      .order("issued_at", { ascending: false }).limit(30),
    db.from("redler").select("id", { count: "exact", head: true }).eq("participant_id", session.sub),
    db.from("kamp_arkadasi").select("id, uyeler"),
  ]);

  // Söz→eylem: yolculuk döneminde tamamlanan görev sayısı (aksiyon proxy'si).
  const tamamlanan = (sonGorevler ?? []).filter((g) => g.status === "scored").length;
  // Streak: en yeniden geriye kesintisiz scored.
  let streak = 0;
  for (const g of sonGorevler ?? []) {
    if (g.status === "scored") streak++;
    else if (g.status === "expired") break;
  }

  // Kamp arkadaşı grubu + bugünkü check-in.
  const grup = (gruplar ?? []).find((g) => ((g.uyeler as string[]) ?? []).includes(session.sub));
  let arkadasAdlari: string[] = [];
  let bugunCheckin = false;
  if (grup) {
    const digerIdler = ((grup.uyeler as string[]) ?? []).filter((u) => u !== session.sub);
    const [{ data: kisiler }, { data: bugunku }] = await Promise.all([
      db.from("participants").select("id, full_name").in("id", digerIdler),
      (async () => {
        const gunBasi = new Date();
        gunBasi.setHours(0, 0, 0, 0);
        return db.from("kamp_arkadasi_checkin").select("id")
          .eq("arkadaslik_id", grup.id).eq("participant_id", session.sub)
          .gte("created_at", gunBasi.toISOString()).maybeSingle();
      })(),
    ]);
    arkadasAdlari = (kisiler ?? []).map((k) => k.full_name.split(" ")[0]);
    bugunCheckin = !!bugunku;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🏔️ İlk 10 Gün</h1>
          <p className="mt-1 text-sm text-slate-400">{ad}, kamptan bu yana yol aldın. İşte küçük zirven.</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-4 text-center">
            <p className="font-mono text-3xl font-bold text-gold">{tamamlanan}</p>
            <p className="mt-0.5 text-xs text-slate-400">tamamlanan adım</p>
          </div>
          <div className="rounded-2xl border border-orange-400/25 bg-orange-500/[0.06] p-4 text-center">
            <p className="font-mono text-3xl font-bold text-orange-300">{redSayi ?? 0}</p>
            <p className="mt-0.5 text-xs text-slate-400">cesur {`"hayır"`}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-center">
            <p className="font-mono text-3xl font-bold text-emerald-300">{streak}</p>
            <p className="mt-0.5 text-xs text-slate-400">seri</p>
          </div>
        </div>

        {(redSayi ?? 0) > 0 && (
          <p className="rounded-2xl border border-orange-400/20 bg-midnight-card/50 p-4 text-sm leading-relaxed text-orange-200/90">
            🔥 {redSayi} kez {`"hayır"`} duydun — bu, sahada olduğunun kanıtı. Red = veri, kimlik değil. Avcı değil, fayda taşıyıcısısın.
          </p>
        )}

        {grup && (
          <div className="rounded-2xl border border-royal-light/25 bg-midnight-card/60 p-4">
            <p className="text-sm font-semibold text-gold-light">🤝 Kamp arkadaşın</p>
            <p className="mt-1 text-sm text-slate-300">
              {arkadasAdlari.length > 0 ? arkadasAdlari.join(" ve ") : "atandı"} — bu hafta 10 dakika aramayı unutmayın.
            </p>
            <KampArkadasiCheckin bugunYapildi={bugunCheckin} />
          </div>
        )}
      </div>
    </main>
  );
}
