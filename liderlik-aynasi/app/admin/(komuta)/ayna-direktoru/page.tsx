import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import { aynaAniAdaylari } from "@/lib/aynaAniTetik";
import AynaDirektorKontrol from "./AynaDirektorKontrol";
import AynaAniTetik from "./AynaAniTetik";
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
  ] = await Promise.all([
    db
      .from("settings")
      .select("key, value")
      .in("key", ["ayna_aktif", "ayna_tempo", "sistem_modu"]),
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
  ]);
  if (error) throw error;

  // #3 Ayna Anı manuel tetik: kamp içi "gördün mü?" anına hazır adaylar.
  const aynaAniAdaylar = await aynaAniAdaylari(db);

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

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <AynaDirektorKontrol
          aktif={ayar.get("ayna_aktif") === "true"}
          tempo={ayar.get("ayna_tempo") ?? "surpriz"}
          mod={ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp"}
          aboneSayisi={aboneSayisi ?? 0}
          katilimciSayisi={katilimciSayisi ?? 0}
        />
      </section>

      {/* #3 Ayna Anı — kamp içi "gördün mü?" anını hazır adaylar için üret */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.aynaAniBaslik}</h2>
        <p className="mt-1 mb-4 text-sm text-slate-400">{t.aynaAniAciklama}</p>
        <AynaAniTetik adaylar={aynaAniAdaylar} />
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
    </main>
  );
}
