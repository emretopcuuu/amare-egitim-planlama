import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { kampGunu, siradakiMadde } from "@/lib/kampProgrami";

// [E4] GÖREV FRAGMANI — teslim sonrası "sıradaki" merakı: bir sonraki program
// anının saati + tek satır KİLİTLİ ipucu. İçerik ele verilmez; ipucu sıradaki
// görevin türünü/eşleşmesini SEZDİRİR ama söylemez.

// Kilitli ipucu havuzu — her biri bir tür/dokuyu ima eder, içeriği vermez.
const IPUCLARI = [
  "bir isim ve bir soru 🔒",
  "yalnız senin görebileceğin bir kapı 🔒",
  "kısa bir cesaret 🔒",
  "birinin gözünden sen 🔒",
  "tek cümlelik bir hamle 🔒",
  "sessiz bir gözlem 🔒",
];

function istanbulGunDk(d: Date): number {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const [saat, dk] = s.split(":").map(Number);
  return saat * 60 + dk;
}

function istanbulTarih(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
}

export type Fragman = { saat: string | null; ipucu: string };

// Bir sonraki program anının saati + kilitli ipucu. Kamp günü dışında saat null.
export async function gorevFragmani(db: Db, simdi: Date): Promise<Fragman> {
  const baslangic = await kampBaslangicGetir(db);
  const gunDk = istanbulGunDk(simdi);
  const gun = kampGunu(istanbulTarih(simdi), baslangic);

  let saat: string | null = null;
  if (gun) {
    const madde = siradakiMadde(gun, gunDk);
    saat = madde?.baslangic ?? null;
  }
  // Deterministik ama değişken: gün-dakikası kovasına göre ipucu seç.
  const ipucu = IPUCLARI[Math.floor(gunDk / 37) % IPUCLARI.length];
  return { saat, ipucu };
}
