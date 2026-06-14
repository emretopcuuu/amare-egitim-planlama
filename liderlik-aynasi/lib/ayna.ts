import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { pusulaOzeti } from "@/lib/pusula";
import { yeniCumleOku } from "@/lib/bosluk";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { BASARI_STRATEJISI } from "@/lib/basariStratejisi";
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
        "AYNA'nın ağzından görev metni: ne yapacak + bana ne yazacak. 2-4 cümle.",
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
  },
  required: ["baslik", "govde", "ozellik_id", "sure_saat", "itiraz"],
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

export type UretilenGorev = {
  kind: GorevTuru;
  title: string;
  body: string;
  trait_id: number | null;
  sure_saat: number;
  difficulty: Zorluk;
  /** simulasyon: itirazcının söylediği cümle(ler) — sese çevrilir */
  itiraz: string | null;
};


export async function gorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; team: string | null },
  gun: number,
  saat: number,
  mod: SistemModu = "kamp",
  etkinlik: ProgramMaddesi | null = null
): Promise<UretilenGorev | null> {
  const [ozellikler, oncekilerSonuc, puanlarSonuc, pusula] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("missions")
      .select("kind, title, issued_at, status, ai_score")
      .eq("participant_id", katilimci.id)
      .order("issued_at", { ascending: false })
      .limit(6),
    db
      .from("ratings")
      .select("trait_id, score, is_self")
      .eq("target_id", katilimci.id),
    // FAZ 0 Pusula: kişinin nedeni/iç engeli — görevi buna göre kişiselleştir.
    pusulaOzeti(db, katilimci.id),
  ]);
  const onceki = oncekilerSonuc.data ?? [];
  const puanlar = puanlarSonuc.data ?? [];
  // FAZ 2 re-entry: yolculukta kamp sonrası görev, kişinin yeni cümlesini savunur.
  const yeniCumle = mod === "yolculuk" ? await yeniCumleOku(db, katilimci.id) : null;

  const ozet = new Map<number, { oz: number[]; dis: number[] }>();
  for (const p of puanlar) {
    const k = ozet.get(p.trait_id) ?? { oz: [], dis: [] };
    (p.is_self ? k.oz : k.dis).push(p.score);
    ozet.set(p.trait_id, k);
  }
  const ort = (d: number[]) =>
    d.length ? Number((d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)) : null;

  const bugunTurleri = onceki
    .filter((o) => Date.now() - new Date(o.issued_at).getTime() < 86_400_000)
    .map((o) => o.kind);
  const tur = turSec(gun, saat, bugunTurleri, mod, undefined, etkinlik?.tur);

  // EUSTRESS: son görev formundan akış-kanalı zorluğu
  const kapananlar = onceki.filter(
    (o) => o.status === "scored" || o.status === "expired"
  );
  const puanlilar = kapananlar.filter((o) => o.ai_score !== null);
  const zorluk = zorlukSec({
    puanOrt: puanlilar.length
      ? puanlilar.reduce((t, o) => t + (o.ai_score ?? 0), 0) / puanlilar.length
      : null,
    teslimOrani: kapananlar.length
      ? kapananlar.filter((o) => o.status === "scored").length /
        kapananlar.length
      : 1,
    sonSuresiDoldu: kapananlar[0]?.status === "expired",
  });
  const faz = mod === "yolculuk" ? fazBul(gun) : null;

  const baglam = {
    ad: katilimci.full_name.split(" ")[0],
    takim: katilimci.team,
    // FAZ 0 Pusula: kişinin kamp öncesi damıtılmış nedeni + iç engeli (varsa).
    pusula: pusula ?? null,
    // FAZ 2: kişinin kampta yazdığı yeni cümle (yolculukta savunulacak çapa).
    yeniCumle: yeniCumle ?? null,
    kampGunu: gun,
    saat,
    istenenGorevTuru: tur,
    zorlukSeviyesi: zorluk,
    zorlukYonergesi: ZORLUK_YONERGESI[zorluk],
    mod,
    suankiKampEtkinligi: etkinlik
      ? {
          baslik: etkinlik.baslik,
          bitisSaati: etkinlik.bitis,
          not: "Görevi mümkünse bu etkinliğin içine dik — kampın o anki gerçek akışına otursun, etkinlikle yarışmasın.",
        }
      : null,
    yolculukFazi: faz
      ? { ad: faz.ad, odak: faz.odak, yonerge: faz.yonerge }
      : null,
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
      system: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\n${BASARI_STRATEJISI}\n\nGörevin: verilen bağlama göre TEK bir görev üret. Tür "${tur}" olmalı. Bağlamda "pusula" doluysa (kişinin nedeni + iç engeli), görevi ona göre kişiselleştir: nedenine sessizce dokun ve iç engelini nazikçe zorlayan bir görev seç — ama iç engeli açıkça yüzüne vurma. Zorluk yönergesine MUTLAKA uy. ${tur === "gizli" ? 'Gizli görevse "Bunu kimseye söyleme" ruhuyla yaz.' : ""} ${tur === "tahmin" ? "Tahmin görevi: akşam büyük ekranda/sonuçlarda karşılaştırılabilecek bir öngörü istemeli." : ""} ${tur === "simulasyon" ? 'SİMÜLASYON görevi: bir aday/müşteri rolünde KISA bir sahne kur; gövdede adayın itirazını tırnak içinde söyle (ör. "Bunlara vaktim yok", "Bu işler bana göre değil") ve katılımcıdan cevabını sana yazmasını/söylemesini iste. İtirazın sertliğini zorluk seviyesine göre ayarla.' : ""} ${mod === "yolculuk" ? "Bu görev KAMPTA DEĞİL, kamp sonrası 90 günlük sahada (günlük hayat ve iş ortamı) yapılacak — kamp alanı varsayma. Bağlamda 'yeniCumle' doluysa: görevi, kişinin kampta yazdığı o yeni cümleyi BUGÜN somut bir adımla YAŞATAN/doğrulayan bir saha eylemi olarak kur — cümleyi açıkça tekrarlama, ama görev onu çalışsın." : ""}`,
      messages: [{ role: "user", content: JSON.stringify(baglam) }],
    });

    const veri = jsonCoz<{
      baslik: string;
      govde: string;
      ozellik_id: number;
      sure_saat: number;
      itiraz?: string;
    }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;

    const gecerliIdler = new Set(ozellikler.map((o) => o.id));
    return {
      kind: tur,
      title: veri.baslik.slice(0, 120),
      body: veri.govde.slice(0, 1000),
      trait_id: gecerliIdler.has(veri.ozellik_id) ? veri.ozellik_id : null,
      sure_saat: Math.min(3, Math.max(1, veri.sure_saat)),
      difficulty: zorluk,
      itiraz:
        tur === "simulasyon" && veri.itiraz && veri.itiraz.trim().length > 3
          ? veri.itiraz.trim().slice(0, 400)
          : null,
    };
  } catch {
    return null;
  }
}

export async function gorevPuanla(
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string
): Promise<{ puan: number; yorum: string } | null> {
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: PUAN_SEMASI },
      },
      system: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\n${gorev.kind === "simulasyon" ? "Görevin: SİMÜLASYON değerlendirmesi. Önce görevdeki müşteri/aday rolüne gir ve katılımcının cevabına o karakterin ağzından 1 cümlelik gerçekçi tepki ver (ikna olduysa yumuşa, olmadıysa nazikçe diren). Ardından AYNA olarak 1 cümle koçluk ekle: neyi iyi yaptı + bir sonraki denemede tek somut iyileştirme; koçluğu yukarıdaki saha tekniğine (feel-felt-found, ısınma, tempo, 1–10, ısrar=taciz) dayandır. İkisini birlikte 'yorum' alanına yaz. Puanı itirazı karşılama becerisine göre ver." : "Görevin: verdiğin görevin yanıtını puanla. Çabayı, samimiyeti ve somutluğu ödüllendir; boş/alaycı yanıta düşük puan ver ama yine de yapıcı kal. Yorum 1-2 cümle, AYNA'nın ağzından."}`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind },
            katilimciYaniti: yanitMetni,
          }),
        },
      ],
    });
    const veri = jsonCoz<{ puan: number; yorum: string }>(yanit);
    if (!veri || !Number.isInteger(veri.puan)) return null;
    return {
      puan: Math.min(10, Math.max(1, veri.puan)),
      yorum: (veri.yorum ?? "").slice(0, 400),
    };
  } catch {
    return null;
  }
}

