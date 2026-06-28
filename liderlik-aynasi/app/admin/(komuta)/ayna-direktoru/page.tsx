import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import AynaDirektorKontrol from "./AynaDirektorKontrol";
import SonGorevler from "./SonGorevler";
import Ipucu from "../../Ipucu";
import Katlanir from "../../Katlanir";

export const metadata = { title: "AYNA Kontrol Odası — Liderlik Aynası" };

const t = tr.admin.aynaDirektor;

export default async function AynaDirektorPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    { data: ayarlar },
    { count: aboneSayisi },
    { count: katilimciSayisi },
    { data: sonGorevler, error },
    { data: grupOdevler },
  ] = await Promise.all([
    db
      .from("settings")
      .select("key, value")
      .in("key", ["ayna_aktif"]),
    db.from("push_subscriptions").select("id", { count: "exact", head: true }),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db
      .from("missions")
      .select(
        "id, kind, title, body, status, ai_score, ai_comment, spark_points, difficulty, response_text, issued_at, trait:traits(name), katilimci:participants!missions_participant_id_fkey(full_name)"
      )
      .order("issued_at", { ascending: false })
      .limit(20),
    // AYNA'nın otomatik ürettiği aktif grup ödevleri (takım × tip)
    db
      .from("grup_odev")
      .select("takim, tip, baslik, govde, hedef, created_at")
      .eq("aktif", true)
      .order("takim"),
  ]);
  if (error) throw error;

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
          <Ipucu {...tr.admin.yardim.aynaDirektor} />
        </div>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      {/* Prova Kampı — gerçek kişilerle hızlandırılmış 3 günlük kamp provası */}
      <Link
        href="/admin/prova"
        className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-5 transition-colors hover:bg-gold/15"
      >
        <div>
          <p className="text-base font-bold text-gold-light">🎭 Prova Kampı (canlı tatbikat)</p>
          <p className="mt-0.5 text-sm text-slate-300">
            Gerçek kişilerle 3 günü hızlandırılmış yaşat — başlat, gün gün ilerlet, akışı izle.
          </p>
        </div>
        <span className="shrink-0 text-2xl text-gold-light">→</span>
      </Link>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <AynaDirektorKontrol
          aktif={ayar.get("ayna_aktif") === "true"}
          aboneSayisi={aboneSayisi ?? 0}
          katilimciSayisi={katilimciSayisi ?? 0}
        />
      </section>

      <Katlanir baslik={t.akisBaslik} ikon="📜" yardim={tr.admin.yardim.aynaAkis}>
        <SonGorevler
          gorevler={(sonGorevler ?? []).map((g) => ({
            id: g.id,
            kisi: g.katilimci.full_name,
            baslik: g.title,
            tur: g.kind,
            durum: g.status,
            puan: g.ai_score,
            kivilcim: g.spark_points,
            govde: g.body,
            yanit: g.response_text,
            aiYorum: g.ai_comment,
            zorluk: g.difficulty,
            ozellik: g.trait?.name ?? null,
            tarih: g.issued_at,
          }))}
        />
      </Katlanir>

      {/* AYNA'nın otomatik ürettiği grup ödevleri — takıma göre */}
      <Katlanir baslik="🤝 Grup Ödevleri" aciklama="AYNA'nın gruplara otomatik ürettiği ortak ödevler" ikon="🤝">
        {(grupOdevler ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">
            Henüz grup ödevi yok — takımlar oluşup Ön Farkındalık profilleri dolunca AYNA kendiliğinden üretir.
          </p>
        ) : (
          <ul className="space-y-2">
            {(grupOdevler ?? []).map((o, i) => (
              <li key={i} className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                <p className="text-xs font-medium text-gold-light/80">
                  {o.takim} · {o.tip === "grup_birlikte" ? "🔗 Grup-birlikte" : "🤝 Grup-içi"}
                  {o.hedef ? ` · ${o.hedef}` : ""}
                </p>
                <p className="mt-1 font-semibold text-slate-100">{o.baslik}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{o.govde}</p>
              </li>
            ))}
          </ul>
        )}
      </Katlanir>
    </main>
  );
}
