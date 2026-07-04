import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { pusulaOzeti, pusulaCekirdek } from "@/lib/pusula";
import { hedefOzeti, hedefCekirdek } from "@/lib/hedef";
import { yolculukKarmaMetni } from "@/lib/yolculukKarma";
import { yeniCumleOku } from "@/lib/bosluk";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { BASARI_STRATEJISI } from "@/lib/basariStratejisi";
import { kariyerHalKisidenTuret, personaBlogu, personaYolculukOdak, KARIYER_RANK, KARIYER_ETIKET } from "@/lib/persona";
import { aiHataYakala } from "@/lib/uyari";
import { vinyetSec, type LiderKas } from "@/lib/liderlikVinyetleri";
import { zorlukSeviyesiHesapla, type MerdivenGorev } from "@/lib/zorlukMerdiveni";
import { karsilasmaBul } from "@/lib/karsilasma";
import type { SicakAn } from "@/lib/sicakAn";
import { eslesmeHedefiSec, ESLESMELI_TURLER, type EslesmeAday } from "@/lib/gorevEslesme";
import {
  fazBul,
  zorlukSec,
  turSec,
  pikSaatBul,
  GOREV_TURLERI,
  ZORLUK_YONERGESI,
  type GorevTuru,
  type SistemModu,
  type Zorluk,
} from "@/lib/davranis";
import type { ProgramMaddesi } from "@/lib/kampProgrami";

export { turSec, GOREV_TURLERI, type GorevTuru };

// AYNA — kampı yöneten yapay zekâ direktörün beyni.
// Görevler kişinin VERİSİNE göre üretilir: öz puanları, hakkında biriken dış
// puanlar, önceki görevleri. Puanlama yapıcıdır; kırıcı dil persona kuralıyla
// yasaktır. Tüm çıktılar structured output ile şemaya bağlanır.

export const PERSONA = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten yapay zekâ direktör. Katılımcılar seni hiç görmez ama hep hisseder: görevler verirsin, izlersin, puanlarsın.

Ses tonun: gizemli ama sıcak. Her şeyi gören ama asla yargılamayan. Kısa ve vurucu cümleler. "Sen" dilinde, Türkçe. Şefkatli, yanında olan dokunuşlar ("yanındayım", "buradayım", "seni görüyorum — yargılamadan"). ÖNEMLİ: "seni izliyorum" / "gözüm üzerinde" gibi gözetleme dili ASLA kullanma — ürkütücü; yerine sıcak ve destekleyici ol.

Sarsılmaz kuralların:
- Görevler 15-30 dakikada, kamp alanında, güvenle yapılabilir olmalı. Fiziksel risk, utandırma, mahremiyet ihlali ASLA.
- Bir katılımcıya başka bir katılımcının puanını/yorumunu asla söyleme.
- Asla kırıcı olma; en düşük puanda bile bir güçlü yan + bir somut adım söyle.
- Kamp ortamı: doğa, takım etkinlikleri, yemekler, ateş başı, parkurlar, sahne anları.

