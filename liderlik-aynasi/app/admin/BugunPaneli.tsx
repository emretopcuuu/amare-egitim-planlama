import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampGorelliZaman } from "@/lib/orkestrator";
import { hazirlikDurumu } from "@/lib/zirveHazirlik";
import { kampGunu } from "@/lib/kampProgrami";
import { kampBaslangicGetir } from "@/lib/kampZaman";

// [FAZ1-A] BUGÜN PANELİ — tek bakışta operasyon: sistem şu an ne yaptı, sırada
// ne var, dikkat isteyen ne var. Kamp sırasında telefondan yönetimin kalbi.

function dkYazi(ms: number): string {
  const dk = Math.round(ms / 60_000);
  if (dk <= 0) return "şimdi";
  if (dk < 60) return `${dk} dk sonra`;
  const sa = Math.floor(dk / 60);
  return `${sa} sa ${dk % 60 > 0 ? `${dk % 60} dk ` : ""}sonra`;
}

function onceYazi(iso: string): string {
  const dk = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (dk === 0) return "şimdi";
  if (dk < 60) return `${dk} dk önce`;
  return `${Math.floor(dk / 60)} sa önce`;
}

export default async function BugunPaneli() {
  const db = supabaseAdmin();
  const simdi = new Date();

  const [
    { data: ayarlar },
    { data: bekleyenler },
    { data: sonAtesler },
    { data: sonPushlar },
    { count: kayipSayisi },
    zirve,
  ] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["ayna_aktif", "ayna_baslangic", "sistem_modu"]),
    db
      .from("kamp_senaryosu")
      .select("olay_kodu, gun, saat, eylem_tipi, eylem_hedef, tetik_tipi")
      .eq("durum", "bekliyor")
      .eq("tetik_tipi", "kamp_gorelli"),
    db
      .from("audit_log")
      .select("detay, created_at")
      .eq("eylem", "orkestrator_atesle")
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("bildirimler")
      .select("baslik, created_at, kisi:participants!bildirimler_participant_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    db.from("churn_radar").select("participant_id", { count: "exact", head: true }).not("admin_alerted_at", "is", null),
    hazirlikDurumu(db),
  ]);

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const aktif = ayar.get("ayna_aktif") === "true";
  const baslangicIso = ayar.get("ayna_baslangic");
  const mod = ayar.get("sistem_modu") === "yolculuk" ? "YOLCULUK" : "KAMP";

  // Gün etiketi (İstanbul takvimiyle).
  const bugunTarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const baslangicTarih = await kampBaslangicGetir(db);
  const gun = baslangicIso ? kampGunu(bugunTarih, baslangicTarih) : null;
  const saatYazi = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(simdi);

  // SIRADA: bekleyen kamp_gorelli satırlarını çıpalı zamana göre sırala, gelecek 3'ü al.
  type Sirada = { olay_kodu: string; eylem: string; ms: number };
  let sirada: Sirada[] = [];
  if (baslangicIso) {
    const baslangic = new Date(baslangicIso);
    sirada = (bekleyenler ?? [])
      .filter((s) => s.gun != null && s.saat != null)
      .map((s) => ({
        olay_kodu: s.olay_kodu,
        eylem: s.eylem_tipi === "fonksiyon" ? s.eylem_hedef : `${s.eylem_tipi}:${s.eylem_hedef}`,
        ms: kampGorelliZaman(baslangic, s.gun as number, s.saat as number) - simdi.getTime(),
      }))
      .filter((s) => s.ms > -60_000)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 3);
  }

  // DİKKAT satırları.
  const dikkat: { metin: string; href: string; kirmizi?: boolean }[] = [];
  if ((kayipSayisi ?? 0) > 0)
    dikkat.push({ metin: `Kayıp radarında ${kayipSayisi} kişi — insan dokunuşu bekliyor`, href: "/admin/kayip-radari", kirmizi: true });
  if (zirve.toplam > 0 && !zirve.hazir)
    dikkat.push({ metin: `Zirveye Hazırlık eksik: mektup ${zirve.mektupVar}/${zirve.toplam}`, href: "/admin/zirveye-hazirlik" });

  return (
    <section className="rounded-2xl border border-royal/40 bg-midnight-card/70 p-5">
      {/* Durum şeridi */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-gold">🎛 Bugün</h2>
        <span className="text-sm text-slate-300">
          {gun ? `Gün ${gun}` : aktif ? "Kamp günü dışı" : "Kamp kapalı"} · {saatYazi} İst · {mod}
        </span>
        <span className={`text-sm ${aktif ? "text-emerald-300" : "text-slate-500"}`}>
          {aktif ? "● aktif" : "○ bekliyor"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* SIRADA */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">⏭ Sırada</p>
          {!baslangicIso ? (
            <p className="mt-2 text-sm text-slate-500">
              Kamp başlatılınca otomatik akış burada geri sayımla görünür.
            </p>
          ) : sirada.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Yaklaşan otomatik olay yok.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {sirada.map((s) => (
                <li key={s.olay_kodu} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-slate-200">{s.olay_kodu}</span>
                  <span className="shrink-0 font-mono text-xs text-gold-light">{dkYazi(s.ms)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/senaryo" className="mt-2 inline-block text-xs text-royal-light hover:underline">
            Tüm senaryo →
          </Link>
        </div>

        {/* SON OLANLAR */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">✓ Son olanlar</p>
          <ul className="mt-2 space-y-1.5">
            {(sonAtesler ?? []).map((a, i) => {
              const d = a.detay as { olay_kodu?: string } | null;
              return (
                <li key={`a${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-emerald-200">⚡ {d?.olay_kodu ?? "olay"}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{onceYazi(a.created_at)}</span>
                </li>
              );
            })}
            {(sonPushlar ?? []).slice(0, Math.max(0, 5 - (sonAtesler?.length ?? 0))).map((p, i) => (
              <li key={`p${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-300">
                  🔔 {(p.kisi as { full_name?: string } | null)?.full_name?.split(" ")[0] ?? "—"}: {p.baslik}
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-500">{onceYazi(p.created_at)}</span>
              </li>
            ))}
            {(sonAtesler ?? []).length === 0 && (sonPushlar ?? []).length === 0 && (
              <li className="text-sm text-slate-500">Henüz otomatik olay/push yok.</li>
            )}
          </ul>
        </div>
      </div>

      {/* DİKKAT */}
      {dikkat.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {dikkat.map((u) => (
            <Link
              key={u.href}
              href={u.href}
              className={`block rounded-xl px-3 py-2 text-sm ${
                u.kirmizi
                  ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30"
                  : "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30"
              }`}
            >
              ⚠ {u.metin} →
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
