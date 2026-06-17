import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaCekirdek } from "@/lib/pusula";
import { raporHesapla } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import MudahaleKonsolu from "./MudahaleKonsolu";

export const metadata = { title: "Katılımcı 360° — Liderlik Aynası" };

const t = tr.admin.kisi360;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};

function p1(n: number | null): string {
  return n === null ? "—" : n.toFixed(1);
}

// GELİŞTİRME #1 (yeni tur): Tekil Katılımcı 360° Komuta Kartı — admin bir adayı
// tek ekranda derinlemesine görür: Pusula, Ön Farkındalık, görev geçmişi, momentum,
// kayma, öz/dış aynalar, Ekip Aynası, takdir. Yalnız admin; tüm veriye erişir.
export default async function Kisi360Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name, team, city, phone, login_code, camp_unlocked_at, consent_at")
    .eq("id", id)
    .eq("role", "participant")
    .maybeSingle();
  if (!kisi) notFound();

  const [
    cekirdek,
    { data: ofRow },
    rapor,
    { data: momentumlar },
    { data: churn },
    { data: gorevler },
    { data: ozM },
    { data: disler },
    { count: takdirSayi },
  ] = await Promise.all([
    pusulaCekirdek(db, id),
    db.from("on_farkindalik").select("profil, tamamlandi_at").eq("participant_id", id).maybeSingle(),
    raporHesapla(db, id),
    db.from("momentum_scores").select("score, week_start").eq("participant_id", id).order("week_start", { ascending: false }).limit(2),
    db.from("churn_radar").select("nudged_at, admin_alerted_at, updated_at").eq("participant_id", id).maybeSingle(),
    db.from("missions").select("title, kind, status, ai_score, spark_points, issued_at").eq("participant_id", id).order("issued_at", { ascending: false }).limit(8),
    db.from("mini360_oz").select("m1,m2,m3,m4,m5,m6").eq("participant_id", id).maybeSingle(),
    db.from("mini360_dis").select("m1,m2,m3,m4,m5,m6").eq("target_id", id),
    db.from("kudos").select("id", { count: "exact", head: true }).eq("to_id", id).eq("is_hidden", false),
  ]);

  const profil = (ofRow?.profil ?? null) as {
    katman1?: { enZayif?: string | null; bloklar?: { ad: string; puan: number; bant: string }[] };
    katman3?: { ritim?: string };
    guven?: { dusukVaryans?: boolean; stdev?: number };
  } | null;

  const m360ort = (satir: Record<string, number | null> | null | undefined): number | null => {
    if (!satir) return null;
    const v = ["m1", "m2", "m3", "m4", "m5", "m6"].map((k) => satir[k]).filter((x): x is number => typeof x === "number");
    return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)) : null;
  };
  const ozOrt = m360ort(ozM as Record<string, number | null> | null);
  const disHam = (disler ?? []).map((d) => m360ort(d as Record<string, number | null>)).filter((x): x is number => x !== null);
  const disOrt = disHam.length ? Number((disHam.reduce((a, b) => a + b, 0) / disHam.length).toFixed(1)) : null;

  const momentum = momentumlar?.[0]?.score ?? null;
  const momentumOnce = momentumlar?.[1]?.score ?? null;
  const sonEtkinlik = churn?.updated_at ?? null;
  const saatGec = sonEtkinlik ? Math.round((Date.now() - new Date(sonEtkinlik).getTime()) / 3_600_000) : null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/admin/katilimcilar" className="text-xs text-slate-400 hover:text-slate-200">← {t.geri}</Link>
          <h1 className="prizma-serif ay-metin text-2xl font-bold">{kisi.full_name}</h1>
          <p className="text-sm text-slate-400">
            {[kisi.team, kisi.city, `kod ${kisi.login_code}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${kisi.camp_unlocked_at ? "bg-emerald-400/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
            {kisi.camp_unlocked_at ? t.kampta : t.kampDisi}
          </span>
          {ofRow?.tamamlandi_at && <span className="rounded-full bg-royal/20 px-2.5 py-1 font-medium text-royal-light">ÖF ✓</span>}
        </div>
      </div>

      {/* Üst metrik şeridi */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrik etiket={t.momentum} deger={momentum === null ? "—" : `${momentum}`} alt={momentum !== null && momentumOnce !== null ? (momentum >= momentumOnce ? "▲" : "▼") : null} />
        <Metrik etiket={t.gorevTamam} deger={`${rapor.gorev.tamamlanan}`} alt={`${rapor.gorev.kivilcim}⚡`} />
        <Metrik etiket={t.takdir} deger={`${takdirSayi ?? 0}`} />
        <Metrik etiket={t.sonHareket} deger={saatGec === null ? "—" : t.saatOnce(saatGec)} vurgu={saatGec !== null && saatGec >= 12} />
      </dl>

      {/* #2 Canlı müdahale konsolu */}
      <Bolum baslik={tr.admin.mudahale.baslik}>
        <MudahaleKonsolu hedefId={id} />
      </Bolum>

      {/* Pusula */}
      <Bolum baslik={t.pusulaBaslik}>
        {cekirdek?.ozet ? (
          <>
            <p className="text-sm leading-relaxed text-slate-200">{cekirdek.ozet}</p>
            {cekirdek.ic_engel && <p className="mt-2 text-sm text-amber-300/90">{t.icEngel}: {cekirdek.ic_engel}</p>}
          </>
        ) : (
          <p className="text-sm text-slate-500">{t.veriYok}</p>
        )}
      </Bolum>

      {/* Ön Farkındalık */}
      <Bolum baslik={t.ofBaslik}>
        {profil?.katman1 ? (
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">
              {t.enZayif}: <span className="font-medium text-amber-300">{profil.katman1.enZayif ? OZ_ALAN_AD[profil.katman1.enZayif] ?? profil.katman1.enZayif : "—"}</span>
              {"  ·  "}{t.ritim}: <span className="font-medium text-slate-100">{profil.katman3?.ritim ?? "—"}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {(profil.katman1.bloklar ?? []).map((b) => (
                <span key={b.ad} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200">{b.ad}: {b.puan}</span>
              ))}
            </div>
            {profil.guven?.dusukVaryans && <p className="text-xs text-amber-400/80">⚠️ {t.guvenDusuk}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t.veriYok}</p>
        )}
      </Bolum>

      {/* Ekip Aynası (Mini 360) */}
      <Bolum baslik={t.ekipBaslik}>
        {disOrt !== null || ozOrt !== null ? (
          <p className="text-sm text-slate-200">
            {t.ozAlg}: <span className="font-semibold text-gold-light">{p1(ozOrt)}</span>
            {"  ·  "}{t.disAlg}: <span className="font-semibold text-royal-light">{p1(disOrt)}</span> <span className="text-xs text-slate-500">({disHam.length} {t.kisi})</span>
            {ozOrt !== null && disOrt !== null && ozOrt - disOrt > 1 && <span className="ml-2 text-amber-300">⚠️ {t.korNoktaFark((ozOrt - disOrt).toFixed(1))}</span>}
          </p>
        ) : (
          <p className="text-sm text-slate-500">{t.veriYok}</p>
        )}
      </Bolum>

      {/* Öz vs Dış aynalar (özellik özellik) */}
      <Bolum baslik={t.aynalarBaslik}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2">{t.ozellik}</th>
                <th className="pb-2 text-right">{t.oz}</th>
                <th className="pb-2 text-right">{t.dis}</th>
                <th className="pb-2 text-right">AYNA</th>
              </tr>
            </thead>
            <tbody>
              {rapor.satirlar.map((s) => (
                <tr key={s.ozellikId} className="border-t border-white/5">
                  <td className="py-1.5 text-slate-200">{s.ad}</td>
                  <td className="py-1.5 text-right text-slate-300">{p1(s.oz)}</td>
                  <td className="py-1.5 text-right font-medium text-slate-100">{p1(s.dis)}</td>
                  <td className="py-1.5 text-right text-gold-light/80">{p1(s.ayna)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rapor.korNokta && <p className="mt-3 text-sm text-amber-300">🔍 {t.korNokta}: {rapor.korNokta.ad}</p>}
      </Bolum>

      {/* Görev geçmişi */}
      <Bolum baslik={t.gorevBaslik}>
        {(gorevler ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">{t.veriYok}</p>
        ) : (
          <ul className="space-y-1.5">
            {(gorevler ?? []).map((g, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-200">{g.title}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {g.kind} · {t.durum[g.status as keyof typeof t.durum] ?? g.status}
                  {typeof g.ai_score === "number" ? ` · ${g.ai_score}/10` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bolum>
    </main>
  );
}

function Metrik({ etiket, deger, alt, vurgu }: { etiket: string; deger: string; alt?: string | null; vurgu?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${vurgu ? "bg-amber-500/10 ring-1 ring-amber-400/30" : "bg-white/[0.03]"}`}>
      <dt className="text-xs text-slate-500">{etiket}</dt>
      <dd className="mt-0.5 text-lg font-bold text-slate-100">
        {deger} {alt && <span className="text-xs font-normal text-slate-400">{alt}</span>}
      </dd>
    </div>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold-light">{baslik}</h2>
      {children}
    </section>
  );
}
