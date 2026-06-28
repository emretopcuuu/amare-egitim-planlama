import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { radarHesapla, fazBul, yolculukGunuHesapla } from "@/lib/davranis";
import { haftaBaslangici } from "@/lib/momentum";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import Katlanir from "../../Katlanir";
import Ipucu from "../../Ipucu";
import OtoYenile from "../../OtoYenile";

export const revalidate = 15;

export const metadata = { title: "Sağlık — Liderlik Aynası" };

const KANIT_ESIK = 3;

// S2+S7: Komutan + Analiz + Takım + Farkındalık tek sayfada birleşti.
export default async function SaglikPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const simdi = new Date();
  const s24 = new Date(simdi.getTime() - 24 * 3_600_000).toISOString();
  const s48 = new Date(simdi.getTime() - 48 * 3_600_000).toISOString();

  const [
    ozellikler,
    { data: kisiler },
    atamalar,
    puanlar,
    { data: gorevler48 },
    { data: direncler },
    { data: momentumlar },
    { data: kaymalar },
    { data: ayarlar },
    { data: fierolar },
    { data: zorlukGorevler },
    pusulalar,
    bosluklar,
    rcmt,
    mcmt,
    kud,
    miss,
    { data: churnlar },
    { count: redSay },
    { count: scoredCount },
    { count: reflectedCount },
    { count: carriedCount },
    { count: mirrorSeenCount },
    { count: tanikCount },
    puanlarFark,
  ] = await Promise.all([
    // --- Komutan ---
    aktifOzellikler(db),
    db.from("participants").select("id, full_name, team, camp_unlocked_at").eq("role", "participant"),
    tumKayitlar<{ observer_id: string; target_id: string }>((bas, son) =>
      db.from("assignments").select("observer_id, target_id").order("observer_id").range(bas, son)
    ),
    tumKayitlar<{ rater_id: string; target_id: string; is_self: boolean; created_at: string }>((bas, son) =>
      db.from("ratings").select("rater_id, target_id, is_self, created_at").order("created_at").range(bas, son)
    ),
    db.from("missions").select("participant_id, status, responded_at, issued_at").gte("issued_at", s48),
    db.from("missions").select("ai_score").in("kind", ["cesaret", "simulasyon"]).not("ai_score", "is", null),
    db.from("momentum_scores").select("participant_id, score, week_start").order("week_start", { ascending: false }),
    db.from("churn_radar").select("participant_id, admin_alerted_at, nudged_at").not("admin_alerted_at", "is", null).gte("admin_alerted_at", s24),
    db.from("settings").select("key, value").in("key", ["sistem_modu", "yolculuk_baslangic"]),
    db.from("missions").select("participant_id, title, scored_at").eq("ai_score", 10).not("scored_at", "is", null)
      .gte("scored_at", new Date(simdi.getTime() - 7 * 86_400_000).toISOString()).order("scored_at", { ascending: false }).limit(12),
    db.from("missions").select("participant_id, difficulty, status").gte("issued_at", new Date(simdi.getTime() - 7 * 86_400_000).toISOString()),
    // --- Analiz + Takım ---
    db.from("pusula").select("participant_id, tamamlandi_at"),
    db.from("bosluk_ani").select("participant_id, yeni_cumle"),
    tumKayitlar<{ target_id: string }>((bas, son) =>
      db.from("ratings").select("target_id").eq("is_hidden", false).not("comment", "is", null).order("target_id").range(bas, son)
    ),
    tumKayitlar<{ participant_id: string }>((bas, son) =>
      db.from("missions").select("participant_id").not("ai_comment", "is", null).order("participant_id").range(bas, son)
    ),
    tumKayitlar<{ to_id: string }>((bas, son) =>
      db.from("kudos").select("to_id").eq("is_hidden", false).order("to_id").range(bas, son)
    ),
    tumKayitlar<{ status: string; participant_id: string }>((bas, son) =>
      db.from("missions").select("status, participant_id").order("status").range(bas, son)
    ),
    db.from("churn_radar").select("participant_id, admin_alerted_at"),
    db.from("redler").select("id", { count: "exact", head: true }),
    // --- Farkındalık ---
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "scored"),
    db.from("missions").select("id", { count: "exact", head: true }).not("reflection_text", "is", null),
    db.from("missions").select("id", { count: "exact", head: true }).not("carried_at", "is", null),
    db.from("mirror_moments").select("id", { count: "exact", head: true }).not("seen_at", "is", null),
    db.from("gorev_tanik").select("id", { count: "exact", head: true }).not("confirmed_at", "is", null),
    tumKayitlar<{ ai_score: number | null }>((bas, son) =>
      db.from("missions").select("ai_score").eq("status", "scored").not("ai_score", "is", null).order("id").range(bas, son)
    ),
  ]);

  // ======================== KOMUTAN HESAPLARI ========================
  const kisiHarita = new Map((kisiler ?? []).map((k) => [k.id, k]));
  const takimHarita = new Map((kisiler ?? []).map((k) => [k.id, k.team]));

  const aktifler = new Set<string>();
  const sonEtkinlik = new Map<string, number>();
  let caprazBag = 0;
  const ciftler = new Set<string>();
  for (const p of puanlar) {
    const ts = new Date(p.created_at).getTime();
    if (p.created_at >= s24) aktifler.add(p.rater_id);
    if (ts > (sonEtkinlik.get(p.rater_id) ?? 0)) sonEtkinlik.set(p.rater_id, ts);
    if (p.is_self) continue;
    const anahtar =
      p.rater_id < p.target_id
        ? `${p.rater_id}|${p.target_id}`
        : `${p.target_id}|${p.rater_id}`;
    if (ciftler.has(anahtar)) continue;
    ciftler.add(anahtar);
    const ta = takimHarita.get(p.rater_id);
    const tb = takimHarita.get(p.target_id);
    if (!ta || !tb || ta !== tb) caprazBag++;
  }
  for (const g of gorevler48 ?? []) {
    if (g.responded_at && g.responded_at >= s24) aktifler.add(g.participant_id);
    if (g.responded_at) {
      const ts = new Date(g.responded_at).getTime();
      if (ts > (sonEtkinlik.get(g.participant_id) ?? 0))
        sonEtkinlik.set(g.participant_id, ts);
    }
  }

  const beklenenPuan = ((atamalar ?? []).length + (kisiler ?? []).length) * ozellikler.length;
  const radar = radarHesapla({
    toplamKisi: (kisiler ?? []).length,
    aktif24s: aktifler.size,
    verilen48s: (gorevler48 ?? []).length,
    teslim48s: (gorevler48 ?? []).filter((g) => g.responded_at !== null).length,
    caprazBag,
    toplamBag: ciftler.size,
    beklenenPuan,
    girilenPuan: puanlar.filter((p) => !p.is_self).length,
    direncPuanlari: (direncler ?? []).map((d) => d.ai_score as number),
  });

  const t = tr.admin.komutan;
  const eksenler = [
    { ad: t.eksenler.katilim, deger: radar.katilim },
    { ad: t.eksenler.gorevMomentumu, deger: radar.gorevMomentumu },
    { ad: t.eksenler.aidiyet, deger: radar.aidiyet },
    { ad: t.eksenler.tamamlama, deger: radar.tamamlama },
    { ad: t.eksenler.retDirenci, deger: radar.retDirenci },
  ];

  const momentumListe = (momentumlar ?? [])
    .reduce((acc: Map<string, number>, m) => {
      if (!acc.has(m.participant_id)) acc.set(m.participant_id, m.score);
      return acc;
    }, new Map<string, number>())
  ;
  const momentumSirali = [...momentumListe.entries()]
    .map(([id, skor]) => ({ ad: kisiHarita.get(id)?.full_name ?? "—", skor }))
    .sort((a, b) => b.skor - a.skor);
  const ekipOrt = momentumSirali.length
    ? Math.round(momentumSirali.reduce((s, m) => s + m.skor, 0) / momentumSirali.length)
    : null;

  const kaymaListe = (kaymalar ?? [])
    .map((k) => {
      const son = sonEtkinlik.get(k.participant_id);
      return {
        ad: kisiHarita.get(k.participant_id)?.full_name ?? "—",
        saat: son ? Math.round((simdi.getTime() - son) / 3_600_000) : null,
      };
    })
    .sort((a, b) => (b.saat ?? 999) - (a.saat ?? 999));

  const fieroListe = (fierolar ?? []).map((f) => ({
    ad: kisiHarita.get(f.participant_id)?.full_name ?? "—",
    baslik: f.title as string,
    saat: f.scored_at
      ? Math.round((simdi.getTime() - new Date(f.scored_at).getTime()) / 3_600_000)
      : null,
  }));

  type EustressHam = { zorTop: number; n: number; tamam: number; suresi: number };
  const eustressHam = new Map<string, EustressHam>();
  for (const g of zorlukGorevler ?? []) {
    if (g.status === "pending" || g.status === "submitted") continue;
    const e = eustressHam.get(g.participant_id) ?? { zorTop: 0, n: 0, tamam: 0, suresi: 0 };
    e.zorTop += (g.difficulty as number) ?? 2;
    e.n++;
    if (g.status === "scored") e.tamam++;
    if (g.status === "expired") e.suresi++;
    eustressHam.set(g.participant_id, e);
  }
  const eustress: { ad: string; durum: "sikiliyor" | "akista" | "zorlaniyor" }[] = [];
  for (const [pid, e] of eustressHam) {
    if (e.n < 2) continue;
    const ortZor = e.zorTop / e.n;
    const tamamOran = e.tamam / e.n;
    const suresiOran = e.suresi / e.n;
    let durum: "sikiliyor" | "akista" | "zorlaniyor";
    if (ortZor <= 1.4 && tamamOran >= 0.6) durum = "sikiliyor";
    else if (suresiOran >= 0.4 || (ortZor >= 2.5 && tamamOran < 0.4)) durum = "zorlaniyor";
    else durum = "akista";
    eustress.push({ ad: kisiHarita.get(pid)?.full_name ?? "—", durum });
  }
  const sikilan = eustress.filter((e) => e.durum === "sikiliyor");
  const zorlanan = eustress.filter((e) => e.durum === "zorlaniyor");
  const akistaSayi = eustress.filter((e) => e.durum === "akista").length;

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const mod = ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp";
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const yolculukGunu =
    mod === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, simdi))
      : null;

  // ======================== ANALİZ HESAPLARI ========================
  const aToplam = (kisiler ?? []).length;
  const pusulaSet = new Set((pusulalar.data ?? []).filter((p) => p.tamamlandi_at).map((p) => p.participant_id));
  const pusulaTamam = pusulaSet.size;
  const boslukSet = new Set((bosluklar.data ?? []).filter((b) => b.yeni_cumle).map((b) => b.participant_id));
  const boslukTamam = boslukSet.size;

  const kanit = new Map<string, number>();
  const ekle = (id: string) => kanit.set(id, (kanit.get(id) ?? 0) + 1);
  rcmt.forEach((r) => ekle(r.target_id));
  mcmt.forEach((m) => ekle(m.participant_id));
  kud.forEach((k) => ekle(k.to_id));
  const kanitsiz = (kisiler ?? []).filter((k) => (kanit.get(k.id) ?? 0) < KANIT_ESIK).length;

  const gorevPuanli = miss.filter((g) => g.status === "scored").length;
  const gorevKapanan = miss.filter((g) => g.status === "scored" || g.status === "expired").length;
  const gorevOran = gorevKapanan ? Math.round((gorevPuanli / gorevKapanan) * 100) : 0;
  const churnRiskte = (churnlar ?? []).filter((c) => c.admin_alerted_at).length;
  const redToplam = redSay ?? 0;
  const sonMomentum = new Map<string, number>();
  for (const m of momentumlar ?? []) if (!sonMomentum.has(m.participant_id)) sonMomentum.set(m.participant_id, m.score);
  const momentumOrt = sonMomentum.size
    ? Math.round([...sonMomentum.values()].reduce((a, b) => a + b, 0) / sonMomentum.size)
    : null;

  // Takım kırılımı
  const takimlar = new Map<string, { toplam: number; pusula: number; bosluk: number; kanitsiz: number }>();
  for (const k of kisiler ?? []) {
    const ad = k.team ?? "—";
    const tv = takimlar.get(ad) ?? { toplam: 0, pusula: 0, bosluk: 0, kanitsiz: 0 };
    tv.toplam++;
    if (pusulaSet.has(k.id)) tv.pusula++;
    if (boslukSet.has(k.id)) tv.bosluk++;
    if ((kanit.get(k.id) ?? 0) < KANIT_ESIK) tv.kanitsiz++;
    takimlar.set(ad, tv);
  }
  const takimSatir = [...takimlar.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));

  // ======================== TAKIM SAĞLIĞI ========================
  const kayanSet = new Set((churnlar ?? []).map((c) => c.participant_id));
  const teslimSay = new Map<string, { scored: number; expired: number }>();
  for (const g of miss) {
    if (g.status !== "scored" && g.status !== "expired") continue;
    const pid = g.participant_id;
    const k = teslimSay.get(pid) ?? { scored: 0, expired: 0 };
    if (g.status === "scored") k.scored++;
    else k.expired++;
    teslimSay.set(pid, k);
  }

  type TakimSaglik = { ad: string; uye: number; kampta: number; momentumOrt2: number | null; kayan: number; teslimOrani: number; saglik: number };
  const grup = new Map<string, string[]>();
  for (const k of kisiler ?? []) {
    if (!k.team) continue;
    const liste = grup.get(k.team) ?? [];
    liste.push(k.id);
    grup.set(k.team, liste);
  }
  const takimSaglikListe: TakimSaglik[] = [];
  for (const [ad, idler] of grup) {
    const uye = idler.length;
    const kampta = (kisiler ?? []).filter((k) => k.team === ad && k.camp_unlocked_at).length;
    const mVals = idler.map((id) => sonMomentum.get(id)).filter((v): v is number => v !== undefined);
    const momentumOrt2 = mVals.length ? Math.round(mVals.reduce((a, b) => a + b, 0) / mVals.length) : null;
    const kayan = idler.filter((id) => kayanSet.has(id)).length;
    let scored = 0, toplam2 = 0;
    for (const id of idler) {
      const s = teslimSay.get(id);
      if (s) { scored += s.scored; toplam2 += s.scored + s.expired; }
    }
    const teslimOrani = toplam2 > 0 ? scored / toplam2 : 1;
    const katilim = uye > 0 ? kampta / uye : 0;
    const kayanOran = uye > 0 ? kayan / uye : 0;
    const ciftler2: [number | null, number][] = [
      [momentumOrt2, 0.35], [teslimOrani * 100, 0.25], [katilim * 100, 0.2], [(1 - kayanOran) * 100, 0.2],
    ];
    let wTop = 0, sTop = 0;
    for (const [v, w] of ciftler2) if (v !== null) { sTop += v * w; wTop += w; }
    const saglik = wTop > 0 ? Math.round(sTop / wTop) : 0;
    takimSaglikListe.push({ ad, uye, kampta, momentumOrt2, kayan, teslimOrani, saglik });
  }
  takimSaglikListe.sort((a, b) => b.saglik - a.saglik);

  const tRenk = (s: number) => s >= 70 ? "text-emerald-400" : s >= 45 ? "text-gold-light" : "text-red-400";
  const tBar = (s: number) => s >= 70 ? "from-emerald-500/70 to-emerald-400" : s >= 45 ? "from-gold-dim to-gold" : "from-red-500/70 to-red-400";

  // ======================== FARKINDALIK ========================
  const scored = scoredCount ?? 0;
  const reflected = reflectedCount ?? 0;
  const carried = carriedCount ?? 0;
  const mirrorSeen = mirrorSeenCount ?? 0;
  const tanik = tanikCount ?? 0;
  const puanlananFark = puanlarFark.filter((p) => p.ai_score !== null);
  const ortPuan = puanlananFark.length
    ? puanlananFark.reduce((sum, p) => sum + (p.ai_score ?? 0), 0) / puanlananFark.length
    : 0;
  const yansimaOrani = scored > 0 ? reflected / scored : 0;
  const tasimaOrani = reflected > 0 ? carried / reflected : 0;
  const endeks = Math.round(yansimaOrani * 40 + tasimaOrani * 30 + (ortPuan / 10) * 30);
  const endeksRenk = endeks >= 66 ? "text-emerald-300" : endeks >= 40 ? "text-gold" : "text-amber-300";
  const tFark = tr.admin.farkindalik;

  const N = eksenler.length;
  const R = 130; const cx = 170; const cy = 160;
  const nokta = (i: number, oran: number) => {
    const aci = (2 * Math.PI * i) / N - Math.PI / 2;
    return `${cx + R * oran * Math.cos(aci)},${cy + R * oran * Math.sin(aci)}`;
  };
  const halka = (oran: number) => Array.from({ length: N }, (_, i) => nokta(i, oran)).join(" ");
  const veri = eksenler.map((d, i) => nokta(i, Math.max(0.04, d.deger / 100))).join(" ");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gold">📊 Sağlık Panosu</h1>
          <p className="mt-1 text-sm text-slate-400">
            Komutan radarı · Analiz eksenleri · Takım sağlığı · Farkındalık endeksi
          </p>
        </div>
        <OtoYenile saniye={20} />
      </div>

      {/* 1 · Komutan Radarı */}
      <Katlanir baslik={t.baslik} aciklama={t.aciklama} ikon="🎛" yardim={tr.admin.yardim.komutan} varsayilanAcik>
        <p className="text-sm font-semibold text-gold-light">
          {t.modBaslik}:{" "}
          {mod === "yolculuk" && yolculukGunu !== null
            ? `${t.modYolculuk} — ${t.yolculukGunu(yolculukGunu, fazBul(yolculukGunu).ad)}`
            : t.modKamp}
        </p>
        <section className="kart-3d relative rounded-2xl bg-midnight-card/60 p-6 ring-1 ring-gold/30 backdrop-blur">
          <span className="absolute right-3 top-3">
            <Ipucu {...tr.admin.yardim.komutanRadar} />
          </span>
          <svg viewBox="0 -16 340 348" className="mx-auto w-full max-w-md">
            {[0.25, 0.5, 0.75, 1].map((o) => (
              <polygon key={o} points={halka(o)} fill="none" stroke="rgba(156,195,224,0.25)" strokeWidth="1" />
            ))}
            {eksenler.map((_, i) => (
              <line key={i} x1={cx} y1={cy} x2={nokta(i, 1).split(",")[0]} y2={nokta(i, 1).split(",")[1]} stroke="rgba(156,195,224,0.2)" />
            ))}
            <polygon points={veri} fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth="2.5" />
            {eksenler.map((d, i) => {
              const [x, y] = nokta(i, 1.18).split(",").map(Number);
              return (
                <text key={d.ad} x={x} y={y} textAnchor="middle" className="fill-slate-200" fontSize="13" fontWeight="600">
                  {d.ad} · {d.deger}
                </text>
              );
            })}
          </svg>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gold-light">
              {t.momentumBaslik}
              <Ipucu {...tr.admin.yardim.komutanMomentum} />
            </h2>
            {momentumSirali.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{t.momentumYok}</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-300">{t.ekipOrt(ekipOrt ?? 0)}</p>
                <ul className="mt-3 space-y-1.5">
                  {momentumSirali.slice(0, 8).map((m) => (
                    <li key={m.ad} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{m.ad}</span>
                      <span className={`font-bold ${m.skor >= 70 ? "text-emerald-300" : m.skor >= 45 ? "text-gold" : "text-red-300"}`}>
                        {m.skor}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gold-light">
              {t.kaymaBaslik}
              <Ipucu {...tr.admin.yardim.komutanKayma} />
            </h2>
            {kaymaListe.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{t.kaymaYok}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {kaymaListe.map((k) => (
                  <li key={k.ad} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{k.ad}</span>
                    <span className="font-semibold text-red-300">
                      {k.saat !== null ? t.kaymaSatiri(k.saat) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-gold/30 backdrop-blur">
            <h2 className="text-base font-semibold text-gold-light">🏆 Fiero Akışı</h2>
            {fieroListe.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Henüz 10/10 yok.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {fieroListe.map((f, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-100">{f.ad}</span>
                      <span className="text-slate-500"> · {f.baslik}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gold">
                      {f.saat !== null ? (f.saat < 1 ? "az önce" : `${f.saat} sa`) : ""} ✨
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
            <h2 className="text-base font-semibold text-gold-light">🎯 Akış Haritası</h2>
            {eustress.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Henüz yeterli görev verisi yok.</p>
            ) : (
              <>
                <div className="mt-3 flex gap-2 text-center text-xs">
                  <span className="flex-1 rounded-lg bg-sky-400/15 py-1.5 text-sky-200">😴 Sıkılıyor<br /><b className="text-base">{sikilan.length}</b></span>
                  <span className="flex-1 rounded-lg bg-emerald-400/15 py-1.5 text-emerald-200">🌊 Akışta<br /><b className="text-base">{akistaSayi}</b></span>
                  <span className="flex-1 rounded-lg bg-amber-400/15 py-1.5 text-amber-200">😰 Zorlanıyor<br /><b className="text-base">{zorlanan.length}</b></span>
                </div>
                {sikilan.length > 0 && <p className="mt-2 text-xs text-slate-300"><span className="font-semibold text-sky-200">Zorluğu artır:</span> {sikilan.map((e) => e.ad).join(", ")}</p>}
                {zorlanan.length > 0 && <p className="mt-1 text-xs text-slate-300"><span className="font-semibold text-amber-200">Hafiflet:</span> {zorlanan.map((e) => e.ad).join(", ")}</p>}
              </>
            )}
          </section>
        </div>
      </Katlanir>

      {/* 2 · Analiz Eksenleri */}
      <Katlanir baslik={tr.admin.analiz.baslik} aciklama={tr.admin.analiz.aciklama} ikon="📈" yardim={tr.admin.yardim.analiz}>
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gold-light">
            {tr.admin.analiz.kimlikBaslik}
            <Ipucu {...tr.admin.yardim.analizKimlik} />
          </h2>
          <p className="mb-3 text-sm text-slate-400">{tr.admin.analiz.kimlikAciklama}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kutu buyuk={`${pusulaTamam}/${aToplam}`} kucuk={tr.admin.analiz.pusula} />
            <Kutu buyuk={`${boslukTamam}/${aToplam}`} kucuk={tr.admin.analiz.bosluk} />
            <Kutu buyuk={String(kanitsiz)} kucuk={tr.admin.analiz.kanitsiz} uyari={kanitsiz > 0} />
          </div>
        </section>
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gold-light">
            {tr.admin.analiz.davranisBaslik}
            <Ipucu {...tr.admin.yardim.analizDavranis} />
          </h2>
          <p className="mb-3 text-sm text-slate-400">{tr.admin.analiz.davranisAciklama}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kutu buyuk={`%${gorevOran}`} kucuk={tr.admin.analiz.gorevOran} />
            <Kutu buyuk={String(churnRiskte)} kucuk={tr.admin.analiz.churn} uyari={churnRiskte > 0} />
            <Kutu buyuk={String(redToplam)} kucuk={tr.admin.analiz.red} />
            <Kutu buyuk={momentumOrt === null ? "—" : String(momentumOrt)} kucuk={tr.admin.analiz.momentum} />
          </div>
        </section>
        {takimSatir.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-gold-light">{tr.admin.analiz.takimBaslik}</h2>
            <div className="overflow-x-auto rounded-2xl ring-1 ring-royal/30">
              <table className="w-full text-sm">
                <thead className="bg-midnight-card/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{tr.admin.analiz.takim}</th>
                    <th className="px-3 py-2 text-right font-medium">{tr.admin.analiz.pusula}</th>
                    <th className="px-3 py-2 text-right font-medium">{tr.admin.analiz.bosluk}</th>
                    <th className="px-3 py-2 text-right font-medium">{tr.admin.analiz.kanitsiz}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal/20">
                  {takimSatir.map(([ad, v]) => (
                    <tr key={ad} className="bg-midnight-card/30">
                      <td className="px-4 py-2.5 font-medium text-slate-100">{ad}</td>
                      <td className="px-3 py-2.5 text-right text-slate-300">{v.pusula}/{v.toplam}</td>
                      <td className="px-3 py-2.5 text-right text-slate-300">{v.bosluk}/{v.toplam}</td>
                      <td className={`px-3 py-2.5 text-right ${v.kanitsiz > 0 ? "text-amber-400" : "text-slate-300"}`}>{v.kanitsiz}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Katlanir>

      {/* 3 · Takım Sağlığı */}
      <Katlanir baslik={tr.admin.takimSagligi.baslik} aciklama={tr.admin.takimSagligi.aciklama} ikon="👥">
        {takimSaglikListe.length === 0 ? (
          <p className="text-sm text-slate-400">{tr.admin.takimSagligi.takimYok}</p>
        ) : (
          <ol className="space-y-3">
            {takimSaglikListe.map((tk, i) => (
              <li key={tk.ad} className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-slate-500">{i + 1}</span>
                    <span className="font-semibold text-slate-100">{tk.ad}</span>
                  </div>
                  <span className={`text-2xl font-bold ${tRenk(tk.saglik)}`}>{tk.saglik}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full bg-gradient-to-r ${tBar(tk.saglik)}`} style={{ width: `${Math.max(3, tk.saglik)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>{tr.admin.takimSagligi.uye}: <b className="text-slate-200">{tk.kampta}/{tk.uye}</b></span>
                  <span>{tr.admin.takimSagligi.momentum}: <b className="text-slate-200">{tk.momentumOrt2 ?? "—"}</b></span>
                  <span>{tr.admin.takimSagligi.teslim}: <b className="text-slate-200">%{Math.round(tk.teslimOrani * 100)}</b></span>
                  {tk.kayan > 0 && <span className="text-red-400/90">{tr.admin.takimSagligi.kayan}: <b>{tk.kayan}</b></span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Katlanir>

      {/* 4 · Farkındalık Sinyali */}
      <Katlanir baslik={tFark.baslik} aciklama={tFark.altBaslik} ikon="💡" yardim={tr.admin.yardim.analiz}>
        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 text-center shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tFark.endeksBaslik}</p>
          <p className={`mt-1 text-6xl font-bold ${endeksRenk}`}>{endeks}</p>
          <p className="mt-1 text-xs text-slate-500">{tFark.endeksAlt}</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-gold to-emerald-400" style={{ width: `${Math.max(2, endeks)}%` }} />
          </div>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { etiket: tFark.yansimaOrani, deger: `%${Math.round(yansimaOrani * 100)}`, alt: tFark.yansimaAlt(reflected, scored) },
            { etiket: tFark.tasimaOrani, deger: `%${Math.round(tasimaOrani * 100)}`, alt: tFark.tasimaAlt(carried) },
            { etiket: tFark.ortPuan, deger: ortPuan ? ortPuan.toFixed(1) : "—", alt: tFark.ortPuanAlt },
            { etiket: tFark.aynaAni, deger: String(mirrorSeen), alt: tFark.aynaAniAlt },
            { etiket: tFark.tanik, deger: String(tanik), alt: tFark.tanikAlt },
          ].map((m) => (
            <div key={m.etiket} className="rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
              <p className="text-xs text-slate-400">{m.etiket}</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{m.deger}</p>
              <p className="mt-0.5 text-[0.65rem] leading-snug text-slate-500">{m.alt}</p>
            </div>
          ))}
        </div>
      </Katlanir>
    </main>
  );
}

function Kutu({ buyuk, kucuk, uyari = false }: { buyuk: string; kucuk: string; uyari?: boolean }) {
  return (
    <div className={`kart-3d rounded-2xl bg-midnight-card/60 p-4 text-center shadow-xl ring-1 backdrop-blur ${uyari ? "ring-amber-500/40" : "ring-royal/30"}`}>
      <p className={`text-2xl font-bold ${uyari ? "text-amber-400" : "text-gold"}`}>{buyuk}</p>
      <p className="mt-1 text-xs text-slate-400">{kucuk}</p>
    </div>
  );
}
