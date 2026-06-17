import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { radarHesapla, fazBul, yolculukGunuHesapla } from "@/lib/davranis";
import { haftaBaslangici } from "@/lib/momentum";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";
import Katlanir from "../Katlanir";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Komutan Paneli — Liderlik Aynası" };

const t = tr.admin.komutan;

// KOMUTAN PANELİ (Behavioral Blueprint, Slayt 10): liderin beş eksenli
// canlı radarı + haftalık momentum + kayma radarı. Lider mikro-yönetimden
// çıkar; sistemin nabzını tek bakışta görür. Sayfa her istekle taze hesaplar.

function RadarSVG({ degerler }: { degerler: { ad: string; deger: number }[] }) {
  const N = degerler.length;
  const R = 130;
  const cx = 170;
  const cy = 160;
  const nokta = (i: number, oran: number) => {
    const aci = (2 * Math.PI * i) / N - Math.PI / 2;
    return `${cx + R * oran * Math.cos(aci)},${cy + R * oran * Math.sin(aci)}`;
  };
  const halka = (oran: number) =>
    Array.from({ length: N }, (_, i) => nokta(i, oran)).join(" ");
  const veri = degerler.map((d, i) => nokta(i, Math.max(0.04, d.deger / 100))).join(" ");
  return (
    <svg viewBox="0 0 340 330" className="mx-auto w-full max-w-md">
      {[0.25, 0.5, 0.75, 1].map((o) => (
        <polygon
          key={o}
          points={halka(o)}
          fill="none"
          stroke="rgba(156,195,224,0.25)"
          strokeWidth="1"
        />
      ))}
      {degerler.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={nokta(i, 1).split(",")[0]}
          y2={nokta(i, 1).split(",")[1]}
          stroke="rgba(156,195,224,0.2)"
        />
      ))}
      <polygon
        points={veri}
        fill="rgba(245,158,11,0.25)"
        stroke="#f59e0b"
        strokeWidth="2.5"
      />
      {degerler.map((d, i) => {
        const [x, y] = nokta(i, 1.18).split(",").map(Number);
        return (
          <text
            key={d.ad}
            x={x}
            y={y}
            textAnchor="middle"
            className="fill-slate-200"
            fontSize="13"
            fontWeight="600"
          >
            {d.ad} · {d.deger}
          </text>
        );
      })}
    </svg>
  );
}

