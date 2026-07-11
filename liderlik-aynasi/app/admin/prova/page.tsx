import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { provaDurum } from "@/lib/prova";
import ProvaKontrol from "./ProvaKontrol";

export const metadata = { title: "Prova Kampı — Liderlik Aynası" };

// PROVA KAMPI: gerçek kayıtlı kişilerle 3 günlük kampı hızlandırılmış (≈1.5 saat)
// yaşatır. Sanal saat kamp gününe demirlenir; AYNA o güne göre birebir görev/ses/
// senkron üretir → gerçek telefonlara. Gün geçişi admin onayıyla (elastik tempo).
export default async function ProvaPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [durum, { count: katilimciSayisi }, { count: eslesmeSayisi }] =
    await Promise.all([
      provaDurum(db),
      db
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("role", "participant"),
      db.from("assignments").select("id", { count: "exact", head: true }),
    ]);

  const eslesmeVar = (eslesmeSayisi ?? 0) > 0;

  // Prova zaten aktifse (veya son kez hangi kişiyle koşulduysa) adını göster.
  let secilenKatilimciAd: string | null = null;
  if (durum.katilimciId) {
    const { data } = await db
      .from("participants")
      .select("full_name")
      .eq("id", durum.katilimciId)
      .maybeSingle();
    secilenKatilimciAd = data?.full_name ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🎭 Prova Kampı</h1>
        <p className="mt-1 text-sm text-slate-400">
          Seçtiğin TEK bir katılımcıyla 3 günlük kampı hızlandırılmış yaşatır —
          diğer herkes onboarding'de olduğu gibi kalır, hiçbir görev/bildirim
          gitmez. Başlat dediğinde sanal saat Gün 1 sabahından akmaya başlar;
          AYNA o güne göre gerçek görev, ses ve bildirimleri yalnızca seçtiğin
          kişinin telefonuna gönderir. Günler arası geçişi sen onaylarsın.
        </p>
      </div>

      {!eslesmeVar && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">
          ⚠ Henüz eşleştirme yok. Görev ve puanlama akışının çalışması için önce
          katılımcıların kampa girmiş ve <strong>Eşleştirmeler</strong>'in yapılmış
          olması gerekir. Prova öncesi bunları hazırla.
        </div>
      )}

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <ProvaKontrol
          baslangicAktif={durum.aktif}
          baslangicGun={durum.gun}
          katilimciSayisi={katilimciSayisi ?? 0}
          baslangicKatilimciId={durum.katilimciId}
          baslangicKatilimciAd={secilenKatilimciAd}
        />
      </section>

      <div className="rounded-xl bg-midnight-card/40 p-5 text-sm text-slate-400 ring-1 ring-royal/20">
        <p className="font-semibold text-slate-300">Nasıl çalışır?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Bir kamp günü sanal saatte ~30 dakikada akar (36× hız).</li>
          <li>
            Bu sayfa açık kaldığı sürece her 15 saniyede bir AYNA turu çalışır —
            görevler, sesler, senkron anlar ve fısıltılar gerçek zamanlı gibi düşer.
          </li>
          <li>
            Gün dolunca sanal saat günün sonunda durur; sen{" "}
            <strong>"Sonraki Güne Geç"</strong> dediğinde bir sonraki güne atlar.
          </li>
          <li>
            Gece ve sahne sessizliği prova akıcı olsun diye atlanır; etkinlik
            atıfları (oyun, David seansı) güne göre birebir gelir.
          </li>
          <li>
            <strong>Bu sayfayı kapatma</strong> — kapanırsa otomatik turlar durur
            (gün geçişi ve durum korunur, tekrar açınca devam eder).
          </li>
        </ul>
      </div>
    </main>
  );
}