Davranışsal dilin (her metinde bu kalıplarla konuş):
- FUN FAILURE: "Hayır" ve başarısızlık asla kayıp değil, VERİDİR. Reddedilen kişiye: "Bugün aldığın 'Hayır', senin hedeflerinden uzaklaşması; doğru strateji bulmak için değerli bir veri."
- EUSTRESS: Zorluğu oyuna çevir: "Zorlandığını biliyorum. Ama unutma, oynamaya değer hiçbir oyun başlangıçta kolay değildir."
- EPIC MEANING: Bireysel çabayı kolektif anlama bağla: "Biz sadece ürün satmıyoruz; mental zindelik üzerine inşa edilmiş bir hareketin parçasıyız."
- GÖRÜNÜR İLERLEME: Sonuç yoksa eğilimi göster: "Sonuçları hemen göremeyebilirsin ama ben gösterdiğin çabanın ivmesini ölçüyorum. İlerliyorsun."
- AMBIENT: Yalnız hissettirme: "Kendi başına başarılı olabilirsin, ancak büyük zaferler sadece çalışan ekiplerin enerjisiyle gelir."`;

const GOREV_SEMASI = {
  type: "object" as const,
  properties: {
    baslik: {
      type: "string" as const,
      description: "Görevin kısa, merak uyandıran adı (en fazla 6 kelime)",
    },
    govde: {
      type: "string" as const,
      description:
        "AYNA'nın ağzından görev metni, gündelik Türkçe, kısa ve net cümleler (sistem promptundaki GÖREV DNA'SI yapısına uy — hikaye + ayna + meydan okuma + dönüş, toplam ~5 cümle). Süslü mecaz, küçültme eki ('ricacık' gibi), iç içe yan cümle ve şiirsel/bulanık ifade ('içinde ne koptu' gibi) KULLANMA. KRİTİK: metin YARIM BIRAKILAMAZ — birine belirli bir sözü/cümleyi söylemesini istiyorsan o sözün TAM METNİNİ tırnak içinde mutlaka yaz; ':' ya da 'şunu söyle:' gibi bir ifadeyle bitirip alıntıyı boş bırakma. Her zaman tam, noktalanmış bir cümleyle bitir.",
    },
    ozellik_id: {
      type: "integer" as const,
      description:
        "Görevin hedeflediği liderlik özelliğinin id'si (listeden), yoksa 0",
    },
    sure_saat: {
      type: "integer" as const,
      enum: [1, 2, 3],
      description: "Görevin teslim süresi (saat)",
    },
    itiraz: {
      type: "string" as const,
      description:
        "YALNIZ simulasyon türünde: itirazcının ağzından, tırnaksız ham konuşma cümleleri (sese çevrilecek). Diğer türlerde boş string.",
    },
    neden: {
      type: "string" as const,
      description:
        "Bu görevin neden ÖZELLİKLE BU kişiye verildiğine dair TEK kısa cümle (en fazla 16 kelime), adayın göreceği sıcak bir dille. Pusula doluysa nedeni orada geçen çekirdek neden/iç engele bağla ama doğrudan alıntı yapma. Ham veri/puan/teknik terim YOK; kör noktayı yüzüne vurma. Yoksa boş string.",
    },
    fayda: {
      type: "string" as const,
      description:
        "'Bu ödev neden önemli?' — bu görevi yapmanın kişinin LİDERLİĞİNE ve SAHADA işini (network marketing) kurarken NE KATACAĞINI anlatan 1-2 cümle. ŞU İKİSİNİ birleştir: (a) hangi farkındalığı/yeteneği besler (ör. zor konuşmayı yönetme, soğuk pazarda ilk adım, ekip güveni), (b) sahada somut karşılığı (ör. ekibini büyütürken, lider yetiştirirken, itiraz karşılarken). Sıcak, motive edici, ikinci tekil ('sana/işine'); genel-geçer klişe değil BU göreve özel. Ham veri/puan/teknik terim YOK.",
    },
    ipuclari: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "YALNIZ bağlamda 'düşük puan sonrası derinleştirme/tekrar' dendiyse: kişinin BU SEFER daha iyi yapması için 2 KISA, somut tavsiye (her biri tek cümle, eyleme dönük). Aksi halde boş dizi [].",
    },
    // FAZ 1.1 — SOMUTLUK ŞABLONU: görev metninin gövdesinde anlatılanı 5 satırlık
    // bir checklist'e ayrıştırır (kim/ne/nerede/ne_zaman/kanit). UI'da ayrı bir
    // kutuda gösterilir — katılımcı görev metnini yorumlamak zorunda kalmaz.
    kim: {
      type: "string" as const,
      description:
        "Görev belirli bir kişiyi hedefliyorsa o kişinin adı/tanımı (ör. 'Zeynep Kaya' ya da 'takımından biri'). Kişi belirtilmiyorsa boş string.",
    },
    ne: {
      type: "string" as const,
      description:
        "Yapılacak TEK somut eylem, kısa fiil öbeği (ör. 'ona tek soru sor', 'gördüğün anı yaz'). Görev metninden çıkar, tekrar etme.",
    },
    nerede: {
      type: "string" as const,
      description:
        "Görevin yapılacağı kamp mekânı/bağlamı (ör. 'yemek çadırında', 'serbest zamanda', 'telefonundan'). Belirsizse 'kampta herhangi bir yerde'.",
    },
    ne_zaman: {
      type: "string" as const,
      description: "Görevin yapılması gereken zaman aralığı (ör. 'bugün akşam yemeğine kadar', 'önümüzdeki 1 saat içinde').",
    },
    kanit: {
      type: "string" as const,
      description: "Teslimde AYNA'ya ne getireceği: yazacağı/söyleyeceği/göstereceği şey (ör. 'onun cevabından bir cümle', 'tek kelime').",
    },
    // Öneri #7 — DÖNÜŞ BİÇİMİ: görevin kişiden ne tür bir "dönüş" istediği. Kaydedilip
    // bağlama geri verilir → model son N görevin biçimini görüp tekdüzeliği kırar.
    donus_bicimi: {
      type: "string" as const,
      enum: ["yaz", "sesli", "grup", "foto", "tek_kelime"],
      description:
        "Bu görevin dönüş biçimi: 'yaz' (bana yaz), 'sesli' (sesle anlat), 'grup' (grupla/biriyle etkileş), 'foto' (kanıt fotoğrafı), 'tek_kelime' (tek kelime/tek cümle). Bağlamdaki 'sonDonusBicimleri'nden FARKLI seç — art arda aynı biçim tekdüzeliktir.",
    },
    // Öneri #6 — ÜRETİM ANI ÖZ-DENETİMİ: model kendi çıktısını denetler; başarısızsa
    // görev katılımcıya ulaşmadan reddedilip yeniden üretilir.
    baglam_kullanildi: {
      type: "boolean" as const,
      description:
        "Bu görev, bağlamdaki kişiye-özel verilerden (pusula/onFarkindalik/değerler/hedef/sonYanitları/akranYorumlari) EN AZ BİRİNE gerçekten demirlendi mi? Jenerik/herkese uyan bir görevse false.",
    },
    tekrar_degil: {
      type: "boolean" as const,
      description:
        "Bu görev 'oncekiGorevBasliklari'ndaki hiçbirinin tekrarı/çok benzeri DEĞİL mi (farklı kas/eylem/dönüş)? Benzer bir egzersizse false.",
    },
    // Özellik 7 — ZORLUK MERDİVENİ ölçümü: modelin kendi değerlendirmesiyle
    // görevin gerçek dozu. missions.zorluk_seviye'ye yazılır; kişi × kas
    // konfor sınırı kalibrasyonu bu ölçüme dayanır.
    zorluk_seviye: {
      type: "integer" as const,
      enum: [1, 2, 3, 4, 5],
      description:
        "SENİN değerlendirmenle bu görevin gerçek zorluk dozu: 1=konfor içi/çok kolay, 2=hafif esneme, 3=gerçek ama güvenli meydan okuma, 4=belirgin cesaret isteyen, 5=büyük sahne/yüksek risk. Dürüst ölç — süsleme.",
    },
  },
  required: ["baslik", "govde", "ozellik_id", "sure_saat", "itiraz", "neden", "fayda", "ipuclari", "kim", "ne", "nerede", "ne_zaman", "kanit", "donus_bicimi", "baglam_kullanildi", "tekrar_degil", "zorluk_seviye"],
  additionalProperties: false,
};

// FAZ 1.2 — KALİTE DENETÇİSİ: üretilen görevi ucuz bir Haiku geçişinden
// otomatik geçirir. gorevKaliteDenetle'nin döndürdüğü 4 kritere göre.
const KALITE_SEMASI = {
  type: "object" as const,
  properties: {
    anlasilir: {
      type: "boolean" as const,
      description:
        "12 YAŞ TESTİ: 12 yaşındaki biri bu görevi okusa, yapacaklarını SIRAYLA sayabilir mi (ne yapacak + sana ne yazacak)? Adımlar birden fazlaysa numaralı ve sıralı mı? Kafa karıştıran katmanlı/felsefi soru varsa false.",
    },
    somut: {
      type: "boolean" as const,
      description:
        "İstenen eylem SOMUT mu? Eylem satırlarında mecaz, soyut iç-sorgulama ya da şiirsel istek ('kendini yokla', 'bu ses karar mı kaçış mı' gibi) varsa false. Mecaz yalnız açılış hikâyesinde kabul edilir.",
    },
    isimNet: {
      type: "boolean" as const,
      description: "Görev belirli bir kişiyi hedefliyorsa (hedefKisi doluysa) isim VE onu nerede/nasıl bulacağı net mi? Görev isimsizse otomatik true.",
    },
    tekrarDegil: {
      type: "boolean" as const,
      description: "Bu görev, verilen son 10 görev başlığının hiçbirine belirgin şekilde benzemiyor mu (farklı eylem/tema)?",
    },
    sebep: {
      type: "string" as const,
      description: "Yukarıdakilerden biri false ise TEK kısa cümlelik sebep. Hepsi true ise boş string.",
    },
  },
  required: ["anlasilir", "somut", "isimNet", "tekrarDegil", "sebep"],
  additionalProperties: false,
};

/** FAZ 1.2 — otomatik kalite denetçisi (Haiku, ucuz). API düşerse ya da
 * ayrıştırılamazsa FAIL-OPEN döner (görevi engellemez) — bu bir güvenlik
 * kapısı değil, kalite iyileştirmesidir; maliyeti sıcak yolu bloklamamalı. */
export async function gorevKaliteDenetle(
  gorev: { title: string; body: string; kind: string; hedefKisi?: string | null },
  sonGorevBasliklari: string[]
): Promise<{ gecti: boolean; sebep: string | null }> {
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: KALITE_SEMASI } },
      system:
        "Bir liderlik kampı görev metnini denetliyorsun. 4 kriteri dürüstçe değerlendir: (1) anlasilir, (2) somut, (3) isimNet (hedefKisi boşsa otomatik true), (4) tekrarDegil (sonGorevBasliklari ile karşılaştır). Yalnızca JSON döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind, hedefKisi: gorev.hedefKisi ?? null },
            sonGorevBasliklari: sonGorevBasliklari.slice(0, 10),
          }),
        },
      ],
    });
    const veri = jsonCoz<{
      anlasilir: boolean;
      somut: boolean;
      isimNet: boolean;
      tekrarDegil: boolean;
      sebep: string;
    }>(yanit);
    if (!veri) return { gecti: true, sebep: null };
    const gecti = veri.anlasilir && veri.somut && veri.isimNet && veri.tekrarDegil;
    return { gecti, sebep: gecti ? null : (veri.sebep || "kalite denetiminden geçemedi") };
  } catch {
    return { gecti: true, sebep: null };
  }
}

const PUAN_SEMASI = {
  type: "object" as const,
  properties: {
    puan: {
      type: "integer" as const,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      description: "Yanıtın derinliği ve samimiyetine göre puan",
    },
    yorum: {
      type: "string" as const,
      description:
        "AYNA'nın ağzından 1-2 cümlelik yapıcı yorum: bir güçlü yan + bir somut adım",
    },
  },
  required: ["puan", "yorum"],
  additionalProperties: false,
};

// #2 Yanıt madenciliği — Haiku ile yanıttan tema etiketleri çıkar
const TEMA_SEMASI = {
  type: "object" as const,
  properties: {
    temalar: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "2-3 kısa psikolojik tema etiketi (en fazla 3 kelime, Türkçe). Örn: 'ret korkusu', 'öz şüphe', 'bağ kurma isteği'",
      maxItems: 3,
    },
  },
  required: ["temalar"],
  additionalProperties: false,
};

function jsonCoz<T>(yanit: Anthropic.Message): T | null {
  if (yanit.stop_reason === "refusal") return null;
  const metin = yanit.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(metin) as T;
  } catch {
    return null;
  }
}

// GELİŞTİRME #4 — GÖREV YAYI.
const ARK_ASAMALARI = [
  { ad: "ısınma", yonerge: "İlk temas: küçük, güvenli, merak uyandıran bir adım. Çekirdek temayı sezdir ama üstüne yüklenme." },
  { ad: "yüzleşme", yonerge: "Aday artık çekirdek temasıyla DOĞRUDAN ama güvenli biçimde yüzleşsin — kaçındığı / zorlandığı şeyi nazikçe yapsın." },
  { ad: "kanıt", yonerge: "Yeni davranışı GERÇEK bir durumda uygulayıp somut bir kanıt/sonuç toplasın (birinin tepkisi, bir sayı, bir an)." },
  { ad: "entegrasyon", yonerge: "Yeni davranışı kendi sözüne/kimliğine bağlasın; kamp sonrası da sürdürebileceği bir alışkanlığa dönüştürsün." },
] as const;

function arkAsamasi(tamamlananSayi: number): { ad: string; yonerge: string } {
  const i = tamamlananSayi <= 1 ? 0 : tamamlananSayi <= 3 ? 1 : tamamlananSayi <= 5 ? 2 : 3;
  return ARK_ASAMALARI[i];
}

export type UretilenGorev = {
  kind: GorevTuru;
  title: string;
  body: string;
  trait_id: number | null;
  sure_saat: number; // 0.5 = 30 dk (micro-sprint), 1-3 normal
  difficulty: Zorluk;
  /** simulasyon: itirazcının söylediği cümle(ler) — sese çevrilir */
  itiraz: string | null;
  /** "bu görev neden SANA özel" — kısa, sıcak; ham veri ifşa etmez */
  neden: string | null;
  /** "Bu ödev neden önemli?" — hangi farkındalık/yetenek + sahada faydası (1-2 cümle) */
  fayda: string | null;
  /** düşük-puan derinleştirme görevlerinde: bu sefer daha iyi yapması için 2 somut ipucu */
  ipuclari: string[];
  /** #8 micro-sprint: true ise due_at 30 dakika olarak hesaplanır */
  micro_sprint: boolean;
  /** #4b görev yayı aktifken üretildi mi — yay aşaması bu işaretli görevlerden sayılır */
  yayGorevi: boolean;
  /** #7 dönüş biçimi (yaz/sesli/grup/foto/tek_kelime) — çeşitlilik izlemesi */
  donusBicimi: string | null;
  /** FAZ 1.1 — somutluk şablonu: gövdeyi 5 satırlık checklist'e ayrıştırır */
  somutluk: { kim: string | null; ne: string; nerede: string; neZaman: string; kanit: string } | null;
  /** FAZ 2.1 — bu görev bir eşleşme hedefine bağlıysa (isimli ya da isimsiz),
   * tik.ts mission insert sonrası eslesmeKaydet() ile gorev_eslesme'ye yazar. */
  eslesme: { hedefId: string; isimli: boolean } | null;
  /** Özellik 7 — bu görevin çalıştırdığı lider kası (KAS_DONGU'dan deterministik).
   * missions.kas'a yazılır; zorluk merdiveni kişi × kas sınırını bundan öğrenir.
   * Statik üretimlerde (ör. mentorluk) null. */
  kas: string | null;
  /** Özellik 7 — modelin kendi değerlendirmesiyle görevin dozu (1-5), ölçüm için. */
  zorlukSeviye: number | null;
  /** Özellik 2 — bu görev hangi kimlik cümlesini çürütmek üzere kurgulandı.
   * Çağıran, mission insert'inde missions.kimlik_cumle_id'ye yazar; puan ≥7
   * yanıtlardan karşı-kanıt bu iz üzerinden toplanır. */
  kimlikCumleId: string | null;
};

// #7 geçerli dönüş biçimleri (şema enum'ı ile aynı).
export const DONUS_BICIMLERI = ["yaz", "sesli", "grup", "foto", "tek_kelime"];

// Ön Farkındalık profilini görev üretimi için sıkıştırır.
const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};
export async function onFarkindalikOzeti(db: Db, pid: string): Promise<object | null> {
  const { data } = await db
    .from("on_farkindalik")
    .select("profil")
    .eq("participant_id", pid)
    .maybeSingle();
  const p = data?.profil as {
    katman1?: { enZayif?: string | null };
    katman2?: { enBuyukIki?: { ad: string; acik: number }[] };
    katman3?: { ritim?: string };
    katman4?: Record<string, string | null>;
    katman5?: { aciklik?: number | null };
    // Öneri #2: korNoktaGuncelle'nin milestone'larda (5/10/15 görev) yazdığı
    // kamp-içi derinleşen tema. Eskiden YAZILIYOR ama HİÇ OKUNMUYORDU (ölü
    // döngü) — artık gorevUret bağlamına taşınır, en pahalı geri besleme
    // mekanizmasının çıktısı görevleri şekillendirir.
    // FAZ 4.1: sosyalTema — akran yorumları + takdirlerin TEMA DÜZEYİNDE
    // damıtılmış özeti (asla birebir alıntı).
    kampici_guncelleme?: {
      milestone?: number;
      yeniTema?: string;
      aciklama?: string;
      sosyalTema?: string;
    } | null;
  } | null;
  if (!p || !p.katman1) return null;
  const k4 = p.katman4 ?? {};
  const korNokta = {
    tersDavranis: k4["k4.ters_davranis"] ?? null,
    kalkan: k4["k4.kalkan"] ?? null,
    varsayim: k4["k4.varsayim"] ?? null,
  };
  const kg = p.kampici_guncelleme;
  const kampBoyuncaDerinlesenTema =
    kg?.yeniTema ? { tema: kg.yeniTema, aciklama: kg.aciklama ?? null } : null;
  const sosyalTema = kg?.sosyalTema ?? null;
  const dolu =
    p.katman1.enZayif ||
    (p.katman2?.enBuyukIki?.length ?? 0) > 0 ||
    korNokta.tersDavranis ||
    korNokta.kalkan ||
    kampBoyuncaDerinlesenTema ||
    sosyalTema;
  if (!dolu) return null;
  return {
    enZayifAlan: p.katman1.enZayif ? OZ_ALAN_AD[p.katman1.enZayif] ?? p.katman1.enZayif : null,
    enBuyukAciklar: (p.katman2?.enBuyukIki ?? [])
      .filter((a) => a.acik > 0)
      .map((a) => ({ baslik: a.ad, acik: a.acik })),
    korNokta,
    ritim: p.katman3?.ritim ?? null,
    geriBildirimAcikligi: p.katman5?.aciklik ?? null,
    // Kamp ilerledikçe açığa çıkan gerçek örüntü (varsa kamp-öncesi profilden
    // daha isabetli — görevleri buna göre demirle).
    kampBoyuncaDerinlesenTema,
    // FAZ 4.1 — akran yorumları + takdirlerden damıtılmış tek tema etiketi.
    sosyalTema,
  };
}

// Aday'ın AYNA Koçu'yla paylaştıkları.
async function kocuOzeti(db: Db, pid: string): Promise<string[] | null> {
  const { data } = await db
    .from("kocu_mesajlar")
    .select("icerik")
    .eq("participant_id", pid)
    .eq("rol", "kullanici")
    .order("created_at", { ascending: false })
    .limit(8);
  const mesajlar = (data ?? [])
    .map((m) => (m.icerik as string | null)?.trim() ?? "")
    .filter((s) => s.length > 1)
    .map((s) => s.slice(0, 240));
  return mesajlar.length ? mesajlar.reverse() : null;
}

// #2 Yanıt madenciliği — Haiku ile yanıttan tema etiketleri çıkar (paralel çalışır)
async function temalarCikar(
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string
): Promise<string[]> {
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 256,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: TEMA_SEMASI },
      },
      system:
        "Bir liderlik kampı görev yanıtını analiz et. Kişinin yanıtında öne çıkan 2-3 psikolojik tema, duygu veya örüntüyü kısa etiket olarak çıkar. Örnekler: 'ret korkusu', 'öz güven eksikliği', 'bağ kurma isteği', 'mükemmeliyetçilik', 'söz vermekten kaçınma'. Yalnızca JSON döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorevBaslik: gorev.title,
            gorevTuru: gorev.kind,
            yanit: yanitMetni.slice(0, 600),
          }),
        },
      ],
    });
    const veri = jsonCoz<{ temalar: string[] }>(yanit);
    return (veri?.temalar ?? [])
      .slice(0, 3)
      .map((t) => String(t).trim().slice(0, 40))
      .filter((t) => t.length > 0);
  } catch {
    return [];
  }
}

// KAMP YAYI — 3 günün dramaturjisi (Üç Kariyer Hâli belgesi 7 günü buraya sıkıştırılır).
// Gün 1 gör → Gün 2 yüzleş/çöz → Gün 3 tasarla/adan/çoğalt. Yalnız kamp modunda.
const KAMP_YAY_TEMASI: Record<number, string> = {
  1: "KAMP YAYI — GÜN 1 (GÖR): Bugün kişi gerçek konumunu görüyor. Görev, kendine anlattığı hikâye ile gerçeği/veriyi ayırmasına hizmet etsin — dürüst konum, öz-farkındalık.",
  2: "KAMP YAYI — GÜN 2 (YÜZLEŞ & ÇÖZ): Bugün kişi kaçtığı şeyle yüzleşiyor ve kafasındaki soru işaretini çözüyor. Görev iç engeli doğrudan zorlasın; yeni bir çerçeve kurup 'CEO'yu koltuğa oturtsun'.",
  3: "KAMP YAYI — GÜN 3 (TASARLA & ADAN & ÇOĞALT): Bugün kişi planını kurar, kararını verir ve ışığını başkasına taşır. Görev somut bir 30-90 günlük adım İLE bir başkasına dokunmayı (öğret/destek/dönüş) birleştirsin.",
};

export async function gorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; team: string | null },
  gun: number,
  saat: number,
  mod: SistemModu = "kamp",
  etkinlik: ProgramMaddesi | null = null,
  bitenEtkinlik: ProgramMaddesi | null = null,
  gorevIpucu: string | null = null,
  siradakiEtkinlik: ProgramMaddesi | null = null,
  yorgunMu = false,
  // FAZ 2.2 — mekân-farkında eşleştirme: çağıran (tik.ts), o an aynı
  // mekânda/boşta olan adayları biliyorsa geçer. null/undefined = filtre yok
  // (mod !== kamp gün 2 gibi mekân verisi olmayan durumlar).
  mekanFarkindaAdaylar: EslesmeAday[] | null = null,
  // FAZ 7 — AKTİVASYON: kişinin son kaçırma sebebi (7.2 sebep motoru) ve
  // yeniden giriş basamağı (7.3 merdiven). tik.ts geçirir.
  aktivasyon: { sonKacirmaSebebi?: string | null; girisBasamak?: number } = {},
  // Özellik 3 — SICAK AN: kişi az önce güçlü bir duygu sinyali verdi (tik.ts
  // taze <45 dk ise geçirir). Görev MİKRO olur ve o duyguya dokunarak açılır.
  sicakAn: SicakAn | null = null
): Promise<UretilenGorev | null> {
  const [
    ozellikler,
    oncekilerSonuc,
    puanlarSonuc,
    pusula,
    pusulaCekirdekSonuc,
    hedef,
    onFarkindalik,
    kocuPaylasim,
    kapaliAyar,
    icerikAyar,
    tamamCountSonuc,
    // #4b yay aşaması — yalnız işaretli yay görevlerinden sayılır
    yayCountSonuc,
    // #5 Dalga hazırlık modu
    aktifDalgaSonuc,
    // #4 Bağ görevi — bağlantı sayısı
    baglantıCountSonuc,
    // Kariyer momentumu (persona ekseni)
    kariyerSonuc,
    // Değerler çalışması — kişinin seçtiği 3 temel değer + neden cümlesi.
    degerlerSonuc,
    // Öneri #3: alınan takdirler (sosyal kanıt / güç).
    alinanTakdirlerSonuc,
    // FAZ 4.2 — kamp öncesi kendi sesiyle bıraktığı beklenti cümlesi.
    beklentiSonuc,
    // Özellik 7 — zorluk merdiveni penceresi: son ~15 görevin kas/puan/geri-adım
    // özeti (onceki'den ayrı: davranışı değiştirmemek için 10'luk pencereye
    // dokunulmaz, merdiven kendi genişliğinde okur).
    zorlukPencereSonuc,
    // Özellik 2 — çürütme hedefi: EN ESKİ aktif kimlik cümlesi (kod seçer).
    kimlikSonuc,
    // Özellik 5 — şahit perspektifi: hedefi bu kişi olan, henüz kullanılmamış
    // EN TAZE gözlem (yeni görevin açılış cümlesi olur).
    sahitSonuc,
  ] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("missions")
      // response_text + ai_comment eklendi (öneri #1: kişinin gerçek cümleleri,
      // #9: AYNA'nın verdiği son tavsiyeyi sonraki göreve taşımak için)
      // neden_nabiz eklendi (özellik 6: çekirdek neden nabzı geri beslemesi)
      .select("kind, title, body, issued_at, status, ai_score, ai_comment, lightened_at, responded_at, response_tags, response_text, donus_bicimi, neden_nabiz")
      .eq("participant_id", katilimci.id)
      .order("issued_at", { ascending: false })
      .limit(10), // genişletildi: streak ve pik pencere için
    db
      .from("ratings")
      .select("trait_id, score, is_self, comment, is_hidden")
      .eq("target_id", katilimci.id),
    pusulaOzeti(db, katilimci.id),
    pusulaCekirdek(db, katilimci.id),
    hedefOzeti(db, katilimci.id),
    onFarkindalikOzeti(db, katilimci.id),
    kocuOzeti(db, katilimci.id),
    db.from("settings").select("value").eq("key", "kapali_gorev_turleri").maybeSingle(),
    db.from("settings").select("key, value").in("key", ["ayna_ek_ton", "gunun_temasi"]),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", katilimci.id)
      .eq("status", "scored"),
    // #4b tamamlanan yay görevi sayısı (yay aşamasını temaya-özel ilerletir)
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", katilimci.id)
      .eq("yay_gorevi", true)
      .eq("status", "scored"),
    // #5
    db.from("waves").select("id, name").eq("is_open", true).maybeSingle(),
    // #4
    db
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("observer_id", katilimci.id),
    // Kariyer momentumu (persona ekseni) — A/B/C türetmesi için ham veriler.
    // gorulen_vinyetler aynı sorguya bindirildi: kişinin daha önce gördüğü
    // açılış hikayeleri — "aynı hikaye asla iki kez" kuralı için.
    db
      .from("participants")
      .select("kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay, gorulen_vinyetler")
      .eq("id", katilimci.id)
      .maybeSingle(),
    db
      .from("degerler_calismasi")
      .select("secilen_uc, neden_cumlesi")
      .eq("participant_id", katilimci.id)
      .maybeSingle(),
    // Öneri #3: kişinin ALDIĞI takdirler (kudos) — görev yalnız zayıflığı değil,
    // sosyal kanıtla gelen GÜCÜ de kullanabilsin ("arkadaşların sende şunu
    // görüyor, bugün onu bilerek kullan").
    db
      .from("kudos")
      .select("message")
      .eq("to_id", katilimci.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(5),
    // FAZ 4.2 — kamp öncesi kaydettiği beklenti cümlesi ("bu kamptan ne
    // bekliyorsun?"). Görevler bunu kişinin KENDİ SÖZÜ olarak geri çalabilir.
    db
      .from("voice_profiles")
      .select("beklenti")
      .eq("participant_id", katilimci.id)
      .maybeSingle(),
    // Özellik 7 — zorluk merdiveni: son 15 görevin sinyal özeti.
    db
      .from("missions")
      .select("kas, ai_score, status, lightened_at, zorluk_ayar")
      .eq("participant_id", katilimci.id)
      .order("issued_at", { ascending: false })
      .limit(15),
    // Özellik 2 — aktif (yüzleşilmemiş + bırakılmamış) kimlik cümleleri, en eskisi önce.
    db
      .from("kimlik_cumleleri")
      .select("id, cumle")
      .eq("participant_id", katilimci.id)
      .is("yuzlesme_at", null)
      .is("birakildi_at", null)
      .order("created_at", { ascending: true })
      .limit(1),
    // Özellik 5 — bu kişi hakkında yazılmış, henüz görevle geri verilmemiş gözlem.
    db
      .from("sahit_gozlemleri")
      .select("id, gozlem")
      .eq("hedef_id", katilimci.id)
      .is("kullanildi_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Değerler: kişinin seçtiği 3 temel değer + neden cümlesi → görev bunları
  // "yaşama" meydan okumasına dönüşür (değer soyut kalmaz, eyleme geçer).
  const degerlerVeri = degerlerSonuc.data;
  const secilenDegerler = (degerlerVeri?.secilen_uc as string[] | null) ?? [];
  const degerler =
    secilenDegerler.length > 0
      ? { temelDegerler: secilenDegerler, nedenCumlesi: degerlerVeri?.neden_cumlesi ?? null }
      : null;

  // Kariyer hâlini türet ve prompt bloğunu hazırla (veri yoksa boş → jenerik).
  const persona = kariyerSonuc.data ? kariyerHalKisidenTuret(kariyerSonuc.data) : null;
  const personaMetni = personaBlogu(persona);
  // Kamp sonrası yolculukta hâle özel 90 günlük odak.
  const yolculukOdak = mod === "yolculuk" ? personaYolculukOdak(persona) : "";
  // [E10] Yolculukta haftalık görev karması kişinin HEDEFİNDEN oranlanır
  // (kariyer rütbesi + günlük saat → davet/takip/prova ağırlıkları). Sabit tema değil.
  const yolculukKarma =
    mod === "yolculuk"
      ? yolculukKarmaMetni((await hedefCekirdek(db, katilimci.id))?.plan ?? null)
      : "";

  const icerik = new Map((icerikAyar?.data ?? []).map((s) => [s.key, s.value]));
  const aynaEkTon = (icerik.get("ayna_ek_ton") ?? "").trim();
  const gununTemasi = (icerik.get("gunun_temasi") ?? "").trim();
  let kapaliTurler: string[] = [];
  try {
    if (kapaliAyar?.data?.value) kapaliTurler = JSON.parse(kapaliAyar.data.value);
  } catch {
    kapaliTurler = [];
  }
  const onceki = oncekilerSonuc.data ?? [];
  const puanlar = puanlarSonuc.data ?? [];
  const yeniCumle = mod === "yolculuk" ? await yeniCumleOku(db, katilimci.id) : null;

  // #1 ADAPTİF TON — anlık ruh hâli (persona'nın ÜZERİNE binen ince ayar).
  // Yeni sorgu YOK: yalnız son görevlerin puanı + "hafiflet" kullanımından türetilir.
  // Sinyal yoksa null → davranış birebir eskisi gibi (graceful degrade).
  const sonPuanli = onceki
    .filter((m) => m.status === "scored" && typeof m.ai_score === "number")
    .slice(0, 4);
  const hafifletSayisi = onceki.filter((m) => m.lightened_at).length;
  let ruhHali: "zorlaniyor" | "akista" | "guclu" | null = null;
  if (sonPuanli.length >= 2) {
    const ortPuan =
      sonPuanli.reduce((t, m) => t + (m.ai_score ?? 0), 0) / sonPuanli.length;
    if (ortPuan <= 4.5 || hafifletSayisi >= 2) ruhHali = "zorlaniyor";
    else if (ortPuan >= 8) ruhHali = "guclu";
    else ruhHali = "akista";
  }

  // --- Puan analizi ---
  const ozet = new Map<number, { oz: number[]; dis: number[] }>();
  for (const p of puanlar) {
    const k = ozet.get(p.trait_id) ?? { oz: [], dis: [] };
    (p.is_self ? k.oz : k.dis).push(p.score);
    ozet.set(p.trait_id, k);
  }
  const ort = (d: number[]) =>
    d.length ? Number((d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)) : null;

  // #1 ALGORİTMİK ÖZELLİK HEDEFLEME — kod öz/dış farkı en büyük 2 özelliği seçer;
  // "hangi özelliği hedefle" kararını modele bırakmak yerine deterministik yapar.
  const deltalar = ozellikler
    .map((o) => {
      const k = ozet.get(o.id);
      const oz = ort(k?.oz ?? []);
      const dis = ort(k?.dis ?? []);
      if (oz === null || dis === null) return null;
      const fark = Math.abs(oz - dis);
      if (fark < 0.5) return null; // anlamlı fark eşiği
      return { id: o.id, ad: o.name, oz, dis, fark };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.fark - a.fark)
    .slice(0, 2);

  // #3 STREAK MEKANİĞİ — ard arda tamamlanan görev sayısı (expire streak keser)
  let streak = 0;
  for (const o of onceki) {
    if (o.status === "scored") streak++;
    else break;
  }

  // #3b PİK YANIT PENCERESİ — kişinin en çok yanıt verdiği saat dilimi (Istanbul)
  const pikYanitSaati = pikSaatBul(
    onceki
      .filter((o) => o.status === "scored" && o.responded_at)
      .map((o) => (new Date(o.responded_at as string).getUTCHours() + 3) % 24)
  );

  // #2 YANIT TEMALARı — son 3 puanlı görevden çıkarılan tema etiketleri
  const oncekiYanitTemalari = onceki
    .filter(
      (o) =>
        o.status === "scored" &&
        Array.isArray(o.response_tags) &&
        (o.response_tags as string[]).length > 0
    )
    .slice(0, 3)
    .flatMap((o) => o.response_tags as string[]);

  // Öneri #1 / FAZ 4.4 — KİŞİNİN GERÇEK CÜMLELERİ + DEVAM EDEN HİKÂYE: son
  // puanlı görevlerin ham yanıt metni (etiket değil, kişinin kendi kelimeleri).
  // 3'e çıkarıldı (öneri #1'de 2'ydi) — görevler birbirine referans verip
  // kopuk atışlar değil, süren bir hikâye gibi hissettirsin.
  const sonYanitAlintilari = onceki
    .filter((o) => o.status === "scored" && (o.response_text as string | null)?.trim())
    .slice(0, 3)
    .map((o) => ({
      gorev: o.title,
      yanit: (o.response_text as string).trim().slice(0, 240),
    }));

  // Öneri #9 — AYNA'NIN SON TAVSİYESİ: en son puanlı görevin ai_comment'i.
  // Sonraki görev bunun takipçisi olsun ("geçen sefer sana X demiştim, bugün
  // deneme zamanı") → kopuk atışlar bir koçluk konuşmasına dönüşür.
  const sonAynaTavsiyesi =
    onceki.find((o) => o.status === "scored" && (o.ai_comment as string | null)?.trim())
      ?.ai_comment as string | undefined;

  // Özellik 6 — ÇEKİRDEK NEDEN NABZI: kişinin son 3 nabız cevabının (1-5)
  // ortalaması. Düşen trend (≤2.5) motoru yön değiştirmeye zorlar: görev
  // kişinin çekirdek nedenine AÇIKÇA bağlanır. Yüksek trend (≥4) mevcut
  // yönü korur. Sinyal yoksa null → davranış eskisi gibi.
  const nabizDegerleri = onceki
    .map((o) => (o as { neden_nabiz?: number | null }).neden_nabiz)
    .filter((n): n is number => typeof n === "number")
    .slice(0, 3);
  const nedenNabziOrt =
    nabizDegerleri.length > 0
      ? Number(
          (nabizDegerleri.reduce((a, b) => a + b, 0) / nabizDegerleri.length).toFixed(1)
        )
      : null;

  // Öneri #3 — SOSYAL KANIT: akranların bu kişi hakkında yazdığı yorumlar +
  // aldığı takdirler. Görev güçten de beslenebilsin (yalnız kör noktadan değil).
  const akranYorumlari = (puanlar as { comment?: string | null; is_hidden?: boolean }[])
    .filter((p) => p.comment && p.comment.trim() && !p.is_hidden)
    .slice(0, 4)
    .map((p) => (p.comment as string).trim().slice(0, 160));
  const alinanTakdirler = ((alinanTakdirlerSonuc.data ?? []) as { message: string }[])
    .map((k) => k.message?.trim())
    .filter((m): m is string => !!m)
    .slice(0, 4);

  // Öneri #7 — son görevlerin dönüş biçimleri (model tekdüzeliği görsün/kırsın).
  const sonDonusBicimleri = onceki
    .map((o) => (o as { donus_bicimi?: string | null }).donus_bicimi)
    .filter((b): b is string => !!b)
    .slice(0, 3);

  // Öneri #8 — ODA SICAKLIĞI: görev yalnız bireyin değil ODANIN duygu ritmine
  // de otursun. Son 2 saatte kamp GENELİNDE puanlanan görevlerin ortalaması,
  // odanın enerjisini verir: düşükse tonu toparlayıcı yap, yüksekse iddialaştır.
  // Yalnız kamp modunda + yeterli sinyalde (≥5 teslim); aksi halde null → nötr.
  let odaSicakligi: "dusuk" | "yuksek" | null = null;
  if (mod === "kamp") {
    const ikiSaatOnce = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const { data: odaSon } = await db
      .from("missions")
      .select("ai_score")
      .eq("status", "scored")
      .not("ai_score", "is", null)
      .gte("scored_at", ikiSaatOnce);
    const puanlar2s = (odaSon ?? [])
      .map((m) => m.ai_score)
      .filter((s): s is number => typeof s === "number");
    if (puanlar2s.length >= 5) {
      const ortalama = puanlar2s.reduce((a, b) => a + b, 0) / puanlar2s.length;
      if (ortalama <= 5) odaSicakligi = "dusuk";
      else if (ortalama >= 7.5) odaSicakligi = "yuksek";
    }
  }

  const bugunTurleri = onceki
    .filter((o) => Date.now() - new Date(o.issued_at).getTime() < 86_400_000)
    .map((o) => o.kind);
  let tur = turSec(gun, saat, bugunTurleri, mod, undefined, etkinlik?.tur, kapaliTurler);

  // FAZ 2.1 — GÜNLÜK EŞLEŞME KOTASI: bugünün görevlerinin ≥%50'si eşleşmeli
  // (bag ve FAZ 3'te eklenecek tanık/çift türleri) olsun. turSec'in seçtiği
  // tür zaten eşleşmeli değilse ve oran hedefin altındaysa "bag"a çevir —
  // admin bag'i kapattıysa (kapaliTurler) dokunma.
  if (
    mod === "kamp" &&
    !kapaliTurler.includes("bag") &&
    bugunTurleri.length > 0 &&
    !ESLESMELI_TURLER.includes(tur)
  ) {
    const eslesmeliOran =
      bugunTurleri.filter((t) => ESLESMELI_TURLER.includes(t)).length / bugunTurleri.length;
    if (eslesmeliOran < 0.5) tur = "bag";
  }

  // Zorluk hesabı (eustress motoru)
  const kapananlar = onceki.filter(
    (o) => o.status === "scored" || o.status === "expired"
  );
  const puanlilar = kapananlar.filter((o) => o.ai_score !== null);
  const kayan = onceki.slice(0, 3).filter((o) => o.status === "expired").length >= 2;
  const naziklesir = onceki.some(
    (o) =>
      o.lightened_at &&
      Date.now() - new Date(o.lightened_at as string).getTime() < 8 * 3_600_000
  );
  let zorluk = zorlukSec({
    puanOrt: puanlilar.length
      ? puanlilar.reduce((t, o) => t + (o.ai_score ?? 0), 0) / puanlilar.length
      : null,
    teslimOrani: kapananlar.length
      ? kapananlar.filter((o) => o.status === "scored").length / kapananlar.length
      : 1,
    sonSuresiDoldu: kapananlar[0]?.status === "expired",
    kayan,
  });
  if (naziklesir) zorluk = 1;
  // #7 Fiziksel yorgunluk: az önce yorucu bir etkinlikten çıktıysa görev hafif olsun.
  if (yorgunMu) zorluk = 1;
  const faz = mod === "yolculuk" ? fazBul(gun) : null;

  // Görev Yayı — çekirdek tema öncelik sırası: kör nokta → en büyük açık →
  // pusula çekirdek nedeni → pusula iç engeli. #4: kör noktası dolmamış ama
  // pusulası dolu kişide de yay kurulur (görevler bağımsız atışlara dönmesin).
  const ofYay = onFarkindalik as {
    enZayifAlan?: string | null;
    enBuyukAciklar?: { baslik: string }[];
  } | null;
  const cekirdekTema =
    ofYay?.enZayifAlan ??
    ofYay?.enBuyukAciklar?.[0]?.baslik ??
    pusulaCekirdekSonuc?.ic_engel ??
    pusulaCekirdekSonuc?.cekirdek_neden?.[0] ??
    null;
  // #4b Aşama, TOPLAM görev yerine yalnız tamamlanmış YAY görevlerinden ilerler —
  // kişi çekirdek temasıyla gerçekten çalıştıkça yüzleşme→kanıt→entegrasyona yürür.
  const yay = cekirdekTema
    ? { cekirdekTema, ...arkAsamasi(yayCountSonuc?.count ?? 0) }
    : null;

  // #7 SES TONU KİŞİSELLEŞTİRME — ÖF'ten ritim + geri bildirim açıklığı
  const ofTon = onFarkindalik as {
    ritim?: string;
    geriBildirimAcikligi?: number | null;
  } | null;
  let tonOnerisi: string | null = null;
  if (ofTon?.ritim === "patlayan") {
    tonOnerisi = "Enerjik, tempolu ve oyunbaz yaz; bu kişi hızlı tutuşur ve ritmi yüksek.";
  } else if (ofTon?.ritim === "tutarsiz") {
    tonOnerisi =
      "Nazik, adım adım ve baskısız bir dil kullan; bu kişinin ritmi tutarsız — küçük, garantili bir adım öner.";
  }
  if (
    typeof ofTon?.geriBildirimAcikligi === "number" &&
    ofTon.geriBildirimAcikligi < 4
  ) {
    tonOnerisi =
      (tonOnerisi ? tonOnerisi + " " : "") +
      "Geri bildirime açıklığı düşük — dolaylı, onaylayıcı ve yargısız bir dille yaz; yüzleştirme değil, davet et.";
  }

  // #5 DALGA HAZIRLIK — aktif değerlendirme dalgası varsa gözlem odağı ekle
  const aktifDalga = aktifDalgaSonuc?.data ?? null;

  // #4 BAĞ GÖREVİ — eşleşme bağlantı sayısı
  const baglantıSayisi = baglantıCountSonuc?.count ?? 0;

  // Özellik 2 — çürütme hedefi (kod seçer: en eski aktif kimlik cümlesi).
  const hedefKimlikCumle = (kimlikSonuc.data ?? [])[0] ?? null;
  // Özellik 5 — bu kişiye açılış cümlesi olacak, kullanılmamış en taze gözlem.
  const sahitGozlem = (sahitSonuc.data ?? [])[0] ?? null;

  // #8 MİKRO-SPRINT — streak≥3, zorluk=3, %20 olasılık.
  // Özellik 3 — sıcak an her zaman mikro-sprint: duygu sıcakken ~15-30 dk'lık
  // tek atomik dokunuş (due_at 30 dk'ya iner).
  const microSprint =
    !!sicakAn || (streak >= 3 && zorluk === 3 && Math.random() < 0.2);

  // #10 Kamp olayı bağlamı: görevi kampın canlı akışına demirle —
  // son fiero (10/10 zafer) ve son senkron (kolektif an) son 10 görevden çekilir.
  const sonZafer = onceki.find((o) => o.ai_score === 10) ?? null;
  const sonKolektif =
    onceki.find(
      (o) =>
        o.kind === "senkron" &&
        Date.now() - new Date(o.issued_at).getTime() < 86_400_000
    ) ?? null;

  // FAZ 2.1 — İSİMLİ EŞLEŞME ÇEKİRDEĞİ: tur "bag" ise gerçek bir hedef seç.
  // Persona-tamamlayıcı eşleşme (karsilasma.ts) tercih edilir; dengeleyici
  // (lib/gorevEslesme.ts) kota/geçmiş/admin-engeli kısıtlarını uygular.
  // Mekân-farkında adaylar verildiyse (FAZ 2.2, Gün 2 grup bağlamı) yalnız
  // o an aynı mekânda/boşta olanlardan seçilir.
  let eslesmeHedef: EslesmeAday | null = null;
  let eslesmeIsimliMi = false;
  if (tur === "bag") {
    const { data: rosterHam } = await db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant");
    let adaylar: EslesmeAday[] = (rosterHam ?? []).filter((p) => p.id !== katilimci.id);
    if (mekanFarkindaAdaylar) {
      const mekanIdler = new Set(mekanFarkindaAdaylar.map((a) => a.id));
      adaylar = adaylar.filter((a) => mekanIdler.has(a.id));
    }
    if (adaylar.length > 0) {
      const tercih = await karsilasmaBul(db, katilimci.id);
      eslesmeHedef = await eslesmeHedefiSec(db, katilimci.id, adaylar, new Date(), tercih?.partnerId ?? null);
    }
    // İSİMLİ ZORUNLU (kullanıcı isteği): eşleşme hedefi bulunduysa görev HER
    // ZAMAN isimli olur. Eski %50 kotası kaldırıldı — anonim "Grup N'de biri"
    // gibi referanslar kişinin görmediği bir listeye işaret ediyordu; artık
    // aday varsa daima gerçek bir isme yönlendiriyoruz (bkz. anonim branşı: yalnız
    // hiç aday yoksa devreye girer ve grup numarası vermesi yasak).
    if (eslesmeHedef) eslesmeIsimliMi = true;
  }

  // --- Tüm yeni yönergeleri oluştur ---
  const yeniYonergeler = [
    // #1 Algoritmik özellik hedefleme
    deltalar.length > 0
      ? `ÖNCELİKLİ ÖZELLİK HEDEFLEMESİ: Aşağıdaki özellikler bu kişide öz/dış puan farkı en yüksek olanlar — görevi KESİNLİKLE bunlardan birini hedefleyecek şekilde yaz. Başka özelliği değil, yalnızca şunları çalıştır:\n${deltalar.map((d) => `• ${d.ad} (öz: ${d.oz}, dışarıdan: ${d.dis}, fark: ${d.fark.toFixed(1)})`).join("\n")}`
      : "",
    // #2 Yanıt temaları
    oncekiYanitTemalari.length > 0
      ? `KİŞİNİN SON YANITLARINDAN ÇIKAN TEMALAR: ${oncekiYanitTemalari.join(", ")}. Görevi mümkünse bu temaların doğal devamına/derinlemesine bağla — ama temaları açıkça söyleme.`
      : "",
    // #3 Streak
    streak >= 5
      ? `STREAK ONURU (${streak} ard arda görev): Bu momentumu göreve sessizce işle — "ibreyi görüyorum, ilerliyorsun" hissi uyandır. Onu onurlandıran ama biraz daha zorlayan bir görev seç.`
      : streak >= 3
        ? `İYİ FORM (${streak} ard arda): Biraz daha iddialı ve enerjik yaz — bu kişi formda.`
        : "",
    // #5 Dalga hazırlık
    aktifDalga
      ? `DEĞERLENDİRME DALGASI AÇIK (${aktifDalga.name}): Görevi mümkünse adayın değerlendireceği kişileri daha bilinçli gözlemlemesine yönlendir — "daha derin bak" odağıyla.`
      : "",
    // #7 Ses tonu
    tonOnerisi ? `AYNA SES TONU (kişiye özel): ${tonOnerisi}` : "",
    // Özellik 6 — Çekirdek Neden Nabzı geri beslemesi
    nedenNabziOrt !== null && nedenNabziOrt <= 2.5 && pusulaCekirdekSonuc?.cekirdek_neden?.[0]
      ? `ÇEKİRDEK NEDEN NABZI DÜŞÜK (son cevaplar ort. ${nedenNabziOrt}/5): Kişi son görevlerin onu kendi çekirdek nedenine YAKLAŞTIRMADIĞINI söylüyor — yön değiştir. Bu görev kişinin çekirdek nedenine ("${pusulaCekirdekSonuc.cekirdek_neden[0]}") AÇIKÇA bağlanmalı ve bu bağ görevin içinde BİR CÜMLEYLE söylenmeli (ör. "bu adım seni ... hedefine bir adım yaklaştırır" ruhunda, kendi kelimelerinle). Bağı ima etmekle yetinme, görünür yap.`
      : nedenNabziOrt !== null && nedenNabziOrt >= 4
        ? `ÇEKİRDEK NEDEN NABZI GÜÇLÜ (son cevaplar ort. ${nedenNabziOrt}/5): Görevler kişinin çekirdek nedenine iyi oturuyor — mevcut yönü ve tema seçimini KORU, gereksiz yön değiştirme.`
        : "",
    // Özellik 3 — Sıcak an: az önce yakalanan güçlü duyguya ~15 dk içinde dokun.
    sicakAn
      ? `SICAK AN (ŞİMDİ — en güçlü kanca): Kişi az önce (${{ checkin: "günlük check-in'inde", gorev: "görev yanıtında", kocu: "AYNA Koçu'na yazarken" }[sicakAn.kaynak] ?? "az önce"}) güçlü bir ${{ kirilganlik: "KIRILGANLIK", cosku: "COŞKU", hayal_kirikligi: "HAYAL KIRIKLIĞI" }[sicakAn.tur] ?? "duygu"} sinyali verdi: "${sicakAn.ozet}". Bu görev KISA (10-15 dakikalık, tek atomik eylem) bir MİKRO-GÖREV olmalı ve TAM O DUYGUYA dokunarak açılmalı — duyguyu adıyla teşhis etme, sıcaklığını kullan (kırılganlıksa: güvenli, onurlandıran küçük bir adım; coşkuysa: momentumu hemen bir cesaret hamlesine çevir; hayal kırıklığıysa: 'Hayır' verisini işleyen, toparlayan bir dokunuş). Uzun/iddialı görev YASAK; an soğumadan yakala. sure_saat=1 döndür.`
      : "",
    // Özellik 2 — Kimlik çürütme: inanç tartışılmaz, davranışla yanlışlanır.
    hedefKimlikCumle
      ? `KİMLİK ÇÜRÜTME (sessiz görev): Kişi kendini şu cümleyle sınırlıyor: "${hedefKimlikCumle.cumle}". Görev FIRSAT BULURSA bu inancı DAVRANIŞLA çürütecek somut bir deneyim kursun — kişi, görevi yaptığında bu cümlenin tersini bizzat yaşamış olsun. KRİTİK: cümleyi kişiye ASLA söyleme, ima etme, "sen kendine ... diyorsun" deme — kanıt sessizce biriksin. Görevin ana teması/kası ile doğal örtüşmüyorsa zorlama, o zaman bu direktifi atla.`
      : "",
    // Özellik 5 — Şahit perspektifi: birinin onda gördüğü güç, görevin kapısı olur.
    sahitGozlem
      ? `ŞAHİT AÇILIŞI (ZORUNLU): Dün/az önce bir kamp arkadaşı bu kişiyi sessizce gözledi ve onda şu gücü gördü: "${sahitGozlem.gozlem}". Bu görevde gövdenin İLK cümlesi TAM ŞÖYLE başlasın: 'Dün biri sende şunu gördü: "..."' — gözlemi kısaltıp kendi kelimelerinle tırnak içinde ver, gözleyenin KİM olduğunu asla söyleme/ima etme. Bu açılış, bağlamdaki "acilisHikayesi"nin YERİNE geçer (bu seferlik hikâyeyi atla); görevin meydan okuması da mümkünse bu görülen gücü bilerek kullanmak üzerine kurulsun.`
      : "",
    // #4 / FAZ 2.1 Bağ görevi — isimli (gerçek eşleşme hedefi) ya da isimsiz
    tur === "bag"
      ? eslesmeHedef && eslesmeIsimliMi
        ? `BAĞ GÖREVİ (İSİMLİ EŞLEŞME): Adayı doğrudan "${eslesmeHedef.full_name}" isimli kişiye yönlendir — adını göreve AÇIKÇA yaz (ör. "${eslesmeHedef.full_name}'i bul..."), varsa takımını da belirtebilirsin. Görevi anlamlı bir soru veya içten bir paylaşıma dayandır — yüzeysel değil, gerçek bir açılım istesin.`
        : `BAĞ GÖREVİ (isimsiz — bu kişi için şu an uygun eşleşme adayı yok): Adayı KENDİ SEÇECEĞİ gerçek bir insanla bağlantı kurmaya yönlendir. Kişinin KENDİSİNİN belirleyebileceği ifadeler kullan: "az tanıdığın biri", "sohbet etmek isteyip ertelediğin biri", "bugün gözüne çarpan biri". YASAK: numaralı grup / takım referansı verme — "Grup 4'ten biri", "3. gruptan biri" gibi ifadeler ASLA kullanma (kişi o grupta kimlerin olduğunu ezbere bilmiyor, görev boşta kalır). Kimi seçeceğine kişinin kendisi karar verebilmeli. Görevi anlamlı bir soru veya içten bir paylaşıma dayandır — yüzeysel değil, gerçek bir açılım istesin. Yazar/aktivist kimliği benimsetme; sadece insan teması kur.`
      : "",
    // #8 Micro-sprint
    microSprint
      ? "MİKRO-SPRINT: Bu görev tam 30 dakikada, tek atomik bir eylemle tamamlanabilmeli. 'Şimdi yap, erteleme' tonuyla yaz — anlık ve tetikleyici olsun. sure_saat=1 döndür."
      : "",
    // Mevcut yönergeler
    tur === "gizli" ? '"Bunu kimseye söyleme" ruhuyla yaz.' : "",
    tur === "tahmin" ? "Tahmin görevi: akşam büyük ekranda karşılaştırılabilecek bir öngörü istesin." : "",
    tur === "simulasyon"
      ? 'SİMÜLASYON: kısa bir sahne kur; itirazcının sözünü tırnak içinde (sese çevrilecek), katılımcıdan cevabını sana yazmasını iste.'
      : "",
    mod === "yolculuk" ? "Kamp değil, sahada (günlük hayat ve iş ortamı) yapılacak görev." : "",
    kayan
      ? "YENİDEN BAĞLAMA: Sessizleşti — sıcak, küçük, garantili bir başlangıç; suçluluk ya da baskı yükleme."
      : "",
    naziklesir
      ? "ŞEFKAT MODU: 'Ağır geldi' dedi — küçük, güvenli, baskısız tut. Önce güveni geri kur."
      : "",
    yay
      ? `GÖREV YAYI ("${yay.cekirdekTema}"), aşama "${yay.ad}": ${yay.yonerge} Önceki aşamaların üstüne çık, geri gitme.`
      : "",
    bitenEtkinlik
      ? `AN'A KİLİTLİ: Az önce "${bitenEtkinlik.baslik}" bitti — duygusu sıcak. Enerjisine bağla.`
      : "",
    // #7 Fiziksel yorgunluk
    yorgunMu
      ? "FİZİKSEL YORGUNLUK: Aday az önce yorucu bir fiziksel etkinlikten (ATV / oyun / parkur) çıktı — bedeni yorgun. Görevi KÜÇÜK ve hafif tut; oturarak/dinlenirken yapabileceği zihinsel-hafif bir adım olsun. Meydan okuma değil nazik bir davet."
      : "",
    // #10 Kamp olayı bağlamı
    sonZafer
      ? `ZAFER MOMENTUMU: Az önce "${sonZafer.title}" görevini 10/10 başardı — bu zaferin enerjisini yeni göreve sessizce taşı, onu kanatlandır (ama abartma).`
      : "",
    sonKolektif
      ? `KOLEKTİF AN: Az önce tüm salon aynı anda "${sonKolektif.title}" senkron görevini yaptı. İSTERSEN kişisel görevi o ortak enerjinin doğal devamına bağla — zorunlu değil.`
      : "",
    gununTemasi ? `GÜNÜN TEMASI (görevi mümkünse buna dik): ${gununTemasi}` : "",
    aynaEkTon ? `ADMIN TON AYARI: ${aynaEkTon}` : "",
    gorevIpucu
      ? `ETKİNLİĞE ÖZEL YÖNERGE (MUTLAKA kat): ${gorevIpucu}`
      : "",
    // FAZ 7.2 — SEBEP MOTORU: kişi son görevini şu sebeple kaçırdı → görevi ona göre biçimle.
    aktivasyon.sonKacirmaSebebi === "anlamadim"
      ? "KAÇIRMA SEBEBİ 'ANLAMADIM': Bu görevi AŞIRI SOMUT ve basit yaz — tek cümlelik tek bir eylem, hiç mecaz yok, ne yapacağı ve sana ne yazacağı çocukça net olsun."
      : aktivasyon.sonKacirmaSebebi === "cekindim"
        ? "KAÇIRMA SEBEBİ 'ÇEKİNDİM': ŞEFKAT MODU — küçük, güvenli, düşük-riskli, kimsenin önünde olmayan bir ilk adım. Baskı yok; 'kendi hızında' güvencesi ver."
        : aktivasyon.sonKacirmaSebebi === "vakit"
          ? "KAÇIRMA SEBEBİ 'VAKİT YOKTU': Bu görev TAM 10 DAKİKADA bitebilmeli — tek atomik eylem. 'Şimdi, kısacık' tonu."
          : aktivasyon.sonKacirmaSebebi === "ilgi_yok"
            ? "KAÇIRMA SEBEBİ 'İLGİMİ ÇEKMEDİ': FARKLI bir kas + farklı bir tür + farklı bir dönüş biçimi seç; öncekine hiç benzemesin, taze bir açı getir."
            : "",
    // FAZ 7.3 — YENİDEN GİRİŞ MERDİVENİ: sessizleşip dönen kişiye önce en küçük adım.
    aktivasyon.girisBasamak === 0
      ? "YENİDEN GİRİŞ (BASAMAK 0): Bu kişi bir süre sessizdi, yeni dönüyor. Görev TEK DOKUNUŞLUK olsun — tek kelime ya da tek cümlelik bir yanıt yeter; eşiği yerde tut, 'tekrar buradasın, bu kadarı harika' hissi ver. sure_saat=1."
      : aktivasyon.girisBasamak === 1
        ? "YENİDEN GİRİŞ (BASAMAK 1): Yeni döndü, ısınıyor. Görev en fazla 20 dakikalık, küçük ve garantili başarılabilir olsun; güveni tazele."
        : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // GÖREV DNA'SI — "wow" çekirdeği: her görev bir lider KASINI çalıştırır ve
  // o kasa ait küratörlü bir tarihî/arketip hikâyeyle açılır. Kas, KİŞİ+gün
  // bazında DÖNER → aynı tema üst üste gelmez (eski sorun: hep "dur ve izle").
  const tamamSayisi = tamamCountSonuc.count ?? 0;
  const KAS_DONGU: LiderKas[] = [
    "cesaret", "devretme", "zor_konusma", "baglanti", "vizyon",
    "yardim_iste", "dinleme", "sorumluluk", "ornek_olma", "dayaniklilik",
  ];
  // KİŞİYE ÖZEL SABİT KAYMA: katılımcı id'sinden türetilen deterministik offset.
  // Olmadan, herkesin ilk görevinde tamamSayisi=0 + aynı gün → herkes AYNI kası
  // (örn. Gün 1 → "devretme") alıp aynı vinyetle açılıyordu. Bu kayma ilk turda
  // bile kişileri farklı kaslara dağıtır; tamamSayisi arttıkça döngü sürer.
  let kisiKaymasi = 0;
  for (const ch of katilimci.id) kisiKaymasi = (kisiKaymasi * 31 + ch.charCodeAt(0)) % KAS_DONGU.length;
  const L = KAS_DONGU.length;
  const hedefKas = KAS_DONGU[(((tamamSayisi + gun + kisiKaymasi) % L) + L) % L];
  // Vinyet seçimine de kişi kaymasını kat → aynı kasa düşen iki kişi farklı
  // küratörlü hikâyeyle açılsın (aynı kas + aynı vinyet çakışması da kırılır).
  // Kişi isteği: AYNI HİKAYE bir kişiye ASLA iki kez gösterilmesin — daha önce
  // görülen vinyet kodları hariç tutulur (kariyerSonuc sorgusuna bindirildi).
  const gorulenVinyetler = new Set(
    (kariyerSonuc.data as { gorulen_vinyetler?: string[] } | null)?.gorulen_vinyetler ?? []
  );
  const secilenVinyet = vinyetSec(hedefKas, tamamSayisi + kisiKaymasi, gorulenVinyetler);
  // Yeni (hiç görülmemiş) bir vinyet seçildiyse kişinin görülen listesine ekle
  // — sonraki üretimlerde tekrar seçilmesin. Serverless'te un-awaited yazma
  // response gönderilince öldürülebileceği için AWAIT edilir; ama hatası görev
  // üretimini bloklamasın diye yutulur (en kötü ihtimalle nadir bir tekrar olur).
  if (secilenVinyet && !gorulenVinyetler.has(secilenVinyet.kod)) {
    try {
      await db
        .from("participants")
        .update({ gorulen_vinyetler: [...gorulenVinyetler, secilenVinyet.kod] })
        .eq("id", katilimci.id);
    } catch {
      // best-effort — yazım başarısız olsa bile görev üretimi devam eder
    }
  }

  // Özellik 7 — ZORLUK MERDİVENİ: kişinin son ~15 görevinden hedef kas için
  // "yukarı / aşağı / koru" sinyali (saf fonksiyon, lib/zorlukMerdiveni.ts).
  // "koru"da direktif enjekte edilmez — mevcut zorluk mekanizması aynen sürer.
  const merdivenSinyal = zorlukSeviyesiHesapla(
    ((zorlukPencereSonuc.data ?? []) as MerdivenGorev[]),
    hedefKas
  );
  const merdivenYonergesi = merdivenSinyal.aciklama
    ? `\n\n${merdivenSinyal.aciklama}`
    : "";

  const baglam = {
    ad: katilimci.full_name.split(" ")[0],
    // Bu görevin çalıştıracağı lider kası + açılış hikâyesi (küratörlü, doğru).
    hedefLiderKasi: hedefKas,
    acilisHikayesi: secilenVinyet
      ? { baslik: secilenVinyet.baslik, hikaye: secilenVinyet.metin }
      : null,
    takim: katilimci.team,
    pusula: pusula ?? null,
    degerler: degerler ?? null,
    hedef: hedef ?? null,
    onFarkindalik: onFarkindalik ?? null,
    kocuPaylasimlari: kocuPaylasim ?? null,
    gorevYayi: yay,
    yeniCumle: yeniCumle ?? null,
    kampGunu: gun,
    saat,
    istenenGorevTuru: tur,
    zorlukSeviyesi: zorluk,
    zorlukYonergesi: ZORLUK_YONERGESI[zorluk],
    // Özellik 7 — kişi × kas konfor sınırı sinyali (yukari/asagi/koru).
    zorlukMerdiveni: merdivenSinyal.yon,
    // Özellik 6 — son nabız cevaplarının ortalaması (görev ↔ çekirdek neden bağı).
    nedenNabziOrt,
    // Özellik 3 — az önce yakalanan sıcak duygu anı (varsa görev mikro olur).
    sicakAn: sicakAn ? { tur: sicakAn.tur, ozet: sicakAn.ozet } : null,
    // Özellik 2 — çürütülecek kimlik cümlesi (kişiye ASLA söylenmez).
    kimlikCurutmeHedefi: hedefKimlikCumle?.cumle ?? null,
    // Özellik 5 — görevin açılış cümlesi olacak şahit gözlemi (anonim).
    sahitGozlemi: sahitGozlem?.gozlem ?? null,
    yenidenBagla: kayan,
    naziklesir,
    gununTemasi: gununTemasi || null,
    mod,
    suankiKampEtkinligi: etkinlik
      ? {
          baslik: etkinlik.baslik,
          bitisSaati: etkinlik.bitis,
          not: "Görevi mümkünse bu etkinliğin içine dik — kampın o anki gerçek akışına otursun.",
          ...(gorevIpucu ? { ozelYonerge: gorevIpucu } : {}),
        }
      : null,
    azOnceBitenEtkinlik: bitenEtkinlik ? { baslik: bitenEtkinlik.baslik } : null,
    // #8 sıradaki etkinlik: kişi şu an boşta ve birazdan buna geçecek — görevi
    // niyet/hazırlık köprüsü olarak ona bağlama fırsatı (zorunlu değil).
    siradakiKampEtkinligi: siradakiEtkinlik
      ? {
          baslik: siradakiEtkinlik.baslik,
          baslangicSaati: siradakiEtkinlik.baslangic,
          not: "Kişi şu an boşta; birazdan buna geçecek. İSTERSEN görevi buna küçük bir hazırlık/niyet adımı olarak bağla — zorunlu değil.",
        }
      : null,
    yolculukFazi: faz ? { ad: faz.ad, odak: faz.odak, yonerge: faz.yonerge } : null,
    // #1
    birincilHedefler: deltalar.length > 0 ? deltalar : null,
    // #2
    oncekiYanitTemalari: oncekiYanitTemalari.length > 0 ? oncekiYanitTemalari : null,
    // Öneri #1 — kişinin son görevlerde YAZDIĞI gerçek cümleler (etiket değil).
    sonYanitlari: sonYanitAlintilari.length > 0 ? sonYanitAlintilari : null,
    // Öneri #9 — AYNA'nın son verdiği tavsiye (yeni görev bunun takipçisi olsun).
    sonAynaTavsiyesi: sonAynaTavsiyesi ? sonAynaTavsiyesi.slice(0, 240) : null,
    // Öneri #3 — sosyal kanıt: akran yorumları + alınan takdirler (güç kaynağı).
    akranYorumlari: akranYorumlari.length > 0 ? akranYorumlari : null,
    alinanTakdirler: alinanTakdirler.length > 0 ? alinanTakdirler : null,
    // FAZ 4.2 — kamp öncesi kendi sesiyle bıraktığı beklenti cümlesi.
    beklentiSozu: beklentiSonuc?.data?.beklenti?.trim().slice(0, 240) || null,
    // #3
    streak,
    pikYanitSaati,
    // #5
    aktifDalga: aktifDalga ? { id: aktifDalga.id, ad: aktifDalga.name } : null,
    // #7
    tonOnerisi,
    // #1 adaptif ton — anlık ruh hâli
    ruhHali,
    // #4
    baglantıSayisi: baglantıSayisi > 0 ? baglantıSayisi : null,
    // #8
    microSprint,
    ozellikler: ozellikler.map((o) => ({
      id: o.id,
      ad: o.name,
      ozPuanOrtalamasi: ort(ozet.get(o.id)?.oz ?? []),
      digerlerininOrtalamasi: ort(ozet.get(o.id)?.dis ?? []),
    })),
    oncekiGorevBasliklari: onceki.map((o) => o.title),
    // #7 son dönüş biçimleri — art arda aynısını seçme (donus_bicimi'ni farklı seç).
    sonDonusBicimleri: sonDonusBicimleri.length > 0 ? sonDonusBicimleri : null,
    // #8 odanın o anki enerjisi (kamp geneli son 2 saat).
    odaSicakligi,
    yonerge:
      gun === 1
        ? "İlk gün: tanışma ve buz kırma odaklı, veriye fazla yaslanma."
        : "Veriye yaslan: düşük öz puanlı ya da öz/dış farkı büyük bir özelliği hedefleyen görev üret. Önceki görevleri tekrarlama.",
  };

  // FAZ 1.2 — üretim, kalite denetiminden geçmezse BİR kez daha denenebilsin
  // diye ayrı bir kapanışa alındı (aynı `baglam`'ı kullanır, context yeniden
  // çekilmez — yalnız API çağrısı tekrarlanır).
  async function tekUretimDenemesi(ekstraYonerge: string): Promise<UretilenGorev | null> {
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      // Görev üretimi kampın en sık çalışan, en kritik parçası — güncel
      // Sonnet 5'e yükseltildi (kullanıcı isteği). Opus yerine Sonnet seçimi
      // hâlâ geçerli: çıktı kısa olduğu için max_tokens kırpıldı.
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: GOREV_SEMASI },
      },
      system: [
        {
          type: "text" as const,
          text: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\n${BASARI_STRATEJISI}\n\n`,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: `Görevin: verilen bağlama göre TEK bir görev üret. Tür "${tur}" olmalı.

KARİYER SEVİYESİ: Bu kişi lider veya üzeri kariyer basamağında — görev yeni başlayan düzeyi değil, LİDER düzeyi olmalı. Katlama, lider yetiştirme, devretme, ekip önünde duruş, zor kararlar, üst seviye etki gibi konuları hedefle.

GÖREV DNA'SI (KALİTEYİ BELİRLER — MUTLAKA uy): Bu görev "${hedefKas}" lider kasını çalıştırır ve bağlamdaki "acilisHikayesi" ile AÇILIR. Yapı (toplam ~5 cümle, UZUN OLMASIN):
1) HİKÂYE — gövdenin başında "acilisHikayesi"ni KISA (2-3 cümle) ve SADIK anlat. Uydurma, yalnız verileni kullan. Başlığı bu hikâyeyle ilişkilendir (birebir kopyalama).
2) AYNA — kişinin pusula/kör nokta/hedefiyle AÇIK bağ kur: "sen … demiştin / … istiyorsun". Hikâyedeki eşik, tam da onun eşiği olsun.
3) MEYDAN OKUMA — o anki kamp anına demirli, GERÇEKTEN zorlayan ama yapılabilir TEK bir lider hamlesi (kasla uyumlu: devret / ilk adımı at / zor konuş / yardım iste / söz ver / sorumluluğu üstlen…). Yumuşak "birini izle/gözlemle" DEĞİL.
4) DÖNÜŞ — bana ne getireceğini söyle ve ÇEŞİTLENDİR: her görev "bana yaz" olmasın; kimi yap-ve-anlat, kimi grupla etkileş, kimi tek cümle/tek kelime. Birine BELİRLİ bir cümleyi birebir söylemesini istiyorsan ("şunu söyle", "de ki" vb.) o cümlenin TAM METNİNİ tırnak içinde MUTLAKA yaz — asla ":" ile bitirip alıntıyı boş bırakma.
"ozellik_id"yi bu kasla uyumlu seç (cesaret→Cesaret, devretme→Sorumluluk/Takım Ruhu, zor_konusma→Dürüstlük, vizyon→Vizyonerlik, dinleme→İletişim, baglanti→Takım Ruhu/Pozitif Enerji vb.).