export default async function KomutanPage() {
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
  ] = await Promise.all([
    aktifOzellikler(db),
    db.from("participants").select("id, full_name, team").eq("role", "participant"),
    // Sayfa sayfa: ~1000 satır sınırı atama/puanları kırpıp radarı bozuyordu.
    tumKayitlar<{ observer_id: string; target_id: string }>((bas, son) =>
      db.from("assignments").select("observer_id, target_id").order("observer_id").range(bas, son)
    ),
    tumKayitlar<{ rater_id: string; target_id: string; is_self: boolean; created_at: string }>((bas, son) =>
      db.from("ratings").select("rater_id, target_id, is_self, created_at").order("created_at").range(bas, son)
    ),
    db
      .from("missions")
      .select("participant_id, status, responded_at, issued_at")
      .gte("issued_at", s48),
    db
      .from("missions")
      .select("ai_score")
      .in("kind", ["cesaret", "simulasyon"])
      .not("ai_score", "is", null),
    db
      .from("momentum_scores")
      .select("participant_id, score")
      .eq("week_start", haftaBaslangici(simdi)),
    db
      .from("churn_radar")
      .select("participant_id, admin_alerted_at")
      .not("admin_alerted_at", "is", null)
      .gte("admin_alerted_at", s24),
    db
      .from("settings")
      .select("key, value")
      .in("key", ["sistem_modu", "yolculuk_baslangic"]),
  ]);

  const kisiHarita = new Map((kisiler ?? []).map((k) => [k.id, k]));
  const takimHarita = new Map((kisiler ?? []).map((k) => [k.id, k.team]));

  // Eksen hammaddesi
  const aktifler = new Set<string>();
  const sonEtkinlik = new Map<string, number>();
  let caprazBag = 0;
  const ciftler = new Set<string>();
  for (const p of puanlar ?? []) {
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

  const beklenenPuan =
    ((atamalar ?? []).length + (kisiler ?? []).length) * ozellikler.length;

  const radar = radarHesapla({
    toplamKisi: (kisiler ?? []).length,
    aktif24s: aktifler.size,
    verilen48s: (gorevler48 ?? []).length,
    teslim48s: (gorevler48 ?? []).filter((g) => g.responded_at !== null).length,
    caprazBag,
    toplamBag: ciftler.size,
    beklenenPuan,
    girilenPuan: (puanlar ?? []).filter((p) => !p.is_self).length,
    direncPuanlari: (direncler ?? []).map((d) => d.ai_score as number),
  });

  const eksenler = [
    { ad: t.eksenler.katilim, deger: radar.katilim },
    { ad: t.eksenler.gorevMomentumu, deger: radar.gorevMomentumu },
    { ad: t.eksenler.aidiyet, deger: radar.aidiyet },
    { ad: t.eksenler.tamamlama, deger: radar.tamamlama },
    { ad: t.eksenler.retDirenci, deger: radar.retDirenci },
  ];

  const momentumListe = (momentumlar ?? [])
    .map((m) => ({
      ad: kisiHarita.get(m.participant_id)?.full_name ?? "—",
      skor: m.score,
    }))
    .sort((a, b) => b.skor - a.skor);
  const ekipOrt = momentumListe.length
    ? Math.round(
        momentumListe.reduce((tpl, m) => tpl + m.skor, 0) / momentumListe.length
      )
    : null;

  const kaymaListe = (kaymalar ?? [])
    .map((k) => {
      const son = sonEtkinlik.get(k.participant_id);
      return {
        ad: kisiHarita.get(k.participant_id)?.full_name ?? "—",
        saat: son
          ? Math.round((simdi.getTime() - son) / 3_600_000)
          : null,
      };
    })
    .sort((a, b) => (b.saat ?? 999) - (a.saat ?? 999));

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const mod = ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp";
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const yolculukGunu =
    mod === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, simdi))
      : null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex justify-end">
        <OtoYenile saniye={20} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display altin-metin text-3xl font-bold leading-tight">
            🎛 {t.baslik}
          </h1>
          <Ipucu {...tr.admin.yardim.komutan} />
        </div>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
        <p className="mt-2 text-sm font-semibold text-gold-light">
          {t.modBaslik}:{" "}
          {mod === "yolculuk" && yolculukGunu !== null
            ? `${t.modYolculuk} — ${t.yolculukGunu(yolculukGunu, fazBul(yolculukGunu).ad)}`
            : t.modKamp}
        </p>
      </div>

      <section className="kart-3d relative rounded-2xl bg-midnight-card/60 p-6 ring-1 ring-gold/30 backdrop-blur">
        <span className="absolute right-3 top-3">
          <Ipucu {...tr.admin.yardim.komutanRadar} />
        </span>
        <RadarSVG degerler={eksenler} />
      </section>

      <Katlanir baslik={t.detayBaslik} ikon="📊">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
            {t.momentumBaslik}
            <Ipucu {...tr.admin.yardim.komutanMomentum} />
          </h2>
          {momentumListe.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">{t.momentumYok}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-300">{t.ekipOrt(ekipOrt ?? 0)}</p>
              <ul className="mt-3 space-y-1.5">
                {momentumListe.slice(0, 10).map((m) => (
                  <li key={m.ad} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{m.ad}</span>
                    <span
                      className={`font-bold ${
                        m.skor >= 70
                          ? "text-emerald-300"
                          : m.skor >= 45
                            ? "text-gold"
                            : "text-red-300"
                      }`}
                    >
                      {m.skor}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
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
      </div>
      </Katlanir>
    </main>
  );
}
