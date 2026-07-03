import QRCode from "qrcode";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rozetleriGetir, ROZETLER } from "@/lib/rozet";
import { BAGLANTI_TABANI } from "@/lib/whatsappSablonlari";

export const metadata = { title: "El Ele — Liderlik Aynası" };
export const revalidate = 0;

// [KURULUM 8] El Ele merkezi: kişi kendi QR'ını yanındakine gösterir (komşu
// okutup kurulumunu doğrular) + kazandığı rozetleri görür.
export default async function ElElePage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: kisi }, rozetler] = await Promise.all([
    db.from("participants").select("camp_unlock_token").eq("id", session.sub).maybeSingle(),
    rozetleriGetir(db, session.sub),
  ]);
  const { count: pushSayisi } = await db
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub);
  const pushVar = (pushSayisi ?? 0) > 0;

  const token = kisi?.camp_unlock_token ?? null;
  const qr = token
    ? await QRCode.toDataURL(`${BAGLANTI_TABANI}/kurulum-sahit?u=${token}`, {
        width: 240,
        margin: 1,
        color: { dark: "#0a1826", light: "#f6f0dc" },
      })
    : null;

  const elEle = rozetler.some((r) => r.kod === "el_ele");

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-5 p-6">
        <header className="text-center">
          <h1 className="font-display altin-metin text-2xl font-bold">🤝 El Ele</h1>
          <p className="mt-1 text-sm text-slate-400">
            Yanındakinin telefonuna AYNA kurulu mu? Birbirinizi doğrulayın — ikiniz de rozet kazanın.
          </p>
        </header>

        {/* Kazanılan rozetler */}
        {rozetler.length > 0 && (
          <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rozetlerin</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rozetler.map((r) => (
                <span
                  key={r.kod}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold-light"
                  title={ROZETLER[r.kod]?.aciklama}
                >
                  {r.ikon} {r.ad} <span className="text-xs text-gold-light/70">+{r.kivilcim}⚡</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* QR — yanındakine göster */}
        {!pushVar ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <p className="text-sm text-amber-100">
              Önce <span className="font-semibold">sen</span> bildirimini aç — sonra yanındakiyle el ele tutuşun.
            </p>
            <Link href="/" className="mt-3 inline-block text-sm font-semibold text-gold-light underline-offset-4 hover:underline">
              Bildirimi aç →
            </Link>
          </section>
        ) : elEle ? (
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-5 text-center">
            <p className="text-4xl" aria-hidden>🤝</p>
            <p className="mt-2 font-semibold text-emerald-300">El ele tutuştun!</p>
            <p className="mt-1 text-sm text-slate-400">Bir yol arkadaşınla birbirinizin kurulumunu doğruladınız.</p>
          </section>
        ) : (
          <section className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-5 text-center">
            <p className="text-sm text-slate-300">
              Bu kodu <span className="font-semibold text-gold-light">yanındaki kişiye göster</span> — kamerasıyla okutup
              kurulumunu doğrulasın.
            </p>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="El ele doğrulama QR kodu" className="mx-auto mt-4 h-52 w-52 rounded-xl" />
            ) : (
              <p className="mt-4 text-sm text-slate-500">QR hazırlanamadı.</p>
            )}
          </section>
        )}

        <p className="text-center">
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