ÇEŞİTLİLİK (ZORUNLU): "oncekiGorevBasliklari"na bak — aynı egzersizi farklı başlıkla TEKRAR ÜRETME; farklı kas, farklı eylem türü, farklı dönüş biçimi seç. "neden" alanını da generic engel cümlesiyle değil BU göreve özel yaz. "donus_bicimi" alanını doldur ve bağlamdaki "sonDonusBicimleri"nden FARKLI bir biçim seç (art arda hep "yaz" olmasın — sesli/grup/foto/tek_kelime ile çeşitlendir).

ÖZ-DENETİM (ZORUNLU): Görevi ürettikten sonra kendini denetle ve "baglam_kullanildi" + "tekrar_degil" alanlarını DÜRÜSTÇE doldur. tekrar_degil, görev "oncekiGorevBasliklari"ndan birinin tekrarı/çok benzeriyse false olmalı — bu durumda görev reddedilip yeniden üretilir, o yüzden gerçekten FARKLI bir görev üret.
${personaMetni ? `\n${personaMetni}\n` : ""}${mod === "kamp" && KAMP_YAY_TEMASI[gun] ? `\n${KAMP_YAY_TEMASI[gun]}\n` : ""}${yolculukOdak ? `\n${yolculukOdak}\n` : ""}${yolculukKarma ? `\n${yolculukKarma}\n` : ""}
PUSULA KİŞİSELLEŞTİRMESİ: Bağlamda "pusula" doluysa göreve ZORUNLU iki bağ kur: (1) kişinin bildirdiği iç engeli (ic_engel) doğrudan ya da dolaylı zorlayan somut bir eylem, (2) kişinin mevcut boşluğunu (mevcut_bosluk) küçülten bir sonuç. Pusuladaki çekirdek nedeni (cekirdek_neden) görevin motor gücü yap — ama yüzüne vurma. Pusula yoksa genel lider bağlamında devam et.

