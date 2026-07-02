import "server-only";
import { KARIYER_RANK } from "@/lib/persona";

// [E10] YOLCULUK MODU HAFTALIK GÖREV KARMASI — kişinin HEDEFİNDEN (kariyer rütbesi
// + günlük saat taahhüdü) davet/takip/prova ağırlıklarını türetir. Yolculukta
// görev teması artık sabit değil, hedefe ORANLI. gorevUret'in yolculuk prompt'una
// hint olarak enjekte edilir (AYNA bu karmadan görev seçer).
export function yolculukKarmaMetni(plan: { rutbe?: string; gunlukSaat?: number } | null): string {
  if (!plan?.rutbe) return "";
  const rank = KARIYER_RANK[plan.rutbe] ?? 0;
  const saat = plan.gunlukSaat ?? 0;

  // Dengeli başlangıç ağırlıkları.
  let davet = 40;
  let takip = 35;
  let prova = 25;

  // Yüksek hedef (diamond+ ~ rank 4+) → agresif büyüme: davet + prova ağır.
  if (rank >= 4) {
    davet += 15;
    prova += 5;
    takip -= 20;
  } else if (rank >= 2) {
    davet += 5;
    takip -= 5;
  }

  // Bol vakit → beceri inşası (prova). Az vakit → verim (davet).
  if (saat >= 4) {
    prova += 15;
    takip -= 15;
  } else if (saat > 0 && saat < 2) {
    davet += 10;
    prova -= 10;
  }

  const enBuyuk = Math.max(davet, takip, prova);
  const agir =
    davet === enBuyuk
      ? "DAVET (yeni kişi/görüşme açma)"
      : takip === enBuyuk
        ? "TAKİP (mevcut ilişkileri ilerletme)"
        : "PROVA (beceri/sunum tekrarı)";

  return `BU HAFTANIN KARMASI (hedefinden türetildi: ${plan.rutbe}, günde ~${saat} saat): görev ağırlığı ~%${davet} davet · ~%${takip} takip · ~%${prova} prova. Ağırlık merkezi: ${agir}. Bu haftaki görevi bu karmaya uygun seç.`;
}
