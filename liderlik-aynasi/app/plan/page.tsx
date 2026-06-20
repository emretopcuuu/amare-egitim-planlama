import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { YOLCULUK_FAZLARI, fazBul, yolculukGunuHesapla } from "@/lib/davranis";
import { tr } from "@/lib/i18n/tr";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "90 Günlük Yolculuğun — Liderlik Aynası" };

const t = tr.plan;

// GELİŞTİRME #7 — 90 Günlük Yolculuk: kamp sonrası taahhüt motorunun ADAYA
// GÖRÜNEN yüzü. Sonuç Kartı taahhütleri + söz hedefleri/gerçekleşeni + faz yol
// haritası tek yerde. (Zamanlanmış dürtüler zaten cron/yolculuk modunda.)
export default async function PlanPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: kisi }, { data: of }, { data: soz }, { data: tasinanlar }] = await Promise.all([
    db.from("participants").select("camp_unlocked_at").eq("id", session.sub).maybeSingle(),
    db.from("on_farkindalik").select("profil").eq("participant_id", session.sub).maybeSingle(),
    db
      .from("pledges")
      .select("temmuz_kayit, agustos_gorusme, kayit_yapilan, gorusme_yapilan")
      .eq("participant_id", session.sub)
      .maybeSingle(),
    // #9 Taahhüt köprüsü: adayın 90 güne taşıdığı görev yansımaları.
    db
      .from("missions")
      .select("title, reflection_text, carried_at")
      .eq("participant_id", session.sub)
      .not("carried_at", "is", null)
      .order("carried_at", { ascending: false })
      .limit(20),
  ]);
  const tasidiklar = (tasinanlar ?? []).filter((m) => m.reflection_text);

  const sonuc = (of?.profil as { sonucKarti?: Record<string, string | null> } | null)?.sonucKarti ?? {};
  const guclu = sonuc["sonuc.guclu"] ?? null;
  const korNokta = sonuc["sonuc.kor_nokta"] ?? null;
  const kampGorevi = sonuc["sonuc.kamp_gorevi"] ?? null;

  // Mevcut faz: kampa giriş anından bu yana geçen güne göre (yoksa yol haritası).
  const gun = kisi?.camp_unlocked_at
    ? Math.max(1, Math.min(90, yolculukGunuHesapla(kisi.camp_unlocked_at, new Date())))
    : null;
  const aktifFaz = gun ? fazBul(gun) : null;

  const hedefler = soz
    ? [
        { ad: t.kayitHedef, hedef: soz.temmuz_kayit, gercek: soz.kayit_yapilan },
        { ad: t.gorusmeHedef, hedef: soz.agustos_gorusme, gercek: soz.gorusme_yapilan },
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <header className="text-center">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.altBaslik}</p>
      </header>

      {/* Sonuç Kartı taahhütleri */}
      {(guclu || korNokta || kampGorevi) && (
        <section className="kart-cam rounded-2xl p-5 ring-1 ring-gold/30">
          <h2 className="text-sm font-semibold text-gold-light">{t.taahhutBaslik}</h2>
          <dl className="mt-3 space-y-3">
            {guclu && (
              <div>
                <dt className="text-xs text-slate-500">{t.gucluEtiket}</dt>
                <dd className="mt-0.5 text-sm text-slate-100">{guclu}</dd>
              </div>
            )}
            {korNokta && (
              <div>
                <dt className="text-xs text-slate-500">{t.korNoktaEtiket}</dt>
                <dd className="mt-0.5 text-sm text-slate-100">{korNokta}</dd>
              </div>
            )}
            {kampGorevi && (
              <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                <dt className="text-xs font-semibold text-gold-light/80">{t.gorevEtiket}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-100">{kampGorevi}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* #9 Kamptan Taşıdıklarım — görevlerden 90 güne taşınan içgörüler */}
      {tasidiklar.length > 0 && (
        <section className="kart-cam rounded-2xl p-5 ring-1 ring-emerald-400/25">
          <h2 className="text-sm font-semibold text-emerald-300">{t.tasidiklarimBaslik}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t.tasidiklarimAlt}</p>
          <ul className="mt-3 space-y-2.5">
            {tasidiklar.map((m, i) => (
              <li key={i} className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                <p className="text-sm leading-relaxed text-slate-100">“{m.reflection_text}”</p>
                <p className="mt-1 text-[0.65rem] text-slate-500">{m.title}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Söz hedefleri */}
      {hedefler.length > 0 && (
        <section className="kart-cam rounded-2xl p-5 ring-1 ring-royal/30">
          <h2 className="text-sm font-semibold text-royal-light">{t.sozBaslik}</h2>
          <div className="mt-3 space-y-4">
            {hedefler.map((h) => {
              const yuzde = h.hedef > 0 ? Math.min(100, Math.round((h.gercek / h.hedef) * 100)) : 0;
              return (
                <div key={h.ad}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-300">{h.ad}</span>
                    <span className="font-semibold text-slate-100">
                      {h.gercek} <span className="text-slate-500">/ {h.hedef}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-royal to-gold transition-all"
                      style={{ width: `${Math.max(2, yuzde)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Faz yol haritası */}
      <section className="kart-cam rounded-2xl p-5 ring-1 ring-royal/30">
        <h2 className="text-sm font-semibold text-royal-light">{t.fazBaslik}</h2>
        {aktifFaz && <p className="mt-1 text-xs text-slate-400">{t.fazSimdi(gun!, aktifFaz.ad)}</p>}
        <ol className="mt-4 space-y-2">
          {YOLCULUK_FAZLARI.map((f) => {
            const aktif = aktifFaz?.ad === f.ad;
            return (
              <li
                key={f.ad}
                className={`rounded-xl px-3 py-2.5 ${
                  aktif ? "bg-gold/10 ring-1 ring-gold/40" : "bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${aktif ? "text-gold-light" : "text-slate-200"}`}>
                    {f.ad}
                  </span>
                  <span className="text-[0.65rem] text-slate-500">
                    {t.fazGun(f.baslangicGunu, f.bitisGunu)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{f.odak}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Haftalık check-in */}
      <section className="kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 text-center ring-1 ring-gold/30">
        <p className="text-sm text-slate-300">{t.checkinMetin}</p>
        <Link
          href="/kocu"
          className="btn-kor mt-3 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-bold"
        >
          👁 {t.checkinDugme}
        </Link>
      </section>

    </main>
  );
}