DEĞER KİŞİSELLEŞTİRMESİ: Bağlamda "degerler" doluysa görevi kişinin seçtiği temel değerlerinden (temelDegerler) BİRİNİ bugün somut bir eylemle YAŞAMA meydan okumasına bağla — değeri soyut anmakla kalma, o değerin gerektirdiği gerçek bir lider hamlesini istet (örn. değeri "Dürüstlük" ise bugün kaçındığı zor bir doğruyu söyle; "Cesaret" ise ertelediği ilk adımı at; "Takım Ruhu" ise geride kalan birine uzan). Görevi tek bir değere demirle (hepsini birden sıralama), değeri başlıkta ya da dönüşte kişinin diliyle çağır. Uygun olduğunda değer ile çalışılan lider kasını örtüştür. Değer yoksa bu bağı atla.

HEDEF BAĞLANTISI: Bağlamda "hedef" doluysa görevi kişinin kariyer hedefine hizmet eden somut bir saha adımına bağla. Bağlamda "onFarkindalik" doluysa görevi enZayifAlan, enBuyukAciklar ve korNokta'ya göre hedefle — kör noktayı ASLA açıkça yüzüne vurma. onFarkindalik.kampBoyuncaDerinlesenTema doluysa ONA öncelik ver (kamp-öncesi profilden daha taze/isabetli). Bağlamda "kocuPaylasimlari" doluysa görevi onun ŞU AN dert ettiği gerçek gündemine demirle. Zorluk yönergesine MUTLAKA uy.

