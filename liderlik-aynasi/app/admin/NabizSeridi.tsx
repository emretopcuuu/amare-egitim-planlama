import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nabizOku } from "@/lib/nabiz";

// [FAZ1-B] OTOMASYON NABIZ ŞERİDİ — her admin sayfasının üstünde ince durum
// çizgisi. Amaç: "sistem çalışıyor mu?" sorusuna bakışta cevap; cron durursa/
// orkestratör hata verirse ekran KIRMIZI söyler (bugüne dek görünmezdi).
export default async function NabizSeridi() {
  const n = await nabizOku(supabaseAdmin());

  // Tik 5 dk'da bir; 12 dk sessizlik = alarm. Olaylar dakikalık; 5 dk = alarm.
  const tikAlarm = n.tikDk === null || n.tikDk > 12;
  const olayAlarm = n.olaylarDk === null || n.olaylarDk > 5;
  const alarm = (n.kampAcik && (tikAlarm || olayAlarm)) || n.durduruldu || !!n.sonHata || n.hataSatirSayisi > 0;

  const dkYazi = (dk: number | null) => (dk === null ? "hiç" : dk === 0 ? "şimdi" : `${dk} dk önce`);

  return (
    <>
    <Link
      href="/admin/senaryo"
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-1.5 text-xs transition-colors ${
        alarm
          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
          : "border-white/5 bg-white/[0.02] text-slate-400"
      }`}
    >
      <span className={n.kampAcik ? "text-emerald-300" : "text-slate-500"}>
        {n.kampAcik ? "● AYNA aktif" : "○ Kamp kapalı"}
      </span>
      <span className={n.kampAcik && tikAlarm ? "font-semibold text-rose-300" : ""}>
        tik: {dkYazi(n.tikDk)}
      </span>
      <span className={n.kampAcik && olayAlarm ? "font-semibold text-rose-300" : ""}>
        olaylar: {dkYazi(n.olaylarDk)}
      </span>
      <span>senaryo: {n.bekleyen} bekliyor</span>
      {n.durduruldu && <span className="font-semibold text-amber-300">⏸ orkestratör DURDURULDU</span>}
      {n.hataSatirSayisi > 0 && (
        <span className="font-semibold text-rose-300">✕ {n.hataSatirSayisi} satır hata verdi — yeniden dene</span>
      )}
      {n.hataSatirSayisi === 0 && n.sonHata && <span className="font-semibold text-rose-300">⚠ hata: {n.sonHata}</span>}
    </Link>
    {/* [ADMIN-UX7] Alarm anında mini runbook — kırmızıyı gören operatör ne
        yapacağını aramasın; durumuna göre yalnız ilgili adımlar listelenir. */}
    {alarm && (
      <details className="border-b border-rose-500/20 bg-rose-500/[0.06] px-4 py-1.5 text-xs text-rose-100/90">
        <summary className="cursor-pointer font-semibold [&::-webkit-details-marker]:hidden">
          🧯 Ne yapmalıyım? (aç)
        </summary>
        <ol className="mt-1.5 list-decimal space-y-1 pb-1 pl-5 text-rose-100/80">
          {(n.hataSatirSayisi > 0 || n.sonHata) && (
            <li>
              Senaryo&apos;da kırmızı satırı bul → <span className="font-semibold">↻ yeniden dene</span>.
              İkinci denemede de düşerse satırı atla, olayı elle yap.
            </li>
          )}
          {n.durduruldu && (
            <li>
              Orkestratör elle durdurulmuş — bilinçli değilse Senaryo&apos;dan{" "}
              <span className="font-semibold">▶ Devam</span>.
            </li>
          )}
          {n.kampAcik && (tikAlarm || olayAlarm) && (
            <>
              <li>Cron susmuş görünüyor: 2-3 dk bekle, sayfayı yenile (tek gecikme olabilir).</li>
              <li>
                Düzelmediyse Supabase → Integrations → Cron&apos;da{" "}
                <span className="font-mono">ayna-tik</span> / <span className="font-mono">ayna-olaylar</span>{" "}
                aktif mi bak; bu sırada kritik senaryo satırını{" "}
                <span className="font-semibold">şimdi ateşle</span> ile elle yürüt.
              </li>
            </>
          )}
        </ol>
      </details>
    )}
    </>
  );
}
