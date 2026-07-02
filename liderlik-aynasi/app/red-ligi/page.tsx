import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "En Cesur 10 — Liderlik Aynası" };
export const revalidate = 60;

// [4.4] REDDİ KUTLA LİGİ — aylık "En Cesur 10": red SAYISI sıralaması. Çerçeve
// pozitif: az reddi olan ASLA ifşa edilmez, yalnız ilk 10 kutlanır. Red = cesaret
// kanıtı ("EVET derlerse yapmaları gerekene hayır derler").
export default async function RedLigiPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  // Bu ayın başı (Istanbul).
  const now = new Date();
  const ayBasi = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [{ data: redler }, { data: kisiler }] = await Promise.all([
    db.from("redler").select("participant_id").gte("created_at", ayBasi),
    db.from("participants").select("id, full_name").eq("role", "participant"),
  ]);
  const adHarita = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
  const sayac = new Map<string, number>();
  for (const r of redler ?? []) sayac.set(r.participant_id, (sayac.get(r.participant_id) ?? 0) + 1);

  const ilk10 = [...sayac.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, n], i) => ({ sira: i + 1, ad: adHarita.get(id) ?? "—", sayi: n, ben: id === session.sub }));

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🔥 En Cesur 10</h1>
          <p className="mt-1 text-sm text-slate-400">
            Bu ayın en çok {`"hayır"`} duyanları. Red = kayıp değil, sahada olduğunun kanıtı.
          </p>
        </header>

        {ilk10.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-midnight-card/50 p-5 text-center text-sm text-slate-400">
            Bu ay ilk cesur adım seni bekliyor. Bir {`"hayır"`} topla — liderliğin başlangıcı.
          </p>
        ) : (
          <ol className="space-y-2">
            {ilk10.map((k) => (
              <li
                key={k.sira}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  k.ben ? "border-gold/50 bg-gold/[0.08]" : "border-white/10 bg-midnight-card/50"
                }`}
              >
                <span className="w-8 text-center text-2xl">{["🥇", "🥈", "🥉"][k.sira - 1] ?? `${k.sira}.`}</span>
                <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-100">
                  {k.ad} {k.ben && <span className="text-gold-light">· sen</span>}
                </span>
                <span className="shrink-0 font-mono text-lg font-bold text-orange-300">{k.sayi} 🔥</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-center text-xs text-slate-500">
          Yalnız ilk 10 gösterilir — kimse az reddi için görünmez. Herkes kendi cesaretinde yarışır.
        </p>
      </div>
    </main>
  );
}