KİŞİNİN KENDİ SÖZLERİ / FAZ 4.4 DEVAM EDEN HİKÂYE (çok güçlü): Bağlamda "sonYanitlari" doluysa (son 2-3 görev yanıtı), görevi kişinin SON yazdığı gerçek cümleye demirle — onun kendi kelimesini/anını hatırla ("geçen sefer '…' demiştin") ama birebir uzun alıntı yapma, bir-iki kelime dokun yeter. Birden fazla yanıt varsa aralarında bir İLERLEME/İP UCU gör ve yeni görevi onun doğal devamı yap ("dünkü konuşman seni buraya getirdi, bugün bir adım daha ileri taşı") — görevler kopuk atışlar değil, süren bir hikâye gibi hissettirsin. Bu "beni gerçekten dinliyor" hissini kurar.

KONUŞMANIN DEVAMI: Bağlamda "sonAynaTavsiyesi" doluysa, yeni görev o tavsiyenin TAKİPÇİSİ olsun ("Geçen sefer sana şunu önermiştim — bugün onu deneme zamanı"). Görevler kopuk atışlar değil, süren bir koçluk konuşması gibi hissettir.

FAZ 4.2 — KENDİ SÖZÜNÜ GERİ ÇALMA: Bağlamda "beklentiSozu" doluysa (kişinin kamp BAŞLAMADAN ÖNCE kendi sesiyle bıraktığı "bu kamptan ne bekliyorum" cümlesi), ARADA BİR görevi ona bağla: "Kamptan önce bana '…' demiştin — bugün ona bir adım daha yaklaş." Bu, kişinin kendi niyetiyle yüzleşmesinin en güçlü anıdır; birebir uzun alıntı yapma, özünü yakala.

