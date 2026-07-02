import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cascadeKiti } from "@/lib/cascade";
import CascadePaylas from "./CascadePaylas";

export const metadata = { title: "Cascade Kiti — Liderlik Aynası" };
export const revalidate = 0;

// [5.3] CASCADE KİTİ — kişinin kendi sözünden kopyalanabilir bir kit; kendi
// ekibine taşır. Söz/aksiyon yoksa nazik bir yönlendirme gösterir.
export default async function CascadePage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name")
    .eq("id", session.sub)
    .maybeSingle();
  const kit = await cascadeKiti(db, session.sub, kisi?.full_name ?? "");

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🌊 Cascade Kiti</h1>
          <p className="mt-1 text-sm text-slate-400">
            Öğrendiğin işe yarıyorsa, çoğalt. Kendi sözünden çıkan 3 adımı ekibinden bir kişiye taşı.
          </p>
        </header>

        {kit.hazir ? (
          <>
            <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Kopyalanabilir 3 adım</p>
              <ol className="space-y-2">
                {kit.adimlar.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-light">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
            <CascadePaylas metin={kit.metin} />
          </>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-midnight-card/50 p-5 text-center text-sm text-slate-400">
            Kitini kurmak için önce kamptaki sözünü tamamla. Sözündeki aksiyonlar buraya kopyalanabilir adımlar olarak
            gelecek.
          </p>
        )}
      </div>
    </main>
  );
}
