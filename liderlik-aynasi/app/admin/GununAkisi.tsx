import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampGunu } from "@/lib/kampProgrami";
import { KAMP_ADMIN_AKISI, type AkisAdimi } from "@/lib/kampAdminAkisi";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.akis;

// [ADMIN-UX2] Adım gerçekten yapıldı mı — sistem sinyallerinden CANLI türetilir;
// operatör "bunu yapmış mıydım?" diye hatırlamaya çalışmaz. Sinyali olmayan
// adım (ör. sahnede yönetilen Senkron An) rozetsiz kalır (null).
function adimTamamMi(
  a: AkisAdimi,
  s: {
    sahneAnons: string;
    dalgaAcik: boolean;
    bugunKapananDalga: boolean;
    raporlarAcik: boolean;
    sozAcik: boolean;
  }
): boolean | null {
  const e = a.etiket;
  if (e.startsWith("Açılış Anonsu")) return s.sahneAnons.startsWith("acilis:");
  if (e.startsWith("Ayna Anı")) return s.sahneAnons.startsWith("ayna-ani:");
  if (e.startsWith("Kamp Değerlendirmesini aç")) return s.dalgaAcik || s.bugunKapananDalga;
  if (e.startsWith("Değerlendirmeyi kapat")) return s.bugunKapananDalga;
  if (e.startsWith("Ayna Raporlarını aç")) return s.raporlarAcik;
  if (e.startsWith("Kapanış Sözünü aç")) return s.sozAcik;
  return null; // sinyalsiz adım — rozet gösterme
}

// #2 Bugünün Akışı: kamp günündeyse o günün admin adımlarını sıralı checklist
// olarak gösterir. Kamp günü değilse (öncesi/sonrası) hiç görünmez.
export default async function GununAkisi({
  bugun,
  baslangic,
}: {
  bugun: string;
  baslangic?: string;
}) {
  const gun = kampGunu(bugun, baslangic);
  if (!gun) return null;
  const adimlar = KAMP_ADMIN_AKISI[gun];

  // Canlı sinyaller — tek Promise.all, hafif sorgular.
  const db = supabaseAdmin();
  const [{ data: ayarlar }, { data: dalgalar }] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["sahne_anons", "reports_visible", "kapanis_soz_acik"]),
    db.from("waves").select("is_open, closed_at"),
  ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const sinyaller = {
    sahneAnons: ayar.get("sahne_anons") ?? "",
    dalgaAcik: (dalgalar ?? []).some((d) => d.is_open),
    bugunKapananDalga: (dalgalar ?? []).some(
      (d) =>
        d.closed_at &&
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(d.closed_at)) === bugun
    ),
    raporlarAcik: ayar.get("reports_visible") === "true",
    sozAcik: ayar.get("kapanis_soz_acik") === "true",
  };

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="text-lg font-semibold text-gold-light">
        {t.baslik}
        <span className="ml-2 text-sm font-normal text-slate-400">· Gün {gun}/3</span>
        <Ipucu {...tr.admin.yardim.panelGun} />
      </h2>
      <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      <ol className="mt-4 space-y-2">
        {adimlar.map((a, i) => {
          const tamam = adimTamamMi(a, sinyaller);
          return (
            <li key={i}>
              <Link
                href={a.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-white/[0.07] ${
                  tamam === true ? "border-emerald-400/20 bg-emerald-400/[0.04] opacity-75" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    tamam === true ? "bg-emerald-500 text-[#1a1206]" : "bg-royal/40 text-gold-light"
                  }`}
                >
                  {tamam === true ? "✓" : i + 1}
                </span>
                {a.saat && (
                  <span className="shrink-0 rounded-md bg-gold/15 px-2 py-0.5 font-mono text-xs font-bold text-gold-light">
                    {a.saat}
                  </span>
                )}
                <span className={`text-sm font-medium ${tamam === true ? "text-slate-400" : "text-slate-100"}`}>
                  {a.etiket}
                </span>
                {tamam === false && (
                  <span className="ml-auto shrink-0 text-xs font-semibold text-amber-300">bekliyor</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