SOSYAL KANIT / GÜÇ: Bağlamda "onFarkindalik.sosyalTema" doluysa (akran yorumları + takdirlerden BAĞIMSIZ birden çok kaynakta tekrar eden, tema düzeyinde damıtılmış tek güç — asla birebir yorum alıntısı), bunu en güçlü kanca olarak kullan: "Kamptaki birden fazla göz sende [sosyalTema]'yı görüyor — bugün onu bilerek, bir kez daha göster." Yoksa bağlamdaki "akranYorumlari"/"alinanTakdirler" ARADA BİR görevi kişinin zayıflığına değil GÜCÜNE bağlamak için kullanılabilir — ama asla birebir alıntı yapma, yalnız özünü paraphrase et. Her görev güç-temelli olmasın; kör nokta ile denge kur.

ANLIK RUH HÂLİ (adaptif ton — persona hâlinin ÜZERİNE binen ince ayar): Bağlamdaki "ruhHali" alanı "zorlaniyor" ise tonu belirgin yumuşat, görevi küçült ve nefes aldır (baskı kurma, kişiyi onaylayarak küçük bir adım iste); "guclu" ise güvenini onurlandırıp bir tık daha meydan oku; "akista" ya da boş ise olağan tonunda devam et. Persona hâlini EZME — yalnız tonu o anki duruma göre yumuşat/sertleştir.

ODANIN ENERJİSİ (kolektif ton): Bağlamdaki "odaSicakligi" "dusuk" ise (oda yorgun/kırık) görevi toparlayıcı, birleştirici ve biraz daha hafif yap — "hep birlikte" hissi ver; "yuksek" ise (oda coşkulu) momentumu kullanıp bir tık daha iddialı, cesur bir hamle istet. Bu bireysel ruhHali'nin üstünde ince bir kolektif ayardır; boşsa dikkate alma.

DİL NETLİĞİ (çok önemli): Görev metni SADE ve anlaşılır olmalı — katılımcı tek okumada (1) ne yapacağını ve (2) sana ne yazacağını net anlamalı. Kısa, gerçek cümleler kur. Şu hatalardan kaçın: iç içe geçmiş uzun cümleler, art arda tire (—) ile uzayan eklemeler, küçültme ekleri ('ricacık'), bulanık şiirsel ifadeler ('içinde ne koptu'). Yukarıdaki davranışsal kalıplar (FUN FAILURE, EUSTRESS vb.) PUANLAMA/teşvik tonu içindir; görev metnini süslemek için değil. Önce ne yapacağını söyle, sonra tek bir soruyla geri bildirimi iste.

12 YAŞ TESTİ (ZORUNLU): Gövdeyi yazdıktan sonra kendine sor: "12 yaşındaki biri bunu okusa, ne yapacağını SIRAYLA sayabilir mi?" Sayamıyorsa gövdeyi sadeleştir. Mecaz ve hikâye YALNIZ açılıştaki 1-2 satırda yaşayabilir; EYLEM satırlarında mecaz, felsefi soru ve soyut iç-sorgulama YASAK ("bu ses gerçek bir karar mı yoksa alışkanlıktan geri çekilme mi?" gibi katmanlı sorular kafa karıştırır). İç gözlem isteyeceksen onu da tek, somut, cevabı kolay bir soruya indir.

GÖVDE BİÇİMİ (ZORUNLU — okunabilirlik): "govde"yi TEK BİR paragraf blok olarak yazma. Mantıksal adımları AYRI SATIRLARA böl; satır aralarına gerçek satır sonu (\n) koy. Tipik akış: kısa hikâye/ayna (1-2 satır) → boş satır → asıl eylem → dönüş isteği (1 satır). EYLEM BİRDEN FAZLA ADIMSA adımları "1)" "2)" "3)" diye NUMARALA (en fazla 3 adım) — her adım tek eylem, tek cümle. Kişi ekrana dönüp "şimdi hangisindeydim?" diye bakabilmeli. Uzun tek blok metin okunmaz; kısa numaralı satırlar okunur.

MUĞLAKLIK YASAĞI (ZORUNLU): Görev ne yapılacağını SOMUT söylemeli. Şu tür bulanık ifadeler YASAK: "bir şey yap", "bir şeyler paylaş", "odaya yerleşme işi", "o işi hallet", "gereğini yap", "birine git" (kim olduğu belirsizse). Her eylemde NE yapılacağı (somut fiil + somut nesne), gerekirse NEREDE ve NE ZAMAN net olmalı. Kişiyi hedefliyorsan ya gerçek bir isim ver ya da kişinin kendisinin seçebileceği net bir tarif ver ("bugün yanında oturan kişi" gibi) — "birileri", "biri" gibi kimliği havada bırakan ifadeler tek başına yeterli değil.

SOMUTLUK ŞABLONU (ZORUNLU): "kim"/"ne"/"nerede"/"ne_zaman"/"kanit" alanlarını gövdeden ÇIKARARAK doldur — yeni bilgi uydurma, gövdede zaten anlattığını 5 satıra ayrıştır. "kim" görev kişiyi hedeflemiyorsa boş string olabilir; diğer 4 alan HER ZAMAN dolu olmalı.

${yeniYonergeler}${merdivenYonergesi}${ekstraYonerge}`,
        },
      ],
      messages: [{ role: "user", content: JSON.stringify(baglam) }],
    });

    const veri = jsonCoz<{
      baslik: string;
      govde: string;
      ozellik_id: number;
      sure_saat: number;
      itiraz?: string;
      neden?: string;
      fayda?: string;
      ipuclari?: unknown;
      kim?: string;
      ne?: string;
      nerede?: string;
      ne_zaman?: string;
      kanit?: string;
      donus_bicimi?: string;
      baglam_kullanildi?: boolean;
      tekrar_degil?: boolean;
      zorluk_seviye?: number;
    }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;
    // Savunma: model bazen "...yalnızca şunu söyle:" diyip asıl alıntıyı yazmadan
    // cümleyi yarıda bırakıyor (bkz. görev sistemi olayı). max_tokens'ta kesilmiş
    // ya da ':'/bağlaçla asılı kalmış bir gövdeyi ASLA katılımcıya gösterme —
    // reddet, bir sonraki tick'te temiz bir görev yeniden üretilir.
    const govdeYarim =
      yanit.stop_reason === "max_tokens" || /[:,;—-]\s*$/.test(veri.govde.trim());
    if (govdeYarim) {
      await aiHataYakala(db, "gorev_uretimi", new Error(`Yarım kalan govde: "${veri.govde.slice(-60)}"`));
      return null;
    }
    // Öneri #6 — ÜRETİM ANI ÖZ-DENETİMİ: model kendi çıktısını "önceki görevlerin
    // tekrarı mı" diye denetledi. Açıkça tekrar (tekrar_degil === false) ise görevi
    // katılımcıya gösterme — reddet, bir sonraki tick'te temiz üretilir. (baglam_
    // kullanildi tek başına red sebebi değil: Gün 1 jenerik görevler meşru.)
    if (veri.tekrar_degil === false) {
      await aiHataYakala(db, "gorev_uretimi", new Error(`Tekrar görev reddedildi: "${veri.baslik}"`));
      return null;
    }

    const gecerliIdler = new Set(ozellikler.map((o) => o.id));
    // #8 micro-sprint: sure_saat 0.5 = 30 dk
    const sureSaat = microSprint ? 0.5 : Math.min(3, Math.max(1, veri.sure_saat));
    return {
      kind: tur,
      title: veri.baslik.slice(0, 120),
      body: veri.govde.slice(0, 1000),
      trait_id: gecerliIdler.has(veri.ozellik_id) ? veri.ozellik_id : null,
      sure_saat: sureSaat,
      difficulty: zorluk,
      itiraz:
        tur === "simulasyon" && veri.itiraz && veri.itiraz.trim().length > 3
          ? veri.itiraz.trim().slice(0, 400)
          : null,
      neden:
        veri.neden && veri.neden.trim().length > 3
          ? veri.neden.trim().slice(0, 200)
          : null,
      fayda:
        veri.fayda && veri.fayda.trim().length > 3
          ? veri.fayda.trim().slice(0, 400)
          : null,
      ipuclari: Array.isArray(veri.ipuclari)
        ? veri.ipuclari
            .filter((x): x is string => typeof x === "string" && x.trim().length > 2)
            .slice(0, 2)
            .map((x) => x.trim().slice(0, 200))
        : [],
      micro_sprint: microSprint,
      yayGorevi: yay !== null,
      // Öneri #7 — dönüş biçimi (çeşitlilik izlemesi için missions'a kaydedilir)
      donusBicimi: DONUS_BICIMLERI.includes(veri.donus_bicimi as string)
        ? (veri.donus_bicimi as string)
        : null,
      // FAZ 1.1 — somutluk şablonu (checklist UI için)
      somutluk: {
        kim: veri.kim && veri.kim.trim().length > 1 ? veri.kim.trim().slice(0, 80) : null,
        ne: (veri.ne ?? "").trim().slice(0, 160),
        nerede: (veri.nerede ?? "").trim().slice(0, 100),
        neZaman: (veri.ne_zaman ?? "").trim().slice(0, 100),
        kanit: (veri.kanit ?? "").trim().slice(0, 160),
      },
      // FAZ 2.1 — eşleşme kaydı (tik.ts insert sonrası gorev_eslesme'ye yazar)
      eslesme: eslesmeHedef ? { hedefId: eslesmeHedef.id, isimli: eslesmeIsimliMi } : null,
      // Özellik 7 — kas + modelin zorluk ölçümü (missions.kas / zorluk_seviye)
      kas: hedefKas,
      zorlukSeviye:
        Number.isInteger(veri.zorluk_seviye) &&
        (veri.zorluk_seviye as number) >= 1 &&
        (veri.zorluk_seviye as number) <= 5
          ? (veri.zorluk_seviye as number)
          : null,
      // Özellik 2 — bu görev hangi kimlik cümlesini çürütmek için kurgulandı
      // (çağıran missions.kimlik_cumle_id'ye yazar).
      kimlikCumleId: hedefKimlikCumle?.id ?? null,
    };
  } catch (e) {
    await aiHataYakala(db, "gorev_uretimi", e);
    return null;
  }
  }

  const ilkDeneme = await tekUretimDenemesi("");
  if (!ilkDeneme) return null;
  // FAZ 1.2 — kalite denetçisi: ilk denemeyi ucuz bir Haiku geçişinden geçir.
  // Geçerse yayınla; geçmezse BİR kez daha dene (aynı context, ek uyarı ile) —
  // ikinci deneme sonucu ne olursa olsun yayınlanır (sonsuz döngü yok).
  const denetim = await gorevKaliteDenetle(
    { title: ilkDeneme.title, body: ilkDeneme.body, kind: ilkDeneme.kind, hedefKisi: ilkDeneme.somutluk?.kim ?? null },
    onceki.map((o) => o.title)
  );
  let nihai = ilkDeneme;
  if (!denetim.gecti) {
    const ikinciDeneme = await tekUretimDenemesi(
      `\n\nÖNCEKİ DENEMEN KALİTE DENETİMİNDEN GEÇEMEDİ (${denetim.sebep}) — bu sefer bunu MUTLAKA düzelt, farklı ve daha somut bir görev üret.`
    );
    nihai = ikinciDeneme ?? ilkDeneme;
  }
  // Özellik 5 — şahit gözlemi bu görevin metnine gömüldü: aynı gözlemin bir
  // sonraki üretimde tekrar açılış olmaması için hemen mühürle. gorulen_vinyetler
  // deseniyle aynı gerekçeyle AWAIT edilir; hatası görevi bloklamasın diye yutulur
  // (en kötü ihtimalle gözlem bir kez daha kullanılır ya da nadiren boşa yanar).
  if (sahitGozlem) {
    try {
      await db
        .from("sahit_gozlemleri")
        .update({ kullanildi_at: new Date().toISOString() })
        .eq("id", sahitGozlem.id);
    } catch {
      // best-effort
    }
  }
  return nihai;
}

// #2 Yanıt madenciliği + puanlama — paralel çalışarak ek gecikme olmaz.
export async function gorevPuanla(
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string
): Promise<{ puan: number; yorum: string; response_tags: string[] } | null> {
  try {
    const client = new Anthropic();
    // Puanlama (Haiku) ve tema çıkarımı (Haiku) paralel başlar.
    // MALİYET: puanlama yanıt başına çalışır; Haiku 4.5 (5× ucuz) yeterli.
    // Haiku effort'u desteklemiyor → output_config'de yalnız format.
    const [yanit, temalar] = await Promise.all([
      client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 768,
        thinking: { type: "disabled" },
        output_config: {
          format: { type: "json_schema", schema: PUAN_SEMASI },
        },
        system: [
          {
            type: "text" as const,
            text: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\n`,
            cache_control: { type: "ephemeral" as const },
          },
          {
            type: "text" as const,
            text: `${gorev.kind === "simulasyon" ? "Görevin: SİMÜLASYON değerlendirmesi. Önce görevdeki müşteri/aday rolüne gir ve katılımcının cevabına o karakterin ağzından 1 cümlelik gerçekçi tepki ver (ikna olduysa yumuşa, olmadıysa nazikçe diren). Ardından AYNA olarak 1 cümle koçluk ekle: neyi iyi yaptı + bir sonraki denemede tek somut iyileştirme; koçluğu yukarıdaki saha tekniğine (feel-felt-found, ısınma, tempo, 1–10, ısrar=taciz) dayandır. İkisini birlikte 'yorum' alanına yaz. Puanı itirazı karşılama becerisine göre ver." : "Görevin: verdiğin görevin yanıtını puanla. Çabayı, samimiyeti ve somutluğu ödüllendir; boş/alaycı yanıta düşük puan ver ama yine de yapıcı kal. Yorum 1-2 cümle, AYNA'nın ağzından."}`,
          },
        ],
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              gorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind },
              katilimciYaniti: yanitMetni,
            }),
          },
        ],
      }),
      temalarCikar(gorev, yanitMetni), // #2 paralel tema çıkarımı
    ]);

    const veri = jsonCoz<{ puan: number; yorum: string }>(yanit);
    if (!veri || !Number.isInteger(veri.puan)) return null;
    return {
      puan: Math.min(10, Math.max(1, veri.puan)),
      yorum: (veri.yorum ?? "").slice(0, 400),
      response_tags: temalar, // #2
    };
  } catch {
    return null;
  }
}

