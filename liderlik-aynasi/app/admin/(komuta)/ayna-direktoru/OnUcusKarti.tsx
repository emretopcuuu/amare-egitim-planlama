import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nabizOku } from "@/lib/nabiz";

// [ADMIN-UX1] KAMPI BAŞLAT ÖN-UÇUŞU — "uyandır"a basmadan önce sistemin tek
// kartta röntgeni: cron nabzı, senaryo satırları, katılımcı hazırlığı, saat
// çıpası. Yalnız kamp KAPALIYKEN görünür (başladıktan sonra gürültü olmasın).
type Kontrol = { ad: string; tamam: boolean; detay: string; href?: string };

export default async function OnUcusKarti() {
  const db = supabaseAdmin();
  const [
    nabiz,
    { count: katilimci },
    { count: bekleyenSatir },
    { data: baslangicAyar },
    { data: degerlerTamam },
    { data: kisiler },
    { data: aboneler },
  ] = await Promise.all([
    nabizOku(db),
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db.from("kamp_senaryosu").select("id", { count: "exact", head: true }).eq("durum", "bekliyor"),
    db.from("settings").select("value").eq("key", "ayna_baslangic").maybeSingle(),
    db.from("degerler_calismasi").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("participants").select("id, team").eq("role", "participant"),
    db.from("push_subscriptions").select("participant_id"),
  ]);
  if (nabiz.kampAcik) return null; // kamp zaten açık — ön-uçuşa gerek yok

  const toplam = katilimci ?? 0;
  const oyunlu = (kisiler ?? []).filter((k) => k.team).length;
  const degerlerN = new Set((degerlerTamam ?? []).map((r) => r.participant_id)).size;
  const pushluN = new Set((aboneler ?? []).map((a) => a.participant_id)).size;

  const kontroller: Kontrol[] = [
    {
      ad: "Katılımcılar",
      tamam: toplam > 0,
      detay: `${toplam} kişi kayıtlı`,
      href: "/admin/katilimcilar",
    },
    {
      ad: "Cron nabzı",
      tamam: nabiz.olaylarDk !== null && nabiz.olaylarDk <= 5 && nabiz.tikDk !== null && nabiz.tikDk <= 12,
      detay: `tik ${nabiz.tikDk ?? "—"} dk · olaylar ${nabiz.olaylarDk ?? "—"} dk önce`,
      href: "/admin/senaryo",
    },
    {
      ad: "Senaryo",
      tamam: (bekleyenSatir ?? 0) > 0 && !nabiz.durduruldu,
      detay: nabiz.durduruldu
        ? "orkestratör DURDURULMUŞ — önce Devam'a bas"
        : `${bekleyenSatir ?? 0} satır ateşlenmeye hazır`,
      href: "/admin/senaryo",
    },
    {
      ad: "Onboarding",
      tamam: toplam > 0 && degerlerN >= toplam && oyunlu >= toplam,
      detay: `değerler ${degerlerN}/${toplam} · oyun ${oyunlu}/${toplam} · push ${pushluN}/${toplam}`,
      href: "/admin/katilimcilar",
    },
  ];
  const dahaOnceBaslamis = !!baslangicAyar?.value;
  const hepsiTamam = kontroller.every((k) => k.tamam);

  return (
    <section
      className={`rounded-2xl border p-5 ${
        hepsiTamam ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-amber-500/40 bg-amber-500/[0.06]"
      }`}
    >
      <h2 className="text-base font-bold text-slate-100">
        🛫 Kampı Başlat — ön-uçuş {hepsiTamam ? "· hepsi yeşil, hazırsın" : "· eksikler var"}
      </h2>
      <ul className="mt-3 space-y-1.5">
        {kontroller.map((k) => (
          <li key={k.ad} className="flex items-baseline gap-2 text-sm">
            <span className={k.tamam ? "text-emerald-300" : "text-amber-300"} aria-hidden>
              {k.tamam ? "✓" : "⚠"}
            </span>
            <span className="font-semibold text-slate-200">{k.ad}:</span>
            <span className="min-w-0 flex-1 text-slate-400">{k.detay}</span>
            {k.href && !k.tamam && (
              <Link href={k.href} className="shrink-0 text-xs text-royal-light hover:underline">
                düzelt →
              </Link>
            )}
          </li>
        ))}
      </ul>
      {dahaOnceBaslamis && (
        <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          ⚠ Saat çıpası daha önce kurulmuş (ayna_baslangic dolu) — &quot;uyandır&quot; saati SIFIRLAMAZ, senaryo
          eski güne göre akar. Yeni kamp içinse önce Sistem → Yeni Kamp sıfırlaması yap.
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Not: Onboarding eksikleri kampı teknik olarak engellemez — eksik kalan katılımcı kendi hızında
        tamamlar. Cron nabzı ve senaryo satırları ise zorunludur.
      </p>
    </section>
  );
}
