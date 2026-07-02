import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { eslesmeHedefiSec, type EslesmeAday } from "@/lib/gorevEslesme";

// FAZ 3.5 — KAMP ZİNCİRİ. Sabah tek kişiye "zincirin ilk halkasısın" görevi
// düşer; o kişi görevi tamamlayınca (bkz. /api/gorev-yanit) bayrak otomatik
// hedefe geçer ve yeni bir halka (yeni isim) üretilir. ZINCIR_UST'e ya da
// uygun aday kalmayana kadar sürer. /api/ekran'a isimsiz canlı sayaç akar.
export const ZINCIR_UST = 10;

function zincirGorevMetni(hedefAd: string, sira: number): { title: string; body: string } {
  return sira === 1
    ? {
        title: "Zincirin ilk halkasısın",
        body: `Bugün bir zincir başlıyor ve ilk halkası sensin. ${hedefAd}'a git — ona içten bir takdir ya da gerçek bir soru sor. Bayrağı ona devret. Konuştuklarınızdan tek cümleyi bana yaz.`,
      }
    : {
        title: `Zincir sana ulaştı — ${sira}. halka`,
        body: `Bayrak sana ulaştı; sen bu zincirin ${sira}. halkasısın. ${hedefAd}'a git — ona içten bir takdir ya da gerçek bir soru sor. Bayrağı ona devret. Konuştuklarınızdan tek cümleyi bana yaz.`,
      };
}

/** Yeni bir zincir başlatır: rastgele bir kişiye ilk halka görevini verir. */
export async function zincirBaslat(
  db: Db,
  kaynak: { id: string; full_name: string },
  adaylar: EslesmeAday[],
  simdi = new Date()
): Promise<{ hedef: EslesmeAday; zincirId: string; title: string; body: string } | null> {
  const hedef = await eslesmeHedefiSec(db, kaynak.id, adaylar, simdi);
  if (!hedef) return null;
  const zincirId = crypto.randomUUID();
  const metin = zincirGorevMetni(hedef.full_name, 1);
  return { hedef, zincirId, ...metin };
}

/** Zinciri bir halka ileri taşır: bu halkanın alıcısı (yeniKaynak) için sıradaki
 * hedefi seçer. Zincirdeki herkes tekrar hedef olamaz (loop önleme). */
export async function zincirDevamEttir(
  db: Db,
  zincirId: string,
  yeniKaynak: { id: string; full_name: string },
  simdi = new Date()
): Promise<{ hedef: EslesmeAday; sira: number; title: string; body: string } | null> {
  const { data: zincirGecmisi } = await db
    .from("missions")
    .select("participant_id, zincir_sira")
    .eq("zincir_id", zincirId);
  const sonSira = Math.max(0, ...(zincirGecmisi ?? []).map((m) => m.zincir_sira ?? 0));
  if (sonSira >= ZINCIR_UST) return null;
  const zincirdekiIdler = new Set((zincirGecmisi ?? []).map((m) => m.participant_id));

  const { data: rosterHam } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("role", "participant");
  const adaylar: EslesmeAday[] = (rosterHam ?? []).filter(
    (p) => p.id !== yeniKaynak.id && !zincirdekiIdler.has(p.id)
  );
  if (adaylar.length === 0) return null;

  const hedef = await eslesmeHedefiSec(db, yeniKaynak.id, adaylar, simdi);
  if (!hedef) return null;
  const sira = sonSira + 1;
  const metin = zincirGorevMetni(hedef.full_name, sira);
  return { hedef, sira, ...metin };
}