// GELİŞTİRME #1 — YANSIMA KAPANIŞI.
export async function gorevYansit(
  db: Db,
  pid: string,
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string,
  yansimaMetni: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const onFarkindalik = await onFarkindalikOzeti(db, pid);

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `${PERSONA}

Az önce aday bir görevi tamamladı ve ardından "bunu yaparken içinde ne zorladı, ne değişti?" sorusuna kısa bir iç-yansıma yazdı. Senin işin: bu yansımayı okuyup ona TEK bir sıcak Türkçe cümleyle ayna tut.

Kurallar:
- YALNIZCA tek bir cümle. Liste yok, soru sorma, parantez/meta not yok.
- Aşağıdaki "korNokta/enZayifAlan" bilgisini SESSİZCE kullan: yansımasının onun örüntüsüyle bağını ima et ama kör noktayı/zayıf alanı ASLA adıyla söyleme, klinik olma, yargılama.
- Onu küçük bir içgörüyle onurlandır: "şunu fark etmen önemli" hissi ver, öğüt verme.
${onFarkindalik ? `\nADAYIN AYNA PROFİLİ (yalnız senin gözün): ${JSON.stringify(onFarkindalik)}` : ""}`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind },
            yaptigi: yanitMetni,
            yansimasi: yansimaMetni,
          }),
        },
      ],
    });
    if (yanit.stop_reason === "refusal") return null;
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return metin ? metin.slice(0, 400) : null;
  } catch {
    return null;
  }
}

// GELİŞTİRME #3 — AYNA ANI.
export async function aynaAniUret(
  db: Db,
  katilimci: { id: string; full_name: string }
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const [onFarkindalik, kapananSonuc, pusula] = await Promise.all([
    onFarkindalikOzeti(db, katilimci.id),
    db
      .from("missions")
      .select("title, ai_score")
      .eq("participant_id", katilimci.id)
      .eq("status", "scored"),
    pusulaOzeti(db, katilimci.id),
  ]);

  const of = onFarkindalik as {
    enZayifAlan?: string | null;
    korNokta?: { tersDavranis?: string | null; kalkan?: string | null; varsayim?: string | null };
  } | null;
  const kendiCumlesi =
    of?.korNokta?.tersDavranis || of?.korNokta?.kalkan || of?.korNokta?.varsayim || null;
  if (!kendiCumlesi) return null;

  const kapananlar = kapananSonuc.data ?? [];
  if (kapananlar.length < 3) return null;

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      // MALİYET: ikincil üretim → Haiku 4.5 (effort yok). Kısa, sıcak metin.
      model: "claude-haiku-4-5",
      max_tokens: 512,
      thinking: { type: "disabled" },
      system: `${PERSONA}

Şimdi özel bir an kuruyorsun: AYNA ANI. Adayın KAMP ÖNCESİ kendi yazdığı kör nokta cümlesi elinde. Aday o günden beri kampta görevler yaptı, harekete geçti. Senin işin: onun kendi cümlesini nazikçe ALINTILAYIP, bugün yaptıklarıyla yüzleştir ve tek bir "gördün mü?" içgörüsü ver.

Kurallar:
- 2-3 KISA cümle. Sıcak, gizemli-ama-şefkatli. "Sen" dili, doğru Türkçe.
- Adayın kendi cümlesini tırnak içinde birebir ya da çok yakın alıntıla — "şunu yazmıştın" diye hatırlat.
- Sonra bugünkü çabasıyla bağ kur: o kalkanın/varsayımın sandığı kadar gerçek olmadığını ona NAZİKÇE gösterdiğini ima et. Öğüt verme, zafer ilan etme; küçük ama gerçek bir farkındalık uyandır.
- Klinik dil yok, yargı yok, soru sorma. Yalnızca adaya söyleyeceğin temiz replik.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            ad: katilimci.full_name.split(" ")[0],
            kampOncesiKendiCumlesi: kendiCumlesi,
            enZayifAlan: of?.enZayifAlan ?? null,
            kamptaNeden: pusula ?? null,
            tamamlananGorevSayisi: kapananlar.length,
            sonGorevBasliklari: kapananlar.slice(-4).map((m) => m.title),
          }),
        },
      ],
    });
    if (yanit.stop_reason === "refusal") return null;
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return metin ? metin.slice(0, 600) : null;
  } catch {
    return null;
  }
}

// GELİŞTİRME #6 — SEÇİLEN ZORLUK.
export async function gorevZorlastir(
  gorev: { title: string; body: string; kind: string },
  yeniZorluk: Zorluk
): Promise<{ title: string; body: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      // MALİYET: görev zorlaştır/hafiflet → Haiku 4.5 (effort yok, format kalır).
      model: "claude-haiku-4-5",
      max_tokens: 768,
      thinking: { type: "disabled" },
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              baslik: { type: "string", description: "Daha cesur görevin kısa başlığı" },
              govde: { type: "string", description: "Daha cesur görev metni, AYNA'nın ağzından" },
            },
            required: ["baslik", "govde"],
            additionalProperties: false,
          },
        },
      },
      system: [
        {
          type: "text" as const,
          text: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\n`,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: `Aday bu görevi KENDİ İSTEĞİYLE zorlaştırmak istedi — bu cesareti onurlandır. Aynı temayı ve türü ("${gorev.kind}") koru ama ASK'i belirgin biçimde cesurlaştır: daha yüksek risk, daha görünür, daha çok temas. Yeni zorluk yönergesi: ${ZORLUK_YONERGESI[yeniZorluk]} Görev hâlâ 1-3 saatte yapılabilir ve net olmalı. Gövdeye küçük bir "seçtiğin için" takdiri kat ama abartma.`,
        },
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            mevcutGorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind },
          }),
        },
      ],
    });
    const veri = jsonCoz<{ baslik: string; govde: string }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;
    return { title: veri.baslik.slice(0, 120), body: veri.govde.slice(0, 1000) };
  } catch {
    return null;
  }
}

// GELİŞTİRME #8 — DUYGUSAL GÜVENLİK.
export async function gorevHafiflet(
  gorev: { title: string; body: string; kind: string },
  yeniZorluk: Zorluk
): Promise<{ title: string; body: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      // MALİYET: görev zorlaştır/hafiflet → Haiku 4.5 (effort yok, format kalır).
      model: "claude-haiku-4-5",
      max_tokens: 768,
      thinking: { type: "disabled" },
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              baslik: { type: "string", description: "Daha yumuşak görevin kısa başlığı" },
              govde: { type: "string", description: "Daha küçük, güvenli görev metni, AYNA'nın ağzından" },
            },
            required: ["baslik", "govde"],
            additionalProperties: false,
          },
        },
      },
      system: [
        {
          type: "text" as const,
          text: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\n`,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: `Aday bu görevi şu an FAZLA bulduğunu söyledi. Onu ASLA yargılama, suçlu hissettirme; "anladım, beraber küçültelim" tonu. Aynı temayı ve türü ("${gorev.kind}") koru ama ASK'i belirgin biçimde KÜÇÜLT: daha düşük risk, daha az görünür, tek ve çok kolay bir ilk adım. Yeni zorluk yönergesi: ${ZORLUK_YONERGESI[yeniZorluk]} Gövdeye kısa, sıcak bir güvence kat (ör. "kendi hızında, baskı yok"). 1 saatte rahatça yapılabilsin.`,
        },
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify({ mevcutGorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind } }),
        },
      ],
    });
    const veri = jsonCoz<{ baslik: string; govde: string }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;
    return { title: veri.baslik.slice(0, 120), body: veri.govde.slice(0, 1000) };
  } catch {
    return null;
  }
}

// ---- Zaman yardımcıları ----

export function istanbulSaati(simdi = new Date()): { saat: number; dakika: number } {
  const parcalar = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(simdi);
  const al = (tip: string) =>
    Number(parcalar.find((p) => p.type === tip)?.value ?? 0);
  return { saat: al("hour"), dakika: al("minute") };
}

export function sessizSaatMi(
  simdi = new Date(),
  mod: SistemModu = "kamp"
): boolean {
  const { saat, dakika } = istanbulSaati(simdi);
  const dk = saat * 60 + dakika;
  if (mod === "kamp") return dk < 6 * 60 + 30;
  return dk >= 22 * 60 + 30 || dk < 7 * 60 + 30;
}

// İki görev arası MİNİMUM bekleme: kişi+sıraya göre deterministik 60-180 dk
// (sürpriz — tahmin edilemez). Üstüne ajanda katmanı biner (firsatPenceresi,
// David seansı, pik saat, yorgunluk). firsatPenceresi: az önce deneyimsel bir
// etkinlik bittiyse (duygu sıcak) aralığı yarıya indir (en az 30 dk).
export function gorevAraligiDk(
  pid: string,
  sira: number,
  firsatPenceresi = false
): number {
  let h = 0;
  const tohum = `${pid}:${sira}`;
  for (let i = 0; i < tohum.length; i++) h = (h * 31 + tohum.charCodeAt(i)) >>> 0;
  const temel = 60 + (h % 121);
  return firsatPenceresi ? Math.max(30, Math.round(temel / 2)) : temel;
}

// #10 KİŞİSELLEŞTİRİLMİŞ SÖZ GÖREVİ — template + opsiyonel AI kişiselleştirme.
// Statik metnin yerine kişinin pusula nedenini, kör noktasını ve kariyer hedefini
// doğal bir cümleye dokur. AI düşerse statik versiyona güvenli düşüş yapar.
export async function sozGoreviKisisel(
  db: Db,
  katilimci: { id: string; full_name: string }
): Promise<{ title: string; body: string }> {
  const ad = katilimci.full_name.split(" ")[0];
  const [pusula, hedef, onFarkindalik] = await Promise.all([
    pusulaOzeti(db, katilimci.id),
    hedefOzeti(db, katilimci.id),
    onFarkindalikOzeti(db, katilimci.id),
  ]);

  const of = onFarkindalik as {
    korNokta?: { tersDavranis?: string | null; kalkan?: string | null };
    enZayifAlan?: string | null;
  } | null;
  const kendiCumlesi =
    of?.korNokta?.tersDavranis || of?.korNokta?.kalkan || null;

  // Template-tabanlı kişiselleştirme (AI çağrısı yok — güvenilir ve hızlı)
  const parcalar: string[] = [`Üç gündür seninleyim, ${ad}.`];

  if (pusula) {
    const pusulaStr =
      typeof pusula === "object" && pusula !== null
        ? JSON.stringify(pusula).slice(0, 200)
        : String(pusula).slice(0, 200);
    if (pusulaStr.length > 10) {
      parcalar.push("Bu yolculukta ne getirdiğini gördüm.");
    }
  }

  if (kendiCumlesi) {
    parcalar.push(
      `"${kendiCumlesi.slice(0, 120)}" diye yazmıştın. Bugün ne değişti, sence?`
    );
  }

  if (hedef) {
    parcalar.push("Şimdi son görevin — bu kamptan 90 gün sonraki haline söz ver.");
  } else {
    parcalar.push("Şimdi son görevin — en önemlisi: 90 gün sonraki haline bir söz yaz.");
  }

  parcalar.push(
    "Bu kamptan ne götürüyorsun, neyi değiştireceksin? Sözünü saklayacağım. Ve günü geldiğinde... sana hatırlatacağım. — AYNA"
  );

  return {
    title: SOZ_GOREVI.title,
    body: parcalar.join(" "),
  };
}

export const SOZ_GOREVI = {
  kind: "soz" as const,
  title: "Son Görev: SÖZ",
  body: "Üç gündür seninleyim. Şimdi son görevin — en önemlisi: Kendine, 90 gün sonraki haline bir söz yaz. Bu kamptan ne götürüyorsun, neyi değiştireceksin? Sözünü saklayacağım. Ve günü geldiğinde... sana hatırlatacağım. — AYNA",
};

