import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.ux.akis;

type Adim = { etiket: string; acik: boolean; href: string };

// #3 Kamp akışı sıralayıcı: tehlike bölgesindeki anahtarları programa bağlı bir
// adım dizisi olarak gösterir. "ŞU AN" açık olanı, "SIRADAKİ" bir sonraki
// açılacak anahtarı vurgular. Bağımlılık koruması: rapor açıkken mühür kapalıysa
// uyarır. Her adım ilgili kontrole zıplar.
export default async function AkisDizisi() {
  const db = supabaseAdmin();
  const [{ data: dalgalar }, { data: ayarlar }, { count: eslestirmeSayi }] = await Promise.all([
    db.from("waves").select("id, name, is_open, opened_at").order("id"),
    db
      .from("settings")
      .select("key, value")
      .in("key", [
        "pusula_acik",
        "on_farkindalik_acik",
        "kamp_kilit_kodu",
        "bosluk_acik",
        "reports_visible",
        "muhur_acik",
      ]),
    db.from("assignments").select("id", { count: "exact", head: true }),
  ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const acikMi = (k: string) => ayar.get(k) === "true";

  const adimlar: Adim[] = [
    { etiket: t.adimHazirlik, acik: acikMi("pusula_acik"), href: "/admin#fazsifir" },
    { etiket: t.adimOnFark, acik: acikMi("on_farkindalik_acik"), href: "/admin#onfark" },
    ...(dalgalar ?? []).map((d) => ({
      etiket: t.adimDalga(d.id),
      acik: d.is_open,
      href: "/admin#dalga",
    })),
    { etiket: t.adimBosluk, acik: acikMi("bosluk_acik"), href: "/admin#fazbir" },
    { etiket: t.adimRapor, acik: acikMi("reports_visible"), href: "/admin#ayna-ani" },
    { etiket: t.adimMuhur, acik: acikMi("muhur_acik"), href: "/admin#muhur" },
  ];

  // Son açık adım = "şu an"; ondan önceki açıklar "tamam"; hemen sonrası "sıradaki".
  let sonAcik = -1;
  adimlar.forEach((a, i) => {
    if (a.acik) sonAcik = i;
  });
  const siradaki = sonAcik + 1 < adimlar.length ? sonAcik + 1 : -1;

  // #2 Bağımlılık kapısı: sıra atlanınca uyar. Her uyarı kritik bir önkoşulun
  // eksik olduğunu söyler — operatör yanlış sırada anahtar açmasın.
  const raporAcik = acikMi("reports_visible");
  const muhurAcik = acikMi("muhur_acik");
  const boslukAcik = acikMi("bosluk_acik");
  const dalgaAcikVar = (dalgalar ?? []).some((d) => d.is_open);
  const kilitKodu = (ayar.get("kamp_kilit_kodu") ?? "").trim();
  const uyarilar: string[] = [];
  if (acikMi("pusula_acik") && !kilitKodu) uyarilar.push(t.uyariKilitKodu);
  if (dalgaAcikVar && (eslestirmeSayi ?? 0) === 0) uyarilar.push(t.uyariEslestirme);
  // #5 Final sırası: Boşluk ve Mühür, raporlardan ÖNCE açılmamalı.
  if (boslukAcik && !raporAcik) uyarilar.push(t.uyariBoslukRapor);
  if (muhurAcik && !raporAcik) uyarilar.push(t.uyariMuhurRapor);
  if (raporAcik && !muhurAcik) uyarilar.push(t.uyariMuhur);

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200">
        🎬 {t.baslik}
        <Ipucu baslik={t.baslik} metin={[t.aciklama]} />
      </h2>

      <ol className="mt-4 space-y-1">
        {adimlar.map((a, i) => {
          const durum =
            i < sonAcik && !a.acik
              ? "tamam"
              : a.acik
                ? "suan"
                : i === siradaki
                  ? "siradaki"
                  : "bekliyor";
          return (
            <li key={`${a.etiket}-${i}`}>
              <Link
                href={a.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                  durum === "suan"
                    ? "bg-emerald-500/10 ring-1 ring-emerald-400/30"
                    : durum === "siradaki"
                      ? "parilti bg-gold/10 ring-1 ring-gold/40"
                      : "hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    durum === "suan"
                      ? "bg-emerald-400 text-[#1a1206]"
                      : durum === "tamam"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : durum === "siradaki"
                          ? "bg-gold text-[#1a1206]"
                          : "bg-white/5 text-slate-500"
                  }`}
                  aria-hidden
                >
                  {durum === "tamam" ? t.tamam : i + 1}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    durum === "bekliyor" ? "text-slate-500" : "text-slate-100"
                  }`}
                >
                  {a.etiket}
                </span>
                {durum === "suan" && (
                  <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-300">
                    {t.suan}
                  </span>
                )}
                {durum === "siradaki" && (
                  <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wide text-gold-light">
                    {t.siradaki}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {uyarilar.length > 0 && (
        <div className="mt-3 space-y-2">
          {uyarilar.map((u) => (
            <p
              key={u}
              className="rounded-xl bg-amber-900/20 px-4 py-2.5 text-sm font-medium text-amber-300"
            >
              ⚠️ {u}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
