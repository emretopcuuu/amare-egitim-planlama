import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampGorelliZaman } from "@/lib/orkestrator";
import { SenaryoUstKontrol, SenaryoSatirKontrol, SimdiyeKaydir } from "./SenaryoKontrol";

export const metadata = { title: "Kamp Senaryosu — Liderlik Aynası" };
export const revalidate = 15;

// FAZ 9 — ORKESTRATÖR ZAMAN ÇİZELGESİ (salt-okunur). Kampın otomasyon satırları:
// geçmiş (✓ atesledi) / sıradaki (⏳ bekliyor, geri sayımlı) / hata verip düşen
// (✕ yeniden denenebilir) / atlanan. Ateşleme = orkestratör (/api/tik) işi;
// buradaki görünüm ne olduğunu ve ne zaman olacağını gösterir.
const DURUM_ETIKET: Record<string, { ikon: string; renk: string; ad: string }> = {
  atesledi: { ikon: "✓", renk: "text-emerald-300", ad: "ateşlendi" },
  bekliyor: { ikon: "⏳", renk: "text-slate-400", ad: "bekliyor" },
  atlandi: { ikon: "⏭", renk: "text-amber-300", ad: "atlandı" },
  hata: { ikon: "✕", renk: "text-rose-300", ad: "hata verdi" },
};

// BugunPaneli'ndeki dkYazi/onceYazi ile aynı desen — Senaryo'da her satır için.
function dkYazi(ms: number): string {
  const dk = Math.round(ms / 60_000);
  if (dk <= 0) return "gecikti";
  if (dk < 60) return `${dk} dk sonra`;
  const sa = Math.floor(dk / 60);
  return `${sa} sa ${dk % 60 > 0 ? `${dk % 60} dk ` : ""}sonra`;
}

function onceYazi(iso: string): string {
  const dk = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (dk === 0) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  return `${Math.floor(dk / 60)} sa önce`;
}

// Bekleyen kamp_gorelli satırlar için canlı geri sayım — "senaryo hep gelecek
// gibi görünüyor, ne zaman olacağı belli değil" şikayetinin çözümü.
function geriSayim(
  r: { durum: string; tetik_tipi: string; gun: number | null; saat: number | null },
  baslangic: Date | null,
  kaydirmaDk: number
): string | null {
  if (r.durum !== "bekliyor" || r.tetik_tipi !== "kamp_gorelli" || !baslangic || r.gun == null || r.saat == null) {
    return null;
  }
  const hedefMs = kampGorelliZaman(baslangic, r.gun, r.saat) + kaydirmaDk * 60_000;
  return dkYazi(hedefMs - Date.now());
}

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
  const baslangicIso = kontrol.get("ayna_baslangic");
  const kampBasladi = !!baslangicIso;
  const durduruldu = kontrol.get("orkestrator_durduruldu") === "true";
  const kaydirmaDk = Number(kontrol.get("senaryo_kaydirma_dk")) || 0;
  const bekleyen = satir.filter((r) => r.durum === "bekliyor").length;
  const atesLenen = satir.filter((r) => r.durum === "atesledi").length;
  const hataVeren = satir.filter((r) => r.durum === "hata").length;
  const baslangic = baslangicIso ? new Date(baslangicIso) : null;

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
          hataVeren > 0
            ? "border-rose-500/40 bg-rose-500/[0.08] text-rose-200"
            : kampBasladi ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200" : "border-white/10 bg-white/[0.03] text-slate-300"
        }`}
      >
        {hataVeren > 0
          ? `⚠ ${hataVeren} satır hata verdi — aşağıda "yeniden dene" ile tekrar tetikleyebilirsin. (${atesLenen} ateşlendi, ${bekleyen} bekliyor.)`
          : kampBasladi
            ? `Kamp başladı. ${atesLenen} olay ateşlendi, ${bekleyen} bekliyor.`
            : `Kamp henüz başlamadı — hiçbir satır ateşlenmedi. AYNA Kontrol Odası'ndan "uyandır" (ayna_baslangic) yazıldığında çizelge canlanır. (${satir.length} satır hazır.)`}
      </div>

      <SenaryoUstKontrol durduruldu={durduruldu} kaydirmaDk={kaydirmaDk} />

      {/* [ADMIN-UX3] ŞİMDİ ayracı: ilk bekleyen satırın önüne İstanbul saatiyle
          çizgi + sayfa açılışında oraya otomatik kaydırma. */}
      {kampBasladi && <SimdiyeKaydir />}
      <ol className="space-y-2">
        {(() => {
          const ilkBekleyenIdx = kampBasladi ? satir.findIndex((r) => r.durum === "bekliyor") : -1;
          const saatYazi = new Intl.DateTimeFormat("tr-TR", {
            timeZone: "Europe/Istanbul",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date());
          return satir.flatMap((r, idx) => {
          const d = DURUM_ETIKET[r.durum] ?? DURUM_ETIKET.bekliyor;
          const geriSayimYazi = geriSayim(r, baslangic, kaydirmaDk);
          const gecikti = geriSayimYazi === "gecikti";
          const simdiAyraci =
            idx === ilkBekleyenIdx ? (
              <li key="simdi" id="senaryo-simdi" className="flex items-center gap-3 py-1" aria-hidden>
                <span className="h-px flex-1 bg-gold/50" />
                <span className="shrink-0 rounded-full bg-gold/15 px-3 py-0.5 font-mono text-xs font-bold text-gold-light">
                  ŞİMDİ · {saatYazi} İst
                </span>
                <span className="h-px flex-1 bg-gold/50" />
              </li>
            ) : null;
          const satirOgesi = (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                r.durum === "hata"
                  ? "border-rose-500/40 bg-rose-500/[0.06]"
                  : r.durum === "atesledi"
                    ? "border-white/5 bg-midnight-card/30 opacity-70"
                    : gecikti
                      ? "border-amber-500/40 bg-amber-500/[0.06]"
                      : "border-white/10 bg-midnight-card/50"
              }`}
            >
              <span className={`shrink-0 text-lg ${d.renk}`} aria-hidden>{d.ikon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{r.olay_kodu}</span>
                <span className="block truncate text-xs text-slate-400">
                  {tetikOzet(r)} · {eylemOzet(r)}
                  {r.durum === "atesledi" && r.atesleme_zamani && ` · ${onceYazi(r.atesleme_zamani)} ateşlendi`}
                  {geriSayimYazi && (
                    <span className={gecikti ? "font-semibold text-amber-300" : "text-gold-light"}> · {geriSayimYazi}</span>
                  )}
                </span>
              </span>
              {r.durum === "bekliyor" || r.durum === "hata" ? (
                <SenaryoSatirKontrol id={r.id} yenidenDene={r.durum === "hata"} />
              ) : (
                <span className={`shrink-0 text-xs font-medium ${d.renk}`}>{d.ad}</span>
              )}
            </li>
          );
          return simdiAyraci ? [simdiAyraci, satirOgesi] : [satirOgesi];
          });
        })()}
        {satir.length === 0 && (
          <li className="rounded-xl border border-white/10 bg-midnight-card/50 p-4 text-center text-sm text-slate-400">
            Henüz senaryo satırı yok.
          </li>
        )}
      </ol>
    </main>
  );
}
