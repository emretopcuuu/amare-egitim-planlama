import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unvanBul } from "@/lib/kivilcim";
import { ZORLUK_ETIKETI, type Zorluk } from "@/lib/davranis";
import { haftaBaslangici } from "@/lib/momentum";
import { tr } from "@/lib/i18n/tr";
import GorevYanitFormu from "./GorevYanitFormu";
import SesCal from "@/components/SesCal";

export const metadata = { title: "AYNA'nın Görevleri — Liderlik Aynası" };

const t = tr.gorevler;

// Tür rozetleri: her görev türünün kendi rengi var — listede tarayınca ayırt edilir
const TUR_RENK: Record<string, string> = {
  gozlem: "bg-royal/30 text-royal-light",
  cesaret: "bg-orange-500/20 text-orange-300",
  yansima: "bg-emerald-500/20 text-emerald-300",
  gizli: "bg-fuchsia-500/20 text-fuchsia-300",
  tahmin: "bg-sky-500/20 text-sky-300",
  soz: "bg-gold/20 text-gold-light",
};

function saatYaz(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function GorevlerPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: gorevler, error } = await db
    .from("missions")
    .select(
      "id, kind, title, body, status, due_at, response_text, ai_score, ai_comment, spark_points, voice_path, difficulty"
    )
    .eq("participant_id", session.sub)
    .order("issued_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const aktif = (gorevler ?? []).filter((g) => g.status === "pending");
  const gecmis = (gorevler ?? []).filter((g) => g.status !== "pending");

  // YANSIMAN fısıltıları: aktif görevlerin ses dosyalarına kısa ömürlü imzalı URL
  const sesUrller = new Map<string, string>();
  for (const g of aktif) {
    if (!g.voice_path) continue;
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(g.voice_path, 3600);
    if (imzali) sesUrller.set(g.id, imzali.signedUrl);
  }
  // Haftalık Momentum (varsa) — davranış eğilimi katılımcıya da görünür
  const { data: momentum } = await db
    .from("momentum_scores")
    .select("score")
    .eq("participant_id", session.sub)
    .eq("week_start", haftaBaslangici(new Date()))
    .maybeSingle();

  const toplamKivilcim = (gorevler ?? [])
    .filter((g) => g.status === "scored")
    .reduce((top, g) => top + g.spark_points, 0);
  const unvan = unvanBul(toplamKivilcim);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-6 p-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
            🤖 AYNA
          </p>
          <h1 className="font-display altin-metin mt-1 text-3xl font-bold leading-tight">{t.baslik}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.altBaslik}</p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          {tr.degerlendir.anaSayfayaDon}
        </Link>
      </header>

      {/* Kıvılcım durumu */}
      <section className="parilti kart-cerceve rounded-2xl bg-gradient-to-br from-gold/15 to-midnight-card/60 p-5 ring-1 ring-gold/30 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gold">
              {tr.kivilcim.toplam(toplamKivilcim)}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {tr.kivilcim.unvanin}:{" "}
              <span className="font-semibold text-gold-light">{unvan.mevcut.ad}</span>
            </p>
            {momentum && (
              <p className="mt-1 text-sm font-semibold text-emerald-300">
                {t.momentumSatiri(momentum.score)}
              </p>
            )}
          </div>
          <p className="max-w-[10rem] text-right text-xs text-slate-400">
            {unvan.sonraki
              ? tr.kivilcim.sonrakiUnvan(unvan.sonraki.ad, unvan.kalan)
              : tr.kivilcim.zirve}
          </p>
        </div>
        {unvan.sonraki && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold"
              style={{
                width: `${Math.min(100, (toplamKivilcim / unvan.sonraki.esik) * 100)}%`,
              }}
            />
          </div>
        )}
      </section>

      {/* Aktif görev(ler) */}
      {aktif.length === 0 ? (
        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 text-center ring-1 ring-royal/30 backdrop-blur">
          <p className="text-sm text-slate-300">{t.aktifYok}</p>
        </section>
      ) : (
        aktif.map((g) => (
          <section
            key={g.id}
            className="altin-nabiz relative overflow-hidden kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/40 backdrop-blur"
          >
            <span className="altin-tel" />
            <div className="flex items-center justify-between text-xs">
              <span
                className={`rounded-md px-2 py-0.5 font-medium ${TUR_RENK[g.kind] ?? "bg-royal/30 text-royal-light"}`}
              >
                {t.turler[g.kind as keyof typeof t.turler] ?? g.kind}
              </span>
              <span className="font-medium text-amber-400">
                ⏳ {t.sonTarih(saatYaz(g.due_at))}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-sky-200">
              {ZORLUK_ETIKETI[(g.difficulty as Zorluk) ?? 2]}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-snug text-gold-light">{g.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-200">
              {g.body}
            </p>
            {sesUrller.has(g.id) && (
              <SesCal
                url={sesUrller.get(g.id)!}
                etiket={g.kind === "simulasyon" ? t.dinleItiraz : t.dinle}
              />
            )}
            <GorevYanitFormu gorevId={g.id} />
          </section>
        ))
      )}

      {/* Geçmiş */}
      <section>
        <h2 className="text-lg font-semibold text-gold-light">{t.gecmisBaslik}</h2>
        {gecmis.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.gecmisYok}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {gecmis.map((g) => (
              <li
                key={g.id}
                className={`kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 backdrop-blur ${
                  g.status === "expired" ? "opacity-60 ring-royal/20" : "ring-royal/30"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span
                    className={`rounded-md px-2 py-0.5 font-medium ${TUR_RENK[g.kind] ?? "text-slate-400"}`}
                  >
                    {t.turler[g.kind as keyof typeof t.turler] ?? g.kind}
                  </span>
                  {g.status === "scored" && g.ai_score !== null ? (
                    <span className="font-bold text-gold">
                      {t.puanin(g.ai_score)} · +{g.spark_points} ⚡
                    </span>
                  ) : g.status === "scored" ? (
                    <span className="font-bold text-gold">+{g.spark_points} ⚡</span>
                  ) : (
                    <span className="text-slate-500">
                      {t.durumlar[g.status as keyof typeof t.durumlar]}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-100">{g.title}</p>
                {g.ai_comment && (
                  <p className="mt-2 rounded-xl bg-midnight-soft p-3 text-sm italic text-slate-300">
                    “{g.ai_comment}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </main>
  );
}
