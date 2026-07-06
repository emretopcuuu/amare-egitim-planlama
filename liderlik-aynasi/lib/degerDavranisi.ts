import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { DEGER_ORNEK } from "@/lib/degerler";
import { haftalikSayilar, takipDurum } from "@/lib/sozTakip";
import { haftaBaslangici } from "@/lib/momentum";

// DEĞER-DAVRANIŞ AYNASI (#9) — kişinin kampta seçtiği 3 değerden birini, O
// HAFTAKİ GERÇEK verisine (görüşme/kayıt/seri) bağlayan haftalık içgörü.
// AI çağrısı YOK (maliyet sıfır, her hafta her kişi için çalışır) — DEGER_ORNEK
// (kampta zaten yazılmış somut davranış cümlesi) + gerçek sayıyı birleştirir.
// Değer soyut kalmaz; kişinin O HAFTA gerçekten yaşadığı bir kanıtla buluşur.

export type DegerDavranisGirdi = {
  degerler: string[]; // secilen_uc (3 değer)
  gorusmeToplam: number;
  kayitToplam: number;
  seri: number;
  haftaIndeks: number; // rotasyon için (hangi hafta olduğu)
};

export function degerDavranisMetni(g: DegerDavranisGirdi): string | null {
  if (g.degerler.length === 0) return null;
  const deger = g.degerler[g.haftaIndeks % g.degerler.length];
  const ornek = DEGER_ORNEK[deger];
  const govde = ornek ? ` ${ornek}` : "";

  if (g.kayitToplam > 0) {
    return `"${deger}" değerini seçmiştin.${govde} Bu hafta ${g.kayitToplam} kayıt aldın — tam da bunu yaşadın.`;
  }
  if (g.seri >= 3) {
    return `"${deger}" değerini seçmiştin.${govde} ${g.seri} gündür kesintisiz gidiyorsun — bu değeri yaşıyorsun.`;
  }
  if (g.gorusmeToplam > 0) {
    return `"${deger}" değerini seçmiştin.${govde} Bu hafta ${g.gorusmeToplam} görüşme yaptın.`;
  }
  return `"${deger}" değerini seçmiştin.${govde} Bu hafta bunu nerede yaşadın?`;
}

// Haftanın sıra numarası (rotasyon çapası) — Pazartesi tarihinden türer,
// takvime bağlı deterministik (aynı hafta içinde herkes aynı endeksi görür).
function haftaIndeksiHesapla(haftaBasi: string): number {
  const gun = Math.floor(new Date(`${haftaBasi}T00:00:00Z`).getTime() / 86_400_000);
  return Math.floor(gun / 7);
}

export async function degerDavranisiGetir(db: Db, pid: string): Promise<string | null> {
  const [{ data: degerlerVeri }, hafta, durum] = await Promise.all([
    db.from("degerler_calismasi").select("secilen_uc").eq("participant_id", pid).maybeSingle(),
    haftalikSayilar(db, pid),
    takipDurum(db, pid),
  ]);
  const degerler = (degerlerVeri?.secilen_uc as string[] | null) ?? [];
  if (degerler.length === 0) return null;
  return degerDavranisMetni({
    degerler,
    gorusmeToplam: hafta.gorusmeToplam,
    kayitToplam: hafta.kayitToplam,
    seri: durum.seri,
    haftaIndeks: haftaIndeksiHesapla(haftaBaslangici(new Date())),
  });
}