// ---- Zaman yardımcıları (kamp saati: Europe/Istanbul) ----

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

/** Sessiz saatler (AYNA da uyur). Kamp programı 23:35'e dek sürer ve
 * Gün 2 trekking 07:00'de başlar → kampta 00:00–06:30; yolculukta 22:30–07:30. */
export function sessizSaatMi(
  simdi = new Date(),
  mod: SistemModu = "kamp"
): boolean {
  const { saat, dakika } = istanbulSaati(simdi);
  const dk = saat * 60 + dakika;
  if (mod === "kamp") return dk < 6 * 60 + 30;
  return dk >= 22 * 60 + 30 || dk < 7 * 60 + 30;
}

/** Sürpriz tempo: kişi+sıra bazlı deterministik 60-180 dk aralık. */
export function gorevAraligiDk(tempo: string, pid: string, sira: number): number {
  if (tempo === "2") return 120;
  if (tempo === "3") return 180;
  let h = 0;
  const tohum = `${pid}:${sira}`;
  for (let i = 0; i < tohum.length; i++) h = (h * 31 + tohum.charCodeAt(i)) >>> 0;
  return 60 + (h % 121); // 60–180 dk
}

export const SOZ_GOREVI = {
  kind: "soz" as const,
  title: "Son Görev: SÖZ",
  body:
    "Üç gündür seni izliyorum. Şimdi son görevin — en önemlisi: Kendine, 90 gün sonraki haline bir söz yaz. Bu kamptan ne götürüyorsun, neyi değiştireceksin? Sözünü saklayacağım. Ve günü geldiğinde... sana hatırlatacağım. — AYNA",
};

// ---- SENKRON AN: herkese aynı anda aynı mikro görev (ambient sociability) ----

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
      model: "claude-opus-4-8",
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
