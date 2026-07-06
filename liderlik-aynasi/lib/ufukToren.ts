import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { bugunTr } from "@/lib/sozTakip";
import { aktifUfuk } from "@/lib/planTakvim";
import type { PlanUfuk } from "@/lib/oyunPlani";

// [FAZ 8 · Madde 8] UFUK GEÇİŞ TÖRENLERİ. Kişinin aktif plan ufku değiştiğinde
// (ilk_72_saat → on_gun → kirk_gun → doksan_gun) bir KEZ kutlama push'u atılır —
// eskiden geçişler sessizce oluyordu. Son kutlanan ufuk participants.son_ufuk_toren'de
// tutulur; her geçiş yalnız bir kez kutlanır. İlk kayıtta (deploy günü) kutlama
// yapılmaz, yalnız mevcut durum saklanır.

const UFUK_MESAJ: Record<PlanUfuk, { baslik: string; govde: string } | null> = {
  ilk_72_saat: null, // başlangıç ufku — geriye dönüş/ilk kayıt kutlanmaz
  on_gun: {
    baslik: "🌅 Yeni ufuk açıldı",
    govde: "İlk 72 saati geride bıraktın. Şimdi bu ayın momentumu — planındaki bu ay adımlarına bak.",
  },
  kirk_gun: {
    baslik: "🚀 Yeni ay, yeni ufuk",
    govde: "Bir ayı tamamladın. Bu ayın hızı bütün kariyerinin hızını belirler — haftalık kotana kilitlen.",
  },
  doksan_gun: {
    baslik: "🏔️ Son ufuk: ana hedef",
    govde: "Son aya girdin. Verdiğin sözü hatırla; bu ay, hedefe varış ayı.",
  },
};

export async function ufukToreniTara(db: Db): Promise<{ gonderilen: number }> {
  const now = new Date(`${bugunTr()}T12:00:00+03:00`);
  const { data: sozler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
  const aktifler = (sozler ?? []).map((s) => s.participant_id);
  if (aktifler.length === 0) return { gonderilen: 0 };

  const [{ data: planlar }, { data: kisiler }] = await Promise.all([
    db.from("oyun_plani").select("participant_id, durum, onaylandi_at").in("participant_id", aktifler),
    db.from("participants").select("id, son_ufuk_toren").in("id", aktifler),
  ]);
  const planMap = new Map((planlar ?? []).map((p) => [p.participant_id, p]));
  const sonMap = new Map((kisiler ?? []).map((k) => [k.id, k.son_ufuk_toren]));

  let gonderilen = 0;
  for (const pid of aktifler) {
    const plan = planMap.get(pid);
    if (plan?.durum !== "onaylandi" || !plan.onaylandi_at) continue;
    const ufuk = aktifUfuk(new Date(plan.onaylandi_at), now);
    const onceki = sonMap.get(pid) ?? null;
    if (onceki === ufuk) continue;
    // Durumu her hâlükârda güncelle (tekrar kutlama olmasın).
    await db.from("participants").update({ son_ufuk_toren: ufuk }).eq("id", pid);
    if (onceki === null) continue; // ilk kayıt — kutlama yok, yalnız durum saklandı
    const msg = UFUK_MESAJ[ufuk];
    if (!msg) continue;
    await katilimciyaBildir(db, pid, msg.baslik, msg.govde, "/takip").catch(() => {});
    gonderilen++;
  }
  return { gonderilen };
}
