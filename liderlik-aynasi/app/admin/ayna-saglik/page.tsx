import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaSaglik, type SaglikDurumu } from "@/lib/aynaSaglik";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "AYNA Sağlık — Liderlik Aynası" };

const DURUM_STIL: Record<SaglikDurumu, { etiket: string; renk: string; ikon: string }> = {
  iyi: { etiket: "Her şey yolunda", renk: "text-emerald-300 ring-emerald-400/40 bg-emerald-500/10", ikon: "🟢" },
  uyari: { etiket: "Dikkat — birkaç hata var", renk: "text-amber-300 ring-amber-400/40 bg-amber-500/10", ikon: "🟡" },
  kritik: { etiket: "Kritik — hemen bak", renk: "text-red-300 ring-red-400/40 bg-red-500/10", ikon: "🔴" },
};

function zaman(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AynaSaglikPage() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  const s = await aynaSaglik(supabaseAdmin());
  const d = DURUM_STIL[s.durum];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 pb-28 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🩺 AYNA Sağlık Panosu</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        150 kişi aynı anda AYNA&apos;ya vururken her şey yolunda mı? Son 24 saatin özeti.
      </p>

      {/* Durum rozeti */}
      <section className={`rounded-2xl p-6 text-center ring-1 ${d.renk}`}>
        <p className="text-5xl" aria-hidden>{d.ikon}</p>
        <p className="mt-2 text-xl font-bold">{d.etiket}</p>
        <p className="mt-1 text-sm opacity-80">Son 24 saatte {s.toplamHata} AI hatası</p>
      </section>

      {/* Günün AI iş hacmi */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          Bugünün AI iş hacmi
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-2xl font-bold text-gold">{s.bugunUretilen}</p>
            <p className="text-xs text-slate-400">üretilen görev</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-2xl font-bold text-emerald-300">{s.bugunPuanlanan}</p>
            <p className="text-xs text-slate-400">puanlanan</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-2xl font-bold text-amber-300">{s.bugunBekleyen}</p>
            <p className="text-xs text-slate-400">puanlama bekliyor</p>
          </div>
        </div>
      </section>

      {/* Hata dağılımı */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          Hata kaynakları (24 saat)
        </h2>
        {s.hatalar.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-300">Hiç AI hatası yok — temiz. ✓</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {s.hatalar.map((h) => (
              <li key={h.kaynak} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5">
                <span className="text-sm text-slate-200">{h.kaynak}</span>
                <span className="font-bold text-red-300">{h.sayi}</span>
              </li>
            ))}
          </ul>
        )}
        {s.sonHata && (
          <div className="mt-3 rounded-xl border border-red-400/25 bg-red-950/20 p-3">
            <p className="text-xs font-semibold text-red-300">
              Son hata · {s.sonHata.kaynak} · {zaman(s.sonHata.ts)}
            </p>
            <p className="mt-1 break-words font-mono text-xs text-red-100/80">{s.sonHata.mesaj}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Not: Kredi bitmesi / anahtar geçersiz gibi kritik hatalar zaten otomatik e-posta uyarısı
          tetikler. Bu panel canlı izleme içindir.
        </p>
      </section>

      {/* Kriz bayrakları — insan müdahalesi gereken */}
      {s.krizBayragi > 0 && (
        <section className="rounded-2xl border-2 border-orange-400/40 bg-orange-500/[0.08] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-orange-200">
            🟠 {s.krizBayragi} kriz bayrağı (24 saat)
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Bir katılımcının yazısında kriz/umutsuzluk sinyali yakalandı ve Presidential Diamond
            ekibine iletildi. Lütfen takip edildiğinden emin olun.
          </p>
        </section>
      )}

      <Link href="/admin" className="block text-center text-sm text-royal-light hover:underline">
        ← Yönetim paneline dön
      </Link>
    </main>
  );
}
