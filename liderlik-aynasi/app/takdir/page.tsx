import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import TakdirGonder from "./TakdirGonder";
import TesekkurButonu from "./TesekkurButonu";
import Avatar from "@/components/Avatar";
import GeriButonu from "@/components/GeriButonu";
import { muhurBul } from "@/lib/takdirMuhur";

export const metadata = { title: "Takdir Duvarı — Liderlik Aynası" };

const t = tr.takdir;

export default async function TakdirPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: gelenler }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant")
      .neq("id", session.sub)
      .order("full_name"),
    db
      .from("kudos")
      .select(
        "id, message, created_at, tesekkur_edildi, kategori, from_id, gonderen:participants!kudos_from_id_fkey(full_name, profil_foto_path)"
      )
      .eq("to_id", session.sub)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
  ]);

  // A5 — "insanlar beni en çok neyde görüyor": gelen takdirlerdeki mühürleri say,
  // en sık olanı üstte bir rozetle göster (hiç mühür yoksa gizli).
  const muhurSayac = new Map<string, number>();
  for (const g of gelenler ?? []) {
    if (g.kategori) muhurSayac.set(g.kategori, (muhurSayac.get(g.kategori) ?? 0) + 1);
  }
  const enCokMuhur =
    [...muhurSayac.entries()].sort((a, b) => b[1] - a[1]).map(([kod]) => muhurBul(kod))[0] ?? null;

  // Gönderen avatarları için imzalı URL'ler
  const gonderenYollar = [
    ...new Set(
      (gelenler ?? [])
        .map((g) => g.gonderen?.profil_foto_path)
        .filter((p): p is string => !!p)
    ),
  ];
  const fotoUrl = new Map<string, string>();
  if (gonderenYollar.length > 0) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrls(gonderenYollar, 3600);
    for (const im of imzali ?? []) if (im.path && im.signedUrl) fotoUrl.set(im.path, im.signedUrl);
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        <TakdirGonder
          kisiler={(kisiler ?? []).map((k) => ({
            id: k.id,
            ad: k.full_name,
            takim: k.team,
          }))}
        />

        <section className="kart-cam rounded-3xl p-5">
          <h2 className="font-semibold text-gold-light">{t.gelenlerBaslik}</h2>
          {enCokMuhur && (
            <p className="mt-2 rounded-xl bg-gold/[0.08] px-3 py-2 text-sm font-medium text-gold-light">
              {t.muhurOzet(enCokMuhur.emoji, enCokMuhur.ad)}
            </p>
          )}
          {(gelenler ?? []).length === 0 ? (
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.gelenYok}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {(gelenler ?? []).map((g) => (
                <li key={g.id} className="rounded-2xl bg-white/[0.04] p-4">
                  {(() => {
                    const m = muhurBul(g.kategori);
                    return m ? (
                      <span className="mb-2 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold-light">
                        {m.emoji} {m.ad}
                      </span>
                    ) : null;
                  })()}
                  <p className="text-base leading-relaxed text-slate-100">
                    “{g.message}”
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        ad={g.gonderen?.full_name ?? "?"}
                        url={
                          g.gonderen?.profil_foto_path
                            ? fotoUrl.get(g.gonderen.profil_foto_path) ?? null
                            : null
                        }
                        boyut="sm"
                      />
                      <p className="truncate text-sm font-semibold text-gold-light">
                        {t.kimden(g.gonderen?.full_name ?? "Bir arkadaşın")}
                      </p>
                    </div>
                    {/* A4 — Cevap hakkı: gelen HER takdir karşılıksız kalmasın;
                        tek dokunuşluk teşekkür gönderene anında push olarak gider. */}
                    {g.tesekkur_edildi ? (
                      <span className="shrink-0 text-xs font-medium text-emerald-300">
                        🙏 Teşekkür edildi
                      </span>
                    ) : (
                      <div className="shrink-0">
                        <TesekkurButonu kudosId={g.id} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
