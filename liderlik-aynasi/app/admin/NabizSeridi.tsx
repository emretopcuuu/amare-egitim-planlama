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
  );
}
