import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SenaryoUstKontrol, SenaryoSatirKontrol } from "./SenaryoKontrol";

export const metadata = { title: "Kamp Senaryosu — Liderlik Aynası" };
export const revalidate = 15;

// FAZ 9 — ORKESTRATÖR ZAMAN ÇİZELGESİ (salt-okunur). Kampın otomasyon satırları:
// geçmiş (✓ atesledi) / sıradaki (⏳ bekliyor) / atlanan. Ateşleme = orkestratör
// (/api/tik) işi; buradaki görünüm ne olduğunu ve ne zaman olacağını gösterir.
// İnteraktif "şimdi ateşle / atla / +15 dk kaydır" kontrolleri sonraki turda.
const DURUM_ETIKET: Record<string, { ikon: string; renk: string; ad: string }> = {
  atesledi: { ikon: "✓", renk: "text-emerald-300", ad: "ateşlendi" },
  bekliyor: { ikon: "⏳", renk: "text-slate-400", ad: "bekliyor" },
  atlandi: { ikon: "⏭", renk: "text-amber-300", ad: "atlandı" },
};

function eylemOzet(r: { eylem_tipi: string; eylem_hedef: string; eylem_deger: string | null }): string {
  if (r.eylem_tipi === "ayar_ac") return `${r.eylem_hedef} → açık`;
  if (r.eylem_tipi === "ayar_kapat") return `${r.eylem_hedef} → kapalı`;
  if (r.eylem_tipi === "push") return `herkese push`;
  return `fonksiyon: ${r.eylem_hedef}`;
}

function tetikOzet(r: {
  tetik_tipi: string;
  gun: number | null;
  saat: number | null;
  baz_olay: string | null;
  sonra_dk: number | null;
}): string {
  if (r.tetik_tipi === "kamp_gorelli") return `Gün ${r.gun} · ${String(r.saat).padStart(2, "0")}:00`;
  return `${r.baz_olay} + ${r.sonra_dk} dk`;
}

export default async function SenaryoPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: satirlar }, { data: kontrolAyar }] = await Promise.all([
    db
      .from("kamp_senaryosu")
      .select("id, olay_kodu, tetik_tipi, gun, saat, baz_olay, sonra_dk, eylem_tipi, eylem_hedef, eylem_deger, durum, atesleme_zamani, sira")
      .order("sira", { ascending: true }),
    db.from("settings").select("key, value").in("key", ["ayna_baslangic", "orkestrator_durduruldu", "senaryo_kaydirma_dk"]),
  ]);
  const satir = satirlar ?? [];
  const kontrol = new Map((kontrolAyar ?? []).map((a) => [a.key, a.value]));
  const kampBasladi = !!kontrol.get("ayna_baslangic");
  const durduruldu = kontrol.get("orkestrator_durduruldu") === "true";
  const kaydirmaDk = Number(kontrol.get("senaryo_kaydirma_dk")) || 0;
  const bekleyen = satir.filter((r) => r.durum === "bekliyor").length;
  const atesLenen = satir.filter((r) => r.durum === "atesledi").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🎬 Kamp Senaryosu</h1>
        <p className="mt-1 text-sm text-slate-400">
          Orkestratörün otomasyon çizelgesi — kamp başlayınca satırlar sırayla ateşlenir.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-4 text-sm ${
          kampBasladi ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200" : "border-white/10 bg-white/[0.03] text-slate-300"
        }`}
      >
        {kampBasladi
          ? `Kamp başladı. ${atesLenen} olay ateşlendi, ${bekleyen} bekliyor.`
          : `Kamp henüz başlamadı — hiçbir satır ateşlenmedi. AYNA Kontrol Odası'ndan "uyandır" (ayna_baslangic) yazıldığında çizelge canlanır. (${satir.length} satır hazır.)`}
      </div>

      <SenaryoUstKontrol durduruldu={durduruldu} kaydirmaDk={kaydirmaDk} />

      <ol className="space-y-2">
        {satir.map((r) => {
          const d = DURUM_ETIKET[r.durum] ?? DURUM_ETIKET.bekliyor;
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-midnight-card/50 p-3">
              <span className={`shrink-0 text-lg ${d.renk}`} aria-hidden>{d.ikon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{r.olay_kodu}</span>
                <span className="block truncate text-xs text-slate-400">
                  {tetikOzet(r)} · {eylemOzet(r)}
                </span>
              </span>
              {r.durum === "bekliyor" ? (
                <SenaryoSatirKontrol id={r.id} />
              ) : (
                <span className={`shrink-0 text-xs font-medium ${d.renk}`}>{d.ad}</span>
              )}
            </li>
          );
        })}
        {satir.length === 0 && (
          <li className="rounded-xl border border-white/10 bg-midnight-card/50 p-4 text-center text-sm text-slate-400">
            Henüz senaryo satırı yok.
          </li>
        )}
      </ol>
    </main>
  );
}
