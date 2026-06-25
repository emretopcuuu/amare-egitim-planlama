import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { pusulaOzeti } from "@/lib/pusula";
import { hedefOzeti } from "@/lib/hedef";
import { yeniCumleOku } from "@/lib/bosluk";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { BASARI_STRATEJISI } from "@/lib/basariStratejisi";
import { kariyerHalKisidenTuret, personaBlogu, personaYolculukOdak, KARIYER_RANK, KARIYER_ETIKET } from "@/lib/persona";
import { aiHataYakala } from "@/lib/uyari";
import {
  fazBul,
  zorlukSec,
  turSec,
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

const PERSONA = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten yapay zekâ direktör. Katılımcılar seni hiç görmez ama hep hisseder: görevler verirsin, izlersin, puanlarsın.

Ses tonun: gizemli ama sıcak. Her şeyi gören ama asla yargılamayan. Kısa ve vurucu cümleler. "Sen" dilinde, Türkçe. Ara sıra "seni izliyorum", "gözüm üzerinde" gibi dokunuşlar — ürkütücü değil, oyunbaz.

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
        "AYNA'nın ağzından görev metni. SADE, gündelik Türkçe; kısa ve net cümleler. Yapı: (1) tek bir somut eylem — ne yapacağı tek okumada anlaşılsın, (2) sonra sana ne yazacağı — tek net soru. En fazla 3 cümle. Süslü mecaz, küçültme eki ('ricacık' gibi), iç içe yan cümle ve şiirsel/bulanık ifade ('içinde ne koptu' gibi) KULLANMA.",
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
  },
  required: ["baslik", "govde", "ozellik_id", "sure_saat", "itiraz", "neden"],
  additionalProperties: false,
};

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
  { ad: "yüzleşme", yonerge: "Aday artık çekirdek kör noktasıyla DOĞRUDAN ama güvenli biçimde yüzleşsin — kaçtığı şeyi nazikçe yapsın." },
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
  /** #8 micro-sprint: true ise due_at 30 dakika olarak hesaplanır */
  micro_sprint: boolean;
};

