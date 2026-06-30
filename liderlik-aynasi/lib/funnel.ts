import "server-only";
import type { Db } from "@/lib/degerlendirme";

// FUNNEL METRİKLERİ — kamp öncesi katılım hunisinin gerçek dönüşümü. Operatör
// "kim nerede takıldı?"yı tek bakışta görür. Her adım bir öncekinin alt kümesi:
//   Toplam → Ses ritüeli → Pusula kuruldu → Ön Farkındalık → Kampa geldi
// Sayımlar bağımsız tablolardan; oranlar TOPLAM üzerinden hesaplanır.

export type FunnelAdim = {
  anahtar: string;
  ad: string;
  ikon: string;
  sayi: number;
  // bir önceki adıma göre düşüş (kaç kişi burada kayboldu)
  dususOnceki: number;
};

export type FunnelOzet = {
  toplam: number;
  adimlar: FunnelAdim[];
};

export async function funnelMetrikleri(db: Db): Promise<FunnelOzet> {
  const [
    { count: toplam },
    { count: ses },
    { count: pusula },
    { count: onFark },
    { count: kampta },
  ] = await Promise.all([
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db.from("voice_profiles").select("participant_id", { count: "exact", head: true }),
    db
      .from("pusula")
      .select("participant_id", { count: "exact", head: true })
      .not("tamamlandi_at", "is", null),
    db
      .from("on_farkindalik")
      .select("participant_id", { count: "exact", head: true })
      .not("tamamlandi_at", "is", null),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant")
      .not("camp_unlocked_at", "is", null),
  ]);

  const t = toplam ?? 0;
  const ham = [
    { anahtar: "toplam", ad: "Toplam", ikon: "👥", sayi: t },
    { anahtar: "ses", ad: "Ses ritüeli", ikon: "🎙", sayi: ses ?? 0 },
    { anahtar: "pusula", ad: "Pusula kuruldu", ikon: "🧭", sayi: pusula ?? 0 },
    { anahtar: "onfark", ad: "Ön Farkındalık", ikon: "👁", sayi: onFark ?? 0 },
    { anahtar: "kampta", ad: "Kampa geldi", ikon: "🔓", sayi: kampta ?? 0 },
  ];

  const adimlar: FunnelAdim[] = ham.map((a, i) => ({
    ...a,
    dususOnceki: i === 0 ? 0 : Math.max(0, ham[i - 1].sayi - a.sayi),
  }));

  return { toplam: t, adimlar };
}
