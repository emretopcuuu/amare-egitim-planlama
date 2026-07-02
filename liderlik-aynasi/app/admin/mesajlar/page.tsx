import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { adminGelenKutusu } from "@/lib/icMesaj";
import OtoYenile from "../OtoYenile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ekip Mesajları — Liderlik Aynası" };

function zaman(ts: string): string {
  const fark = Date.now() - new Date(ts).getTime();
  if (fark < 60_000) return "az önce";
  if (fark < 3_600_000) return `${Math.floor(fark / 60_000)} dk önce`;
  if (fark < 86_400_000) return `${Math.floor(fark / 3_600_000)} sa önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

// EKİP MESAJLARI — katılımcılardan yönetime gelen mesajların gelen kutusu.
// Okunmamış üstte; bir kişiye dokun → sohbet + cevap. Takip için tek yer.
export default async function AdminMesajlarPage() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  const db = supabaseAdmin();
  const kutu = await adminGelenKutusu(db);
  const toplamOkunmamis = kutu.reduce((a, k) => a + k.okunmamis, 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-5">
      <OtoYenile />
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">💬 Ekip Mesajları</h1>
          <p className="mt-1 text-sm text-slate-400">
            Katılımcılardan yönetime gelen mesajlar. Bir kişiye dokun → oku ve cevapla.
          </p>
        </div>
        {toplamOkunmamis > 0 && (
          <span className="shrink-0 rounded-full bg-gold px-3 py-1 text-sm font-bold text-[#1a1206]">
            {toplamOkunmamis} yeni
          </span>
        )}
      </header>

      {kutu.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-midnight-card/50 px-6 py-12 text-center">
          <p className="text-4xl" aria-hidden>📭</p>
          <p className="mt-3 text-base font-medium text-slate-300">Henüz mesaj yok</p>
          <p className="mt-1 text-sm text-slate-500">
            Bir katılımcı yönetime yazdığında burada toplanır.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {kutu.map((k) => (
            <li key={k.kisiId}>
              <Link
                href={`/admin/mesajlar/${k.kisiId}`}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                  k.okunmamis > 0
                    ? "border-gold/40 bg-gold/[0.06] hover:border-gold/60"
                    : "border-white/10 bg-midnight-card/50 hover:border-white/20"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-royal/20 text-lg font-bold text-royal-light ring-1 ring-royal/30">
                  {k.ad.trim().charAt(0).toLocaleUpperCase("tr")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-slate-100">{k.ad}</span>
                    {k.takim && (
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] text-slate-300">
                        {k.takim}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-slate-400">{k.sonMesaj}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[0.65rem] text-slate-500">{zaman(k.sonZaman)}</span>
                  {k.okunmamis > 0 && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-[#1a1206]">
                      {k.okunmamis}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