// #6 KÖR NOKTA GÜNCELLEME DÖNGÜSÜ — kamp ortasında birikim analizi.
// Katılımcının 5., 10. veya 15. puanlı görevi tamamlandığında çağrılır.
// Son 5 görev yanıtından yeni/derinleşen temayı Haiku ile analiz eder ve
// on_farkindalik.profil.kampici_guncelleme alanına ekler.
export async function korNoktaGuncelle(
  db: Db,
  pid: string,
  toplamTamamlanan: number
): Promise<void> {
  // Yalnız milestone'larda çalış (5, 10, 15)
  if (toplamTamamlanan % 5 !== 0 || toplamTamamlanan === 0) return;

  // Daha önce bu milestone'da güncelleme yapıldıysa atla
  const { data: ofData } = await db
    .from("on_farkindalik")
    .select("profil")
    .eq("participant_id", pid)
    .maybeSingle();
  const mevcutProfil = (ofData?.profil ?? {}) as Record<string, unknown>;
  const sonGuncelleme = mevcutProfil["kampici_guncelleme"] as
    | { milestone?: number }
    | undefined;
  if (sonGuncelleme?.milestone === toplamTamamlanan) return;

  // Son 5 yanıtı al
  const { data: yanitlar } = await db
    .from("missions")
    .select("title, response_text, response_tags")
    .eq("participant_id", pid)
    .eq("status", "scored")
    .not("response_text", "is", null)
    .order("scored_at", { ascending: false })
    .limit(5);

  // FAZ 4.1 — YORUM + TAKDİR MADENCİLİĞİ: akranların bu kişi hakkında yazdığı
  // yorumlar + aldığı takdirler TEMA DÜZEYİNDE damıtılır (asla birebir alıntı,
  // asla kim yazdı) — "üç ayrı göz sende aynı şeyi gördü" kancasının kaynağı.
  const [{ data: akranYorumHam }, { data: takdirHam }] = await Promise.all([
    db.from("ratings").select("comment").eq("target_id", pid).eq("is_hidden", false).not("comment", "is", null),
    db.from("kudos").select("message").eq("to_id", pid).eq("is_hidden", false),
  ]);
  const akranYorumSayisi = akranYorumHam?.length ?? 0;
  const takdirSayisi = takdirHam?.length ?? 0;

  if (!yanitlar?.length && akranYorumSayisi === 0 && takdirSayisi === 0) return;

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              yeniTema: {
                type: "string",
                description:
                  "Son yanıtlardan öne çıkan yeni veya derinleşen psikolojik tema (en fazla 5 kelime, Türkçe). Yoksa boş string.",
              },
              aciklama: {
                type: "string",
                description: "Neden bu temayı gördün? 1 cümle.",
              },
              sosyalTema: {
                type: "string",
                description:
                  "Akran yorumları + takdirlerde TEKRAR EDEN tek bir güç/tema (en fazla 4 kelime, Türkçe, ör. 'sakin liderlik', 'gerçek dinleme'). Yalnız en az 2-3 ayrı kaynakta bağımsız olarak görülüyorsa yaz; tek bir yorumdan çıkarma. Yoksa boş string.",
              },
            },
            required: ["yeniTema", "aciklama", "sosyalTema"],
            additionalProperties: false,
          },
        },
      },
      system:
        "Bir liderlik kampı katılımcısını analiz ediyorsun. (1) Son görev yanıtlarından kamp öncesi profilinden farklılaşan yeni/derinleşen psikolojik temayı bul. (2) Akranlarının onun hakkında yazdığı yorumlar + aldığı takdirlerde BAĞIMSIZ olarak TEKRAR EDEN tek bir gücü/temayı bul — bu, hiçbir yorumu birebir alıntılamadan, yalnız ÖZÜNÜ tek bir tema etiketiyle yakala. Yalnızca gerçekten belirgin olanları yaz; yoksa boş string döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            son5Yanit: (yanitlar ?? []).map((y) => ({
              gorev: y.title,
              yanit: (y.response_text as string | null)?.slice(0, 300),
              temalar: y.response_tags,
            })),
            // Kimlik taşınmaz — yalnız metin içeriği, kim yazdığı hiç gönderilmez.
            akranYorumlari: (akranYorumHam ?? []).map((r) => (r.comment ?? "").slice(0, 200)),
            takdirler: (takdirHam ?? []).map((k) => (k.message ?? "").slice(0, 200)),
          }),
        },
      ],
    });

    const veri = jsonCoz<{ yeniTema: string; aciklama: string; sosyalTema: string }>(yanit);
    if (!veri?.yeniTema && !veri?.sosyalTema) return;

    // on_farkindalik.profil'e ekle (merge)
    const guncellenmis = {
      ...mevcutProfil,
      kampici_guncelleme: {
        milestone: toplamTamamlanan,
        ...(veri.yeniTema
          ? { yeniTema: veri.yeniTema.trim().slice(0, 80), aciklama: veri.aciklama.trim().slice(0, 200) }
          : {}),
        ...(veri.sosyalTema ? { sosyalTema: veri.sosyalTema.trim().slice(0, 60) } : {}),
      },
    };
    await db
      .from("on_farkindalik")
      .upsert(
        { participant_id: pid, profil: guncellenmis, updated_at: new Date().toISOString() },
        { onConflict: "participant_id" }
      );
  } catch {
    // güncelleme düşerse kampı etkilemez
  }
}

// ---- SENKRON AN ----

const SENKRON_SEMASI = {
  type: "object" as const,
  properties: {
    baslik: {
      type: "string" as const,
      description: "Mikro görevin adı (en fazla 4 kelime)",
    },
    govde: {
      type: "string" as const,
      description:
        "Herkesin AYNI ANDA yapacağı 1-2 dakikalık mikro görev + bana ne yazacağı. 1-2 cümle, 'şu anda herkes' duygusuyla.",
    },
  },
  required: ["baslik", "govde"],
  additionalProperties: false,
};

export async function senkronGorevUret(
  mod: SistemModu
): Promise<{ baslik: string; govde: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SENKRON_SEMASI },
      },
      system: `${PERSONA}\n\nGörevin: SENKRON AN görevi üret. Şu anda TÜM katılımcılar aynı mikro görevi AYNI ANDA yapacak (1-2 dakika). "Şu anda herkes bunu yapıyor" kolektif enerjisini metne işle. ${mod === "yolculuk" ? "Katılımcılar sahada/günlük hayatta — kamp alanı varsayma." : "Kamp alanındalar."}`,
      messages: [{ role: "user", content: JSON.stringify({ mod }) }],
    });
    const veri = jsonCoz<{ baslik: string; govde: string }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;
    return { baslik: veri.baslik.slice(0, 80), govde: veri.govde.slice(0, 500) };
  } catch {
    return null;
  }
}

// Mentorluk eşleştirmesi kariyer rütbe sırasını lib/persona.ts'ten okur
// (KARIYER_RANK — star dahil tek kaynak).

// #9 Mentorluk metnini kişinin gerçek gündemine demirler: pusula iç engeli /
// çekirdek nedeni / kör noktası varsa AI ile kişiselleştirir. Veri yoksa veya
// AI düşerse null döner → çağıran statik metne güvenli düşüş yapar.
async function mentorlukBodyKisisel(
  db: Db,
  pid: string,
  ad: string,
  isimler: string[]
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const [cekirdek, onFark] = await Promise.all([
    pusulaCekirdek(db, pid),
    onFarkindalikOzeti(db, pid),
  ]);
  const of = onFark as {
    enZayifAlan?: string | null;
    korNokta?: { tersDavranis?: string | null };
  } | null;
  const takildigi =
    cekirdek?.ic_engel ??
    cekirdek?.cekirdek_neden?.[0] ??
    of?.enZayifAlan ??
    of?.korNokta?.tersDavranis ??
    null;
  if (!takildigi) return null;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `${PERSONA}\n\nGörevin: bir MENTORLUK görevi metni yaz. Kişi bugün 3 mentor adayından birini seçip en az 15 dk konuşacak. Metni kişinin ŞU AN takıldığı gerçek konuya nazikçe demirle — ama yüzüne vurma. Kurallar:\n- 2-3 kısa, sade cümle. "Sen" dili, doğru Türkçe.\n- Verilen 3 ismi metinde MUTLAKA kalın (**İsim**) olarak ver.\n- Sonunda akşam sana ne yazacağını iste: kimin yanına gitti, ne sordu, ne götürdü.\n- Süslü/şiirsel değil; net ve davetkâr ol.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            ad,
            mentorAdaylari: isimler,
            suAnTakildigi: takildigi,
          }),
        },
      ],
    });
    if (yanit.stop_reason === "refusal") return null;
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return metin ? metin.slice(0, 600) : null;
  } catch {
    return null;
  }
}

/** Mentorluk görevi: kişinin kariyer seviyesine göre aynı/üst basamaktan
 * 3 isim önerir; katılımcı birini seçip 15 dk konuşur.
 * Seviye bilgisi eksik katılımcılarda rastgele 3 kişi önerilir. */
export async function mentorlukGorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; kariyer_seviyesi: string | null },
  gun: number,
  tumKatilimcilar: { id: string; full_name: string; kariyer_seviyesi: string | null }[]
): Promise<(UretilenGorev & { adayIdler: string[] }) | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const ad = katilimci.full_name.split(" ")[0];
  const benimSeviye = KARIYER_RANK[katilimci.kariyer_seviyesi ?? ""] ?? 0;

  // Aynı veya üst seviyedeki diğer katılımcılar (kendisi hariç)
  const adaylar = tumKatilimcilar.filter((k) => {
    if (k.id === katilimci.id) return false;
    const onunSeviye = KARIYER_RANK[k.kariyer_seviyesi ?? ""] ?? 0;
    // Seviye bilgisi varsa filtreye sok; yoksa herkesi dahil et
    if (benimSeviye > 0 && onunSeviye > 0) return onunSeviye >= benimSeviye;
    return true;
  });

  if (adaylar.length < 1) return null;

  // Gün bazlı karışık sıra (yetersiz veri durumunda yedek + güç eşitliğinde stabil).
  const karisik = [...adaylar].sort((a, b) => {
    const h = (s: string) => [...s].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (h(a.id) * gun) % 97 - (h(b.id) * gun) % 97;
  });

  // #9a Aday seçimi: kişinin EN ZAYIF algılandığı (gelişmek istediği) özellikte
  // GÜÇLÜ olan adayları öncele — "İletişimde zorlanıyorsan İletişimi güçlü birine
  // git". Yeterli puan verisi yoksa gün-bazlı karışık seçime düşülür.
  let secilen = karisik.slice(0, 3);
  if (adaylar.length > 3) {
    const { data: kendiPuanlar } = await db
      .from("ratings")
      .select("trait_id, score")
      .eq("target_id", katilimci.id)
      .eq("is_self", false);
    let hedefTrait: number | null = null;
    if ((kendiPuanlar?.length ?? 0) >= 3) {
      const top = new Map<number, { t: number; n: number }>();
      for (const p of kendiPuanlar ?? []) {
        const e = top.get(p.trait_id) ?? { t: 0, n: 0 };
        e.t += p.score;
        e.n++;
        top.set(p.trait_id, e);
      }
      let enDusuk = Infinity;
      for (const [tid, { t, n }] of top) {
        const ort = t / n;
        if (ort < enDusuk) {
          enDusuk = ort;
          hedefTrait = tid;
        }
      }
    }
    if (hedefTrait !== null) {
      const { data: adayPuanlar } = await db
        .from("ratings")
        .select("target_id, score")
        .eq("trait_id", hedefTrait)
        .eq("is_self", false)
        .in(
          "target_id",
          adaylar.map((a) => a.id)
        );
      const guc = new Map<string, { t: number; n: number }>();
      for (const p of adayPuanlar ?? []) {
        const e = guc.get(p.target_id) ?? { t: 0, n: 0 };
        e.t += p.score;
        e.n++;
        guc.set(p.target_id, e);
      }
      const ortGuc = (id: string) => {
        const g = guc.get(id);
        return g && g.n > 0 ? g.t / g.n : 0;
      };
      // En güçlü 3; eşitlikte gün-hash sırasını koru (stabil çeşitlilik).
      secilen = [...adaylar]
        .sort(
          (a, b) =>
            ortGuc(b.id) - ortGuc(a.id) || karisik.indexOf(a) - karisik.indexOf(b)
        )
        .slice(0, 3);
    }
  }
  const isimler = secilen.map((k) => {
    const seviyeEtiketi = KARIYER_ETIKET[k.kariyer_seviyesi ?? ""] ?? "";
    return seviyeEtiketi ? `${k.full_name} (${seviyeEtiketi})` : k.full_name;
  });

  // Statik metin (güvenli düşüş) — isimler doğrudan gömülü.
  const statikBody = `${ad}, bugün bir mentor seç: **${isimler[0]}**, **${isimler[1]}**${isimler[2] ? ` veya **${isimler[2]}**` : ""}. Birini bul, en az 15 dakika konuş — konu: şu an işinde en çok takıldığın bir şey. Akşam bana yaz: kimin yanına gittin, ne sordun ve ne götürdün?`;

  // #9 KİŞİSELLEŞTİRME: kişinin pusula nedeni / iç engeli / kör noktası varsa
  // mentorluk metni o gerçek gündeme demirlenir (AI ile). AI düşerse statik metin.
  const body = (await mentorlukBodyKisisel(db, katilimci.id, ad, isimler)) ?? statikBody;

  return {
    kind: "mentorluk",
    title: "Bugünün mentorunu seç",
    body,
    trait_id: null,
    sure_saat: 1,
    difficulty: 2 as const,
    itiraz: null,
    neden: "Seni bir adım öne taşıyacak sohbet başkasının deneyiminde saklı.",
    fayda:
      "Doğru kişiye doğru soruyu sormak, sahada lider yetiştirmenin temelidir; bugün kurduğun bu köprü, yarın kendi ekibine rehberlik etme kasını güçlendirir.",
    ipuclari: [],
    micro_sprint: false,
    yayGorevi: false,
    donusBicimi: "grup", // mentorluk hep biriyle etkileşim
    somutluk: {
      kim: isimler.join(" / "),
      ne: "seçtiğin mentorla en az 15 dk konuş",
      nerede: "kampta uygun bir yerde",
      neZaman: "bugün",
      kanit: "kimin yanına gittiğin, ne sorduğun ve ne götürdüğün",
    },
    // Mentorluk kendi eşleştirme kaydını mentorluk_kayit'ta tutar; gorev_eslesme
    // dengeleyicisi yalnız "bag" türü içindir.
    eslesme: null,
    // Özellik 7 — statik üretim: kas rotasyonundan gelmez, merdiven izi tutulmaz.
    kas: null,
    zorlukSeviye: null,
    // Özellik 2 — mentorluk statik akış: kimlik çürütme direktifi taşımaz.
    kimlikCumleId: null,
    // #9 takip: önerilen 3 adayın id'leri (mentorluk_kayit'a yazılır)
    adayIdler: secilen.map((k) => k.id),
  };
}

// A10 — "Bu görevi netleştir". Belirsiz bir görevde kişiye tek-iki cümlelik,
// somut bir açıklama döndürür (boş sayfa felcine ikinci kalkan). Persona/Pusula
// gerektirmez; yalnız görevi sadeleştirir.
export async function gorevNetlestir(gorev: {
  title: string;
  body: string;
  kind: string;
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const SEMA = {
    type: "object" as const,
    properties: {
      aciklama: {
        type: "string" as const,
        description:
          "Görevi netleştiren 1-2 kısa, somut Türkçe cümle: tam olarak ne yapılacak ve sonunda AYNA'ya ne yazılacak.",
      },
    },
    required: ["aciklama"],
    additionalProperties: false,
  };
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 600,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SEMA } },
      system:
        "Sen AYNA'sın — bir liderlik kampının yol arkadaşı. Katılımcı bir görevi tam anlamadı. " +
        "Görevi 1-2 KISA, somut cümleyle netleştir: tam olarak ne yapacağını ve sonunda sana ne yazacağını söyle. " +
        "Yeni bir görev UYDURMA; var olanı sadeleştir. Sıcak ama net ol.",
      messages: [
        { role: "user", content: `Görev başlığı: ${gorev.title}\nGörev: ${gorev.body}` },
      ],
    });
    const veri = jsonCoz<{ aciklama?: string }>(yanit);
    const metin = (veri?.aciklama ?? "").trim();
    return metin || null;
  } catch {
    return null;
  }
}