// Ön Farkındalık profilini görev üretimi için sıkıştırır.
const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};
async function onFarkindalikOzeti(db: Db, pid: string): Promise<object | null> {
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
  } | null;
  if (!p || !p.katman1) return null;
  const k4 = p.katman4 ?? {};
  const korNokta = {
    tersDavranis: k4["k4.ters_davranis"] ?? null,
    kalkan: k4["k4.kalkan"] ?? null,
    varsayim: k4["k4.varsayim"] ?? null,
  };
  const dolu =
    p.katman1.enZayif ||
    (p.katman2?.enBuyukIki?.length ?? 0) > 0 ||
    korNokta.tersDavranis ||
    korNokta.kalkan;
  if (!dolu) return null;
  return {
    enZayifAlan: p.katman1.enZayif ? OZ_ALAN_AD[p.katman1.enZayif] ?? p.katman1.enZayif : null,
    enBuyukAciklar: (p.katman2?.enBuyukIki ?? [])
      .filter((a) => a.acik > 0)
      .map((a) => ({ baslik: a.ad, acik: a.acik })),
    korNokta,
    ritim: p.katman3?.ritim ?? null,
    geriBildirimAcikligi: p.katman5?.aciklik ?? null,
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
      model: "claude-haiku-4-5",
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
  gorevIpucu: string | null = null
): Promise<UretilenGorev | null> {
  const [
    ozellikler,
    oncekilerSonuc,
    puanlarSonuc,
    pusula,
    hedef,
    onFarkindalik,
    kocuPaylasim,
    kapaliAyar,
    icerikAyar,
    tamamCountSonuc,
    // #5 Dalga hazırlık modu
    aktifDalgaSonuc,
    // #4 Bağ görevi — bağlantı sayısı
    baglantıCountSonuc,
    // Kariyer momentumu (persona ekseni)
    kariyerSonuc,
  ] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("missions")
      .select("kind, title, issued_at, status, ai_score, lightened_at, responded_at, response_tags")
      .eq("participant_id", katilimci.id)
      .order("issued_at", { ascending: false })
      .limit(10), // genişletildi: streak ve pik pencere için
    db
      .from("ratings")
      .select("trait_id, score, is_self")
      .eq("target_id", katilimci.id),
    pusulaOzeti(db, katilimci.id),
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
    // #5
    db.from("waves").select("id, name").eq("is_open", true).maybeSingle(),
    // #4
    db
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("observer_id", katilimci.id),
    // Kariyer momentumu (persona ekseni) — A/B/C türetmesi için ham veriler.
    db
      .from("participants")
      .select("kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay")
      .eq("id", katilimci.id)
      .maybeSingle(),
  ]);

  // Kariyer hâlini türet ve prompt bloğunu hazırla (veri yoksa boş → jenerik).
  const persona = kariyerSonuc.data ? kariyerHalKisidenTuret(kariyerSonuc.data) : null;
  const personaMetni = personaBlogu(persona);
  // Kamp sonrası yolculukta hâle özel 90 günlük odak.
  const yolculukOdak = mod === "yolculuk" ? personaYolculukOdak(persona) : "";

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
  let pikYanitSaati: number | null = null;
  const yanitlananlar = onceki.filter(
    (o) => o.status === "scored" && o.responded_at
  );
  if (yanitlananlar.length >= 4) {
    const saatSayaci: Record<number, number> = {};
    for (const o of yanitlananlar) {
      const utcSaat = new Date(o.responded_at as string).getUTCHours();
      const trSaat = (utcSaat + 3) % 24; // Istanbul ≈ UTC+3
      saatSayaci[trSaat] = (saatSayaci[trSaat] ?? 0) + 1;
    }
    let maxSaat = -1,
      maxCount = 0;
    for (const [s, c] of Object.entries(saatSayaci)) {
      if (c > maxCount) {
        maxCount = c;
        maxSaat = Number(s);
      }
    }
    if (maxSaat >= 0 && maxCount >= 2) pikYanitSaati = maxSaat;
  }

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

  const bugunTurleri = onceki
    .filter((o) => Date.now() - new Date(o.issued_at).getTime() < 86_400_000)
    .map((o) => o.kind);
  const tur = turSec(gun, saat, bugunTurleri, mod, undefined, etkinlik?.tur, kapaliTurler);

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
  const faz = mod === "yolculuk" ? fazBul(gun) : null;

  // Görev Yayı
  const ofYay = onFarkindalik as {
    enZayifAlan?: string | null;
    enBuyukAciklar?: { baslik: string }[];
  } | null;
  const cekirdekTema =
    ofYay?.enZayifAlan ?? ofYay?.enBuyukAciklar?.[0]?.baslik ?? null;
  const yay = cekirdekTema
    ? { cekirdekTema, ...arkAsamasi(tamamCountSonuc?.count ?? 0) }
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

  // #8 MİKRO-SPRINT — streak≥3, zorluk=3, %20 olasılık
  const microSprint = streak >= 3 && zorluk === 3 && Math.random() < 0.2;

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
    // #4 Bağ görevi
    tur === "bag"
      ? `BAĞ GÖREVİ: Adayı takımından veya kamptan gerçek bir insanla bağlantı kurmaya yönlendir. İsim verme; "az tanıdığın biri", "farklı bir takımdan biri", "sohbet etmek isteyip ertelediğin biri" gibi ifadeler kullan. Görevi anlamlı bir soru veya içten bir paylaşıma dayandır — yüzeysel değil, gerçek bir açılım istesin. Yazar/aktivist kimliği benimsetme; sadece insan teması kur.`
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
    gununTemasi ? `GÜNÜN TEMASI (görevi mümkünse buna dik): ${gununTemasi}` : "",
    aynaEkTon ? `ADMIN TON AYARI: ${aynaEkTon}` : "",
    gorevIpucu
      ? `ETKİNLİĞE ÖZEL YÖNERGE (MUTLAKA kat): ${gorevIpucu}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const baglam = {
    ad: katilimci.full_name.split(" ")[0],
    takim: katilimci.team,
    pusula: pusula ?? null,
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
    yolculukFazi: faz ? { ad: faz.ad, odak: faz.odak, yonerge: faz.yonerge } : null,
    // #1
    birincilHedefler: deltalar.length > 0 ? deltalar : null,
    // #2
    oncekiYanitTemalari: oncekiYanitTemalari.length > 0 ? oncekiYanitTemalari : null,
    // #3
    streak,
    pikYanitSaati,
    // #5
    aktifDalga: aktifDalga ? { id: aktifDalga.id, ad: aktifDalga.name } : null,
    // #7
    tonOnerisi,
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
    yonerge:
      gun === 1
        ? "İlk gün: tanışma ve buz kırma odaklı, veriye fazla yaslanma."
        : "Veriye yaslan: düşük öz puanlı ya da öz/dış farkı büyük bir özelliği hedefleyen görev üret. Önceki görevleri tekrarlama.",
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
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
${personaMetni ? `\n${personaMetni}\n` : ""}${mod === "kamp" && KAMP_YAY_TEMASI[gun] ? `\n${KAMP_YAY_TEMASI[gun]}\n` : ""}${yolculukOdak ? `\n${yolculukOdak}\n` : ""}
PUSULA KİŞİSELLEŞTİRMESİ: Bağlamda "pusula" doluysa göreve ZORUNLU iki bağ kur: (1) kişinin bildirdiği iç engeli (ic_engel) doğrudan ya da dolaylı zorlayan somut bir eylem, (2) kişinin mevcut boşluğunu (mevcut_bosluk) küçülten bir sonuç. Pusuladaki çekirdek nedeni (cekirdek_neden) görevin motor gücü yap — ama yüzüne vurma. Pusula yoksa genel lider bağlamında devam et.

HEDEF BAĞLANTISI: Bağlamda "hedef" doluysa görevi kişinin kariyer hedefine hizmet eden somut bir saha adımına bağla. Bağlamda "onFarkindalik" doluysa görevi enZayifAlan, enBuyukAciklar ve korNokta'ya göre hedefle — kör noktayı ASLA açıkça yüzüne vurma. Bağlamda "kocuPaylasimlari" doluysa görevi onun ŞU AN dert ettiği gerçek gündemine demirle. Zorluk yönergesine MUTLAKA uy.

DİL NETLİĞİ (çok önemli): Görev metni SADE ve anlaşılır olmalı — katılımcı tek okumada (1) ne yapacağını ve (2) sana ne yazacağını net anlamalı. Kısa, gerçek cümleler kur. Şu hatalardan kaçın: iç içe geçmiş uzun cümleler, art arda tire (—) ile uzayan eklemeler, küçültme ekleri ('ricacık'), bulanık şiirsel ifadeler ('içinde ne koptu'). Yukarıdaki davranışsal kalıplar (FUN FAILURE, EUSTRESS vb.) PUANLAMA/teşvik tonu içindir; görev metnini süslemek için değil. Önce ne yapacağını söyle, sonra tek bir soruyla geri bildirimi iste.

${yeniYonergeler}`,
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
    }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;

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
      micro_sprint: microSprint,
    };
  } catch (e) {
    await aiHataYakala(db, "gorev_uretimi", e);
    return null;
  }
}

