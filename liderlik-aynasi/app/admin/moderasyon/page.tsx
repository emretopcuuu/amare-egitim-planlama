import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import GizleButonu from "./GizleButonu";
import FotoModerasyon from "../foto/FotoModerasyon";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Moderasyon — Liderlik Aynası" };

const t = tr.admin.moderasyon;
const tf = tr.admin.fotoModerasyon;

// BİRLEŞİK MODERASYON (öneri #6): yorumlar + fotoğraflar tek sayfada, sunucu
// taraflı sekmelerle (?sekme=). Eskiden /admin/foto ayrı bir sayfaydı; artık
// bu sayfanın "Fotoğraflar" sekmesi. /admin/foto buraya yönlendirir.
export default async function ModerasyonPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");
  const sekme = (await searchParams).sekme === "foto" ? "foto" : "yorum";

  const db = supabaseAdmin();
  const kova = db.storage.from("sesler");

  // İki sekmenin de rozet sayısı için ikisini birden çek; ağır olan (imzalı
  // foto URL'leri) yalnız foto sekmesindeyken üretilir.
  const [{ data: yorumlar, error }, { data: bekleyenFotolar }] = await Promise.all([
    db
      .from("ratings")
      .select(
        "id, score, comment, wave, is_hidden, created_at, trait:traits(name), rater:participants!ratings_rater_id_fkey(full_name), target:participants!ratings_target_id_fkey(full_name)"
      )
      .eq("is_self", false)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("photos")
      .select("id, path, caption, gonderen:participants!photos_participant_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;

  const fotoSayi = (bekleyenFotolar ?? []).length;
  const fotolar =
    sekme === "foto"
      ? await Promise.all(
          (bekleyenFotolar ?? []).map(async (f) => {
            const { data } = await kova.createSignedUrl(f.path, 3600);
            return {
              id: f.id,
              url: data?.signedUrl ?? null,
              caption: f.caption,
              gonderen: f.gonderen?.full_name ?? "—",
            };
          })
        )
      : [];

  const sekmeler = [
    { k: "yorum", ad: t.sekmeYorum, sayi: (yorumlar ?? []).length, href: "/admin/moderasyon" },
    { k: "foto", ad: t.sekmeFoto, sayi: fotoSayi, href: "/admin/moderasyon?sekme=foto" },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gold">{t.birlesikBaslik}</h1>
            <Ipucu {...tr.admin.yardim.moderasyon} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {sekme === "foto" ? tf.aciklama : t.aciklama}
          </p>
        </div>
        <OtoYenile saniye={20} />
      </div>

      {/* Sekme şeridi — sunucu taraflı (link). Bekleyen sayısı rozette. */}
      <div className="flex gap-2">
        {sekmeler.map((s) => (
          <Link
            key={s.k}
            href={s.href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              sekme === s.k
                ? "bg-royal/40 text-gold-light"
                : "bg-midnight-card/60 text-slate-300 hover:bg-midnight-card"
            }`}
          >
            {s.ad}
            {s.sayi > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300">
                {s.sayi}
              </span>
            )}
          </Link>
        ))}
      </div>

      {sekme === "foto" ? (
        <FotoModerasyon fotolar={fotolar} />
      ) : (yorumlar ?? []).length === 0 ? (
        <p className="text-sm text-slate-400">{t.yorumYok}</p>
      ) : (
        <ul className="space-y-3">
          {(yorumlar ?? []).map((y) => (
            <li
              key={y.id}
              className={`kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 backdrop-blur ${
                y.is_hidden ? "opacity-60 ring-red-500/30" : "ring-royal/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="rounded-md bg-royal/30 px-2 py-0.5 text-royal-light">
                  Dalga {y.wave}
                </span>
                <span className="font-medium text-slate-300">{y.trait.name}</span>
                <span className="font-bold text-gold-light">{y.score}/10</span>
                {/* KVKK: değerlendiren kimliği ADMIN DAHİL kimseye sızmaz —
                    moderasyon için hedef + içerik yeterli. */}
                <span>
                  {t.kime}: {y.target.full_name}
                </span>
                {y.is_hidden && (
                  <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-medium text-red-400">
                    {t.gizliEtiket}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-100">{y.comment}</p>
              <div className="mt-3">
                <GizleButonu puanId={y.id} gizli={y.is_hidden} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
