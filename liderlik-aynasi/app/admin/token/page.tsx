import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tokenRaporu, type TokenOzet, type TokenSatir } from "@/lib/tokenRapor";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "AI Token & Maliyet — Liderlik Aynası" };
export const revalidate = 0;

// 🪙 AI TOKEN & MALİYET — ai_istek_log'a her Anthropic çağrısının gerçek usage'ı
// (aynaClient wrapper) yazılır → burada tahmin değil KESİN token/maliyet dökümü.
// Maliyet USD tahmini yayınlanan model fiyatlarından (lib/tokenRapor.ts).

const sayiFmt = new Intl.NumberFormat("tr-TR");
function tok(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return sayiFmt.format(n);
}
function usd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

function KirilimTablo({ baslik, satirlar }: { baslik: string; satirlar: TokenSatir[] }) {
  if (satirlar.length === 0) {
    return <p className="text-sm text-slate-500">{baslik}: kayıt yok.</p>;
  }
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{baslik}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500">
              <th className="py-1.5 pr-3 font-medium">Kaynak/Model</th>
              <th className="py-1.5 pr-3 text-right font-medium">Çağrı</th>
              <th className="py-1.5 pr-3 text-right font-medium">Girdi</th>
              <th className="py-1.5 pr-3 text-right font-medium">Çıktı</th>
              <th className="py-1.5 text-right font-medium">Maliyet</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => (
              <tr key={s.anahtar} className="border-b border-white/5">
                <td className="py-1.5 pr-3 font-mono text-xs text-slate-300">{s.anahtar}</td>
                <td className="py-1.5 pr-3 text-right text-slate-300">{sayiFmt.format(s.cagri)}</td>
                <td className="py-1.5 pr-3 text-right text-slate-400">{tok(s.girdi)}</td>
                <td className="py-1.5 pr-3 text-right text-slate-400">{tok(s.cikti)}</td>
                <td className="py-1.5 text-right font-medium text-gold-light">{usd(s.maliyet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PencereKarti({ ozet }: { ozet: TokenOzet }) {
  return (
    <section className="rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-gold">{ozet.baslik}</h2>
        <span className="text-2xl font-bold text-gold-light">{usd(ozet.maliyet)}</span>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-xl font-bold text-slate-100">{sayiFmt.format(ozet.cagri)}</div>
          <div className="text-xs text-slate-500">çağrı</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-xl font-bold text-slate-100">{tok(ozet.girdi)}</div>
          <div className="text-xs text-slate-500">girdi token</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-xl font-bold text-slate-100">{tok(ozet.cikti)}</div>
          <div className="text-xs text-slate-500">çıktı token</div>
        </div>
      </div>
      <div className="space-y-5">
        <KirilimTablo baslik="Kaynağa göre" satirlar={ozet.kaynaklar} />
        <KirilimTablo baslik="Modele göre" satirlar={ozet.modeller} />
      </div>
    </section>
  );
}

export default async function TokenPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { son24, bugun } = await tokenRaporu(db);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🪙 AI Token & Maliyet</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        Her Anthropic çağrısının gerçek token kullanımı (tahmin değil) kaydedilir. Maliyet, yayınlanan model
        fiyatlarından hesaplanan USD tahminidir; kaynağı bilinmeyen çağrılar Opus fiyatıyla (üst sınır) sayılır.
      </p>

      <PencereKarti ozet={son24} />
      <PencereKarti ozet={bugun} />

      <p className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-500">
        Not: Token muhasebesi 22 Tem 2026&apos;da açıldı; ondan önceki çağrılar token&apos;sız kaydedildiği için bu
        dökümde görünmez. &quot;bilinmiyor&quot; kaynak = çağrı yerinde etiket verilmemiş (toplam yine doğru).
      </p>

      <Link href="/admin/sistem" className="block text-center text-sm text-royal-light hover:underline">
        ← Sistem &amp; Bakım&apos;a dön
      </Link>
    </main>
  );
}