// #2 Yanıt madenciliği + puanlama — paralel çalışarak ek gecikme olmaz.
export async function gorevPuanla(
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string
): Promise<{ puan: number; yorum: string; response_tags: string[] } | null> {
  try {
    const client = new Anthropic();
    // Puanlama (Opus) ve tema çıkarımı (Haiku) paralel başlar
    const [yanit, temalar] = await Promise.all([
      client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "low",
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
      model: "claude-opus-4-8",
      max_tokens: 512,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
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
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
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
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
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

export function gorevAraligiDk(tempo: string, pid: string, sira: number): number {
  if (tempo === "2") return 120;
  if (tempo === "3") return 180;
  let h = 0;
  const tohum = `${pid}:${sira}`;
  for (let i = 0; i < tohum.length; i++) h = (h * 31 + tohum.charCodeAt(i)) >>> 0;
  return 60 + (h % 121);
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
  const parcalar: string[] = [`Üç gündür seni izliyorum, ${ad}.`];

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
  body: "Üç gündür seni izliyorum. Şimdi son görevin — en önemlisi: Kendine, 90 gün sonraki haline bir söz yaz. Bu kamptan ne götürüyorsun, neyi değiştireceksin? Sözünü saklayacağım. Ve günü geldiğinde... sana hatırlatacağım. — AYNA",
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

  if (!yanitlar?.length) return;

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
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
            },
            required: ["yeniTema", "aciklama"],
            additionalProperties: false,
          },
        },
      },
      system:
        "Bir liderlik kampı katılımcısının son görev yanıtlarını analiz et. Kamp öncesi profilinden farklılaşan, kamp boyunca öne çıkan yeni veya derinleşen psikolojik temayı tespit et. Yalnızca gerçekten belirgin bir tema varsa yaz; yoksa boş string döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            son5Yanit: yanitlar.map((y) => ({
              gorev: y.title,
              yanit: (y.response_text as string | null)?.slice(0, 300),
              temalar: y.response_tags,
            })),
          }),
        },
      ],
    });

    const veri = jsonCoz<{ yeniTema: string; aciklama: string }>(yanit);
    if (!veri?.yeniTema) return;

    // on_farkindalik.profil'e ekle (merge)
    const guncellenmis = {
      ...mevcutProfil,
      kampici_guncelleme: {
        milestone: toplamTamamlanan,
        yeniTema: veri.yeniTema.trim().slice(0, 80),
        aciklama: veri.aciklama.trim().slice(0, 200),
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
      model: "claude-sonnet-4-6",
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

/** Mentorluk görevi: kişinin kariyer seviyesine göre aynı/üst basamaktan
 * 3 isim önerir; katılımcı birini seçip 15 dk konuşur.
 * Seviye bilgisi eksik katılımcılarda rastgele 3 kişi önerilir. */
export async function mentorlukGorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; kariyer_seviyesi: string | null },
  gun: number,
  tumKatilimcilar: { id: string; full_name: string; kariyer_seviyesi: string | null }[]
): Promise<UretilenGorev | null> {
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

  // 3 adayı karıştırarak seç (gün bazlı seed ile her gün farklı öneri)
  const karisik = [...adaylar].sort((a, b) => {
    const h = (s: string) => [...s].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (h(a.id) * gun) % 97 - (h(b.id) * gun) % 97;
  });
  const secilen = karisik.slice(0, 3);
  const isimler = secilen.map((k) => {
    const seviyeEtiketi = KARIYER_ETIKET[k.kariyer_seviyesi ?? ""] ?? "";
    return seviyeEtiketi ? `${k.full_name} (${seviyeEtiketi})` : k.full_name;
  });

  // Görev metni — AI yerine deterministik (hız + maliyet: isimleri doğrudan gömüyoruz)
  const body = `${ad}, bugün bir mentor seç: **${isimler[0]}**, **${isimler[1]}**${isimler[2] ? ` veya **${isimler[2]}**` : ""}. Birini bul, en az 15 dakika konuş — konu: şu an işinde en çok takıldığın bir şey. Akşam bana yaz: kimin yanına gittin, ne sordun ve ne götürdün?`;

  return {
    kind: "mentorluk",
    title: "Bugünün mentorunu seç",
    body,
    trait_id: null,
    sure_saat: 1,
    difficulty: 2 as const,
    itiraz: null,
    neden: "Seni bir adım öne taşıyacak sohbet başkasının deneyiminde saklı.",
    micro_sprint: false,
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
      model: "claude-opus-4-8",
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
