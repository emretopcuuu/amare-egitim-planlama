import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
import CumartesiGrupHud from "@/components/CumartesiGrupHud";
import GeriButonu from "@/components/GeriButonu";
import { kampGunleri } from "@/lib/kampProgrami";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { grupUyeleri, YONETIM } from "@/lib/icMesaj";

export const metadata = { title: "Grubunun Ödevi — Liderlik Aynası" };

const t = tr.grup;

// Katılımcı: kendi grubunun aktif ödev(ler)ini görür (grup-içi + grup-birlikte).
export default async function GrupSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();

  let odevler: { tip: string; baslik: string; govde: string; hedef: string | null }[] = [];
  if (kisi?.team) {
    const { data } = await db
      .from("grup_odev")
      .select("tip, baslik, govde, hedef")
      .eq("takim", kisi.team)
      .eq("aktif", true)
      .order("created_at", { ascending: false });
    odevler = data ?? [];
  }

  // Grup arkadaşları (ben hariç) + her birinden gelen okunmamış mesaj sayısı.
  const uyeler = kisi?.team ? await grupUyeleri(db, kisi.team, session.sub) : [];

  // Cumartesi (Gün 2) tarihi kampın başlatıldığı tarihten türetilir (sabit değil).
  const cumartesiTarih = kampGunleri(await kampBaslangicGetir(db))[1];

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.baslik}</h1>
        {kisi?.team && <p className="mt-1 text-sm text-slate-400">{t.altBaslik(kisi.team)}</p>}
      </header>

      {/* Slice 5 — Cumartesi grup HUD: grubunun gün 2 akışı (canlı now/next). */}
      <CumartesiGrupHud takim={kisi?.team ?? null} cumartesiTarih={cumartesiTarih} />

      {/* GRUP ARKADAŞLARIN — listeden birine dokun → mesaj/sohbet (bildirim gider). */}
      {kisi?.team && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light/80">
              {t.arkadaslarBaslik}
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">{t.arkadaslarAlt}</p>
          </div>

          {uyeler.length === 0 ? (
            <p className="text-sm text-slate-400">{t.uyeYok}</p>
          ) : (
            <ul className="space-y-2.5">
              {uyeler.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/grup/sohbet/${u.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/12 bg-midnight-card/60 p-3 transition-colors hover:border-gold/40 active:scale-[0.99]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-lg font-bold text-gold-light ring-1 ring-gold/30">
                      {u.full_name.trim().charAt(0).toLocaleUpperCase("tr")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-100">
                        {u.full_name}
                      </span>
                      <span className="block text-xs text-slate-400">💬 Mesaj gönder</span>
                    </span>
                    {u.okunmamis > 0 && (
                      <span className="shrink-0 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-[#1a1206]">
                        {t.mesajRozet(u.okunmamis)}
                      </span>
                    )}
                    <span className="shrink-0 text-slate-500" aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* KAMP YÖNETİMİ — doğrudan admin'e yaz. */}
          <Link
            href={`/grup/sohbet/${YONETIM}`}
            className="flex items-center gap-3 rounded-2xl border border-royal/40 bg-royal/10 p-3 transition-colors hover:border-royal/60 active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-royal/25 text-lg ring-1 ring-royal/40" aria-hidden>
              🛡️
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-slate-100">{t.yonetimBaslik}</span>
              <span className="block text-xs text-slate-400">{t.yonetimAlt}</span>
            </span>
            <span className="shrink-0 text-slate-500" aria-hidden>›</span>
          </Link>
        </section>
      )}

      {!kisi?.team ? (
        <p className="text-sm text-slate-400">{t.takimsiz}</p>
      ) : odevler.length === 0 ? (
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-5xl" aria-hidden>👥</p>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{t.yok}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {odevler.map((o) => (
            <section key={o.tip} className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-gold/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                {o.tip === "grup_ici" ? t.grupIci : t.grupBirlikte}
                {o.hedef ? ` · ${t.hedefEtiket}: ${o.hedef}` : ""}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">{o.baslik}</h2>
              <p className="mt-2 text-base leading-relaxed text-slate-300">{o.govde}</p>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
