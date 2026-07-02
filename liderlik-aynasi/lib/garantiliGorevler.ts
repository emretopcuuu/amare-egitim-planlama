import type { GorevTuru } from "@/lib/davranis";

// GARANTİLİ GÖREVLER — kamp boyunca HER katılımcıya tam bir kez verilmesi
// garanti edilen küratörlü "wow" görevleri. Motor (lib/tik.ts) bunları, kişi
// boştayken (bekleyen görevi yokken) ve aralık dolunca liste sırasıyla verir;
// teslim garantili_gorev_kayit'a yazılır → aynı kişiye iki kez gitmez.
//
// YENİ "herkese mutlaka ver" görevi eklemek = bu listeye bir satır eklemek.
// kind yalnız geçerli mission türlerinden olabilir:
//   gozlem | cesaret | yansima | gizli | tahmin | simulasyon | bag
// traitAd, traits tablosundaki ada birebir eşleşmeli (trait_id teslimde çözülür).

export type GarantiliGorev = {
  kod: string;
  kind: GorevTuru;
  traitAd: string;
  title: string;
  body: string;
  neden: string;
  fayda: string;
  difficulty: 1 | 2 | 3;
  sureSaat: number;
};

export const GARANTILI_GOREVLER: GarantiliGorev[] = [
  {
    kod: "yardim_iste",
    kind: "cesaret",
    traitAd: "Mütevazılık",
    title: "Bir şey iste",
    body:
      "Bugün bir grup arkadaşından somut bir yardım iste — bir bilgi, bir el ya da dürüst bir geri bildirim. İstemeyi ertelediğin o şeyi bugün sesli olarak iste. Ne istedin ve istemek sana zor geldi mi?",
    neden: "Yardım istemeyi zayıflık sanıyorsun; oysa isteyebilmek güçtür.",
    fayda:
      "İsteyebilen lider ekip kurar; sahada yalnız çalışan tükenir, isteyebilen çoğalır.",
    difficulty: 2,
    sureSaat: 2,
  },
  {
    kod: "sahiplen",
    kind: "cesaret",
    traitAd: "Sorumluluk Alma",
    title: "Sahiplen",
    body:
      "Bugün ters giden küçük bir şey bul ve yüksek sesle 'bu benim sorumluluğumdu' de — başkasına ya da koşula yıkmadan. Sonra bir adım at, düzelt. Ne oldu ve sahiplenince içinde ne değişti?",
    neden: "Zorlanınca refleksin önce dış sebebi göstermek; bugün tersini dene.",
    fayda:
      "Sorumluluğu alan lider güven verir; sahada bahane üreten sponsoru kimse takip etmez.",
    difficulty: 2,
    sureSaat: 2,
  },
  {
    // "WOW" anı — gelecekteki kimliğiyle diyalog. Kamp boyunca herkese bir kez.
    kod: "gelecek_ben",
    kind: "yansima",
    traitAd: "Vizyonerlik",
    title: "Beş yıl sonraki seninle bir an",
    body:
      "Beş yıl sonraki sen — hedefine ulaşmış, dönüşmüş hâlin — şu an tam karşında. Ona üç şey yap: (1) bugünkü seni gördüğü için onu tek cümleyle takdir et, (2) en çok hangi konuda yol göstermesini istersin, sor, (3) sana vereceği 3 tavsiyeyi onun ağzından buraya yaz. O sana ne derdi?",
    neden: "Çünkü ulaşmak istediğin sen çoktan içinde — bugün ona kulak ver.",
    fayda:
      "Gelecekteki kimliğinle ilişki kurmak bugünkü kararlarını netleştirir; sahada seni, henüz olmadığın o lider gibi davranmaya çağırır.",
    difficulty: 2,
    sureSaat: 2,
  },
];

// Kişiye henüz verilmemiş ilk garantili görev (liste sırasıyla). Yoksa null.
export function siradakiGarantiliGorev(
  verilenKodlar: Set<string>,
): GarantiliGorev | null {
  return GARANTILI_GOREVLER.find((g) => !verilenKodlar.has(g.kod)) ?? null;
}
