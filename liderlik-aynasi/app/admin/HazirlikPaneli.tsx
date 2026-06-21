import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.hazirlik;

// #5 "Kampa hazır mısın?" + UX #5 (2.tur) İlk Kurulum Rehberi / Sağlık Kontrolü.
// Tek bakışta ✓/✗ hazırlık kontrolü; kendi sorgularını yapar (sunucu bileşeni).
// konum="ust": panel tepesinde, NUMARALI rehber — yalnız kritik adım eksikken
//   görünür (kurulum bitince kaybolur, panel sade kalır).
// konum="arac": "Tüm Araçlar" içinde her zaman görünür sağlık kontrol listesi.
export default async function HazirlikPaneli({
  konum = "arac",
  aktifAsama = 1,
}: {
  konum?: "ust" | "arac";
  // #20 Aşama-bilinçli sağlık: kamp ilerledikçe Final ön-koşulları da kontrol edilir.
  aktifAsama?: number;
}) {
  const db = supabaseAdmin();
  const [
    { count: kisi },
    { count: takimsiz },
    { count: atama },
    { count: dalga },
    { data: aynaAyar },
    { count: abone },
    { count: mektup },
  ] = await Promise.all([
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant")
      .is("team", null),
    db.from("assignments").select("id", { count: "exact", head: true }),
    db.from("waves").select("id", { count: "exact", head: true }),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    db.from("push_subscriptions").select("id", { count: "exact", head: true }),
    db.from("mirror_letters").select("participant_id", { count: "exact", head: true }),
  ]);

  const vapidVar =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
  const zekaVar = !!process.env.ANTHROPIC_API_KEY;
  const kisiVar = (kisi ?? 0) > 0;

  // kritik: kampın çalışması için olmazsa olmaz (rehberi tetikleyenler).
  // Takım/AYNA/bildirim "yumuşak" — eksik olması ilk kurulum rehberini açmaz
  // (örn. AYNA kasıtlı olarak kamp anına kadar uyutulur).
  const maddeler = [
    { ok: kisiVar, kritik: true, etiket: t.katilimci, ipucu: t.katilimciIpucu, href: "/admin/kurulum" },
    {
      ok: kisiVar && (takimsiz ?? 0) === 0,
      kritik: false,
      etiket: t.takim,
      ipucu: t.takimIpucu(takimsiz ?? 0),
      href: "/admin/katilimcilar",
    },
    { ok: (atama ?? 0) > 0, kritik: true, etiket: t.eslestirme, ipucu: t.eslestirmeIpucu, href: "/admin/eslestirme" },
    { ok: (dalga ?? 0) > 0, kritik: true, etiket: t.dalga, ipucu: t.dalgaIpucu, href: "/admin" },
    { ok: zekaVar, kritik: true, etiket: t.zeka, ipucu: t.zekaIpucu, href: "/admin/kurulum" },
    { ok: aynaAyar?.value === "true", kritik: false, etiket: t.ayna, ipucu: t.aynaIpucu, href: "/admin/ayna-direktoru" },
    { ok: vapidVar && (abone ?? 0) > 0, kritik: false, etiket: t.bildirim, ipucu: t.bildirimIpucu, href: "/admin/kurulum" },
    // #20 Final ön-koşulu: kamp canlı/sonrasındayken (aşama ≥ 3) Ayna mektupları
    // hazır mı? Rapor anının gücü buna bağlı. Erken aşamalarda gösterilmez.
    ...(aktifAsama >= 3
      ? [
          {
            ok: (mektup ?? 0) >= Math.ceil((kisi ?? 0) * 0.8),
            kritik: false,
            etiket: t.mektup,
            ipucu: t.mektupIpucu(mektup ?? 0, kisi ?? 0),
            href: "/admin/ayna-direktoru",
          },
        ]
      : []),
  ];
  const hazirSayi = maddeler.filter((m) => m.ok).length;
  const hepsi = hazirSayi === maddeler.length;
  const kritikTamam = maddeler.every((m) => !m.kritik || m.ok);

  // Tepedeki rehber yalnız kritik bir adım eksikken görünür (kurulum modu).
  if (konum === "ust" && kritikTamam) return null;

  const ust = konum === "ust";

  return (
    <section
      className={`kart-3d scroll-mt-24 rounded-2xl p-6 shadow-xl ring-1 backdrop-blur ${
        ust
          ? "parilti bg-gold/10 ring-gold/50"
          : hepsi
            ? "bg-emerald-500/5 ring-emerald-400/40"
            : "bg-midnight-card/60 ring-gold/40"
      }`}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
        {ust ? t.ustBaslik : t.baslik}
        <Ipucu {...tr.admin.yardim.hazirlik} />
      </h2>
      <p className={`mt-1 text-sm ${hepsi ? "text-emerald-300" : "text-slate-400"}`}>
        {ust ? t.ustAciklama : hepsi ? t.hepsiTamam : t.eksikVar}
      </p>

      {/* İlerleme çubuğu — kaç adım hazır */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-midnight-soft">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700"
            style={{ width: `${(hazirSayi / maddeler.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-xs font-bold text-gold-light">
          {t.ilerleme(hazirSayi, maddeler.length)}
        </span>
      </div>

      {/* Önce ZORUNLU (kampı açan) sonra OPSİYONEL — sıra/öncelik görünür olsun */}
      {(["zorunlu", "opsiyonel"] as const).map((tur) => {
        const grup = maddeler.filter((m) => (tur === "zorunlu" ? m.kritik : !m.kritik));
        if (grup.length === 0) return null;
        return (
          <div key={tur} className="mt-4">
            <p
              className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-wide ${
                tur === "zorunlu" ? "text-amber-300/90" : "text-slate-500"
              }`}
            >
              {tur === "zorunlu" ? t.zorunluBaslik : t.opsiyonelBaslik}
            </p>
            <ul className="space-y-2">
              {grup.map((m, i) => (
                <li
                  key={m.etiket}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`text-xl ${m.ok ? "text-emerald-400" : "text-slate-500"}`}>
                      {m.ok ? "✓" : `${i + 1}.`}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-slate-100">
                      {m.ok ? m.etiket : m.ipucu}
                    </span>
                  </span>
                  {!m.ok && (
                    <Link
                      href={m.href}
                      className="shrink-0 rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold-light transition-colors hover:bg-gold/25"
                    >
                      {t.duzelt}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
