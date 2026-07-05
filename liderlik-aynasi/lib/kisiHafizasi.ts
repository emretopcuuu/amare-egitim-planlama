import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { raporHesapla } from "@/lib/rapor";
import { oyunPlaniGetir, type OyunPlani, type PlanUfuk } from "@/lib/oyunPlani";
import { sozGetir } from "@/lib/soz";
import { takipDurum, bugunTr } from "@/lib/sozTakip";
import { aktifUfuk } from "@/lib/planTakvim";

// KİŞİ HAFIZASI — kamp sonrası 90 günlük motorun TEK doğruluk kaynağı. Kamp
// boyunca ve sonrasında biriken her şeyi (pusula, hedef, 360° rapor, değerler
// dolaylı olarak kaynağından, plan, söz, takip durumu) tek bir agregat objede
// toplar. Yeni özellikler (günlük görev, koçluk, brief, milestone) bunu ayrı
// ayrı sorgulamak yerine BURADAN okur — tekrar sorgu yok, tek tutarlı görünüm.
// Saf agregat + hafif hesap; kendi AI çağrısı YAPMAZ.

export type KisiHafizasi = {
  cekirdekNeden: string[] | null;
  icEngel: string | null;
  guclu: { ad: string }[];
  korNokta: string | null;
  enGelisen: string | null;
  hedefRutbe: string | null;
  plan: OyunPlani | null;
  aktifUfukAnahtari: PlanUfuk;
  aktifUfukMaddeleri: { baslik: string; aksiyon: string; olcut: string }[];
  sozMuhurlu: boolean;
  sozOzeti: string | null;
  takip: { seri: number; kacirilanGun: number; toplam: number };
};

export async function kisiHafizasiGetir(db: Db, pid: string): Promise<KisiHafizasi> {
  const [pusula, hedef, rapor, plan, soz, takip] = await Promise.all([
    pusulaCekirdek(db, pid),
    hedefCekirdek(db, pid),
    raporHesapla(db, pid),
    oyunPlaniGetir(db, pid),
    sozGetir(db, pid),
    takipDurum(db, pid),
  ]);

  const now = new Date(`${bugunTr()}T12:00:00+03:00`);
  const onaylandiAt =
    plan?.durum === "onaylandi" && plan.onaylandiAt ? new Date(plan.onaylandiAt) : null;
  const ufuk = aktifUfuk(onaylandiAt, now);
  const aktifUfukMaddeleri = plan?.durum === "onaylandi" ? (plan[ufuk] ?? []) : [];

  return {
    cekirdekNeden: pusula?.cekirdek_neden ?? null,
    icEngel: pusula?.ic_engel ?? null,
    guclu: rapor.guclu.map((s) => ({ ad: s.ad })),
    korNokta: rapor.korNokta?.ad ?? rapor.gelisim[0]?.ad ?? null,
    enGelisen: rapor.enGelisen?.ad ?? null,
    hedefRutbe: hedef?.plan?.rutbe ?? null,
    plan,
    aktifUfukAnahtari: ufuk,
    aktifUfukMaddeleri: aktifUfukMaddeleri.map((m) => ({
      baslik: m.baslik,
      aksiyon: m.aksiyon,
      olcut: m.olcut,
    })),
    sozMuhurlu: soz?.durum === "sesli",
    sozOzeti: soz?.metin ? soz.metin.slice(0, 400) : null,
    takip: { seri: takip.seri, kacirilanGun: takip.kacirilanGun, toplam: takip.son14.filter((g) => g.yapildi).length },
  };
}
