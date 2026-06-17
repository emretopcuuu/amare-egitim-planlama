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

// GELİŞTİRME #4 — GÖREV YAYI. Görevler kopuk değil; her aday için tek bir
// çekirdek kör nokta etrafında derinleşen bir yay: ısınma → yüzleşme → kanıt →
// entegrasyon. Aşama, tamamlanan görev sayısından türer; AYNA her turda bir
// önceki aşamanın üstüne çıkar (geri gitmez).
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
  sure_saat: number;
  difficulty: Zorluk;
  /** simulasyon: itirazcının söylediği cümle(ler) — sese çevrilir */
  itiraz: string | null;
};


// Ön Farkındalık profilini görev üretimi için sıkıştırır: yalnız hedefe yön
// veren sinyaller (en zayıf alan, en büyük 2 açık, kör nokta, ritim, açıklık).
// Profil yoksa null — görev eski davranışa (Pusula + puanlar) düşer.
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

export async function gorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; team: string | null },
  gun: number,
  saat: number,
  mod: SistemModu = "kamp",
  etkinlik: ProgramMaddesi | null = null,
  bitenEtkinlik: ProgramMaddesi | null = null
): Promise<UretilenGorev | null> {
  const [ozellikler, oncekilerSonuc, puanlarSonuc, pusula, onFarkindalik, kapaliAyar, icerikAyar, tamamCountSonuc] =
    await Promise.all([
      aktifOzellikler(db),
      db
        .from("missions")
        .select("kind, title, issued_at, status, ai_score, lightened_at")
        .eq("participant_id", katilimci.id)
        .order("issued_at", { ascending: false })
        .limit(6),
      db
        .from("ratings")
        .select("trait_id, score, is_self")
        .eq("target_id", katilimci.id),
      // FAZ 0 Pusula: kişinin nedeni/iç engeli — görevi buna göre kişiselleştir.
      pusulaOzeti(db, katilimci.id),
      // ÖN FARKINDALIK: kamp öncesi ayna profili — en zayıf alan, en büyük açık,
      // kör nokta (koruyucu inanç), ritim. Görevi bunlara göre hedefle.
      onFarkindalikOzeti(db, katilimci.id),
      // Admin'in kapattığı görev türleri (Görev Türü Stüdyosu).
      db.from("settings").select("value").eq("key", "kapali_gorev_turleri").maybeSingle(),
      // #10 İçerik Stüdyosu: admin'in canlı ayarladığı AYNA ek-tonu + günün teması.
      db.from("settings").select("key, value").in("key", ["ayna_ek_ton", "gunun_temasi"]),
      // GELİŞTİRME #4 Görev Yayı: toplam tamamlanan görev sayısı (yay aşaması bundan türer).
      db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", katilimci.id)
        .eq("status", "scored"),
    ]);
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
  const tur = turSec(gun, saat, bugunTurleri, mod, undefined, etkinlik?.tur, kapaliTurler);

  // EUSTRESS: son görev formundan akış-kanalı zorluğu
  const kapananlar = onceki.filter(
    (o) => o.status === "scored" || o.status === "expired"
  );
  const puanlilar = kapananlar.filter((o) => o.ai_score !== null);
  // GELİŞTİRME #3: takılma/kayma sinyali — son 3 görevin 2+'si süresi dolarak
  // kapandıysa aday sessizleşiyor; tırmanan zorluk yerine yeniden-bağlayan görev ver.
  const kayan = onceki.slice(0, 3).filter((o) => o.status === "expired").length >= 2;
  // GELİŞTİRME #8 Kaçınma zekâsı: aday son ~8 saatte bir görevi "ağır geldi"
  // diye hafiflettiyse, bir süre nazik kal (zorluğu düşür, şefkati artır).
  const naziklesir = onceki.some(
    (o) => o.lightened_at && Date.now() - new Date(o.lightened_at).getTime() < 8 * 3_600_000
  );
  let zorluk = zorlukSec({
    puanOrt: puanlilar.length
      ? puanlilar.reduce((t, o) => t + (o.ai_score ?? 0), 0) / puanlilar.length
      : null,
    teslimOrani: kapananlar.length
      ? kapananlar.filter((o) => o.status === "scored").length /
        kapananlar.length
      : 1,
    sonSuresiDoldu: kapananlar[0]?.status === "expired",
    kayan,
  });
  // Yakın zamanda "ağır geldi" dediyse zorluğu en alt kademeye çek.
  if (naziklesir) zorluk = 1;
  const faz = mod === "yolculuk" ? fazBul(gun) : null;

  // GELİŞTİRME #4 Görev Yayı: çekirdek kör nokta + ilerleyen aşama (yalnız ÖF
  // profili varsa anlamlı; yoksa AYNA serbest üretir).
  const ofYay = onFarkindalik as {
    enZayifAlan?: string | null;
    enBuyukAciklar?: { baslik: string }[];
  } | null;
  const cekirdekTema =
    ofYay?.enZayifAlan ?? ofYay?.enBuyukAciklar?.[0]?.baslik ?? null;
  const yay = cekirdekTema
    ? { cekirdekTema, ...arkAsamasi(tamamCountSonuc?.count ?? 0) }
    : null;

  const baglam = {
    ad: katilimci.full_name.split(" ")[0],
    takim: katilimci.team,
    // FAZ 0 Pusula: kişinin kamp öncesi damıtılmış nedeni + iç engeli (varsa).
    pusula: pusula ?? null,
    // Ön Farkındalık: ayna profilinin görev için sıkıştırılmış özeti (varsa).
    onFarkindalik: onFarkindalik ?? null,
    // GELİŞTİRME #4: görev yayı — çekirdek tema + şu anki aşama (varsa).
    gorevYayi: yay,
    // FAZ 2: kişinin kampta yazdığı yeni cümle (yolculukta savunulacak çapa).
    yeniCumle: yeniCumle ?? null,
    kampGunu: gun,
    saat,
    istenenGorevTuru: tur,
    zorlukSeviyesi: zorluk,
    zorlukYonergesi: ZORLUK_YONERGESI[zorluk],
    // GELİŞTİRME #3: aday takıldıysa görev yeniden-bağlama ruhuyla kurulur.
    yenidenBagla: kayan,
    // GELİŞTİRME #8: aday yakında "ağır geldi" dediyse nazik/güvenli kal.
    naziklesir,
    // #10 İçerik Stüdyosu: admin'in belirlediği günün teması (doluysa görevi ona dik).
    gununTemasi: gununTemasi || null,
    mod,
    suankiKampEtkinligi: etkinlik
      ? {
          baslik: etkinlik.baslik,
          bitisSaati: etkinlik.bitis,
          not: "Görevi mümkünse bu etkinliğin içine dik — kampın o anki gerçek akışına otursun, etkinlikle yarışmasın.",
        }
      : null,
    // GELİŞTİRME #7: az önce biten deneyimsel an (duygu sıcakken bağla).
    azOnceBitenEtkinlik: bitenEtkinlik ? { baslik: bitenEtkinlik.baslik } : null,
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
      system: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\n${BASARI_STRATEJISI}\n\nGörevin: verilen bağlama göre TEK bir görev üret. Tür "${tur}" olmalı. Bağlamda "pusula" doluysa (kişinin nedeni + iç engeli), görevi ona göre kişiselleştir: nedenine sessizce dokun ve iç engelini nazikçe zorlayan bir görev seç — ama iç engeli açıkça yüzüne vurma. Bağlamda "onFarkindalik" doluysa (kamp öncesi ayna profili), görevi şuna göre hedefle: "enZayifAlan" kırılgansa o kası çalıştıran, "enBuyukAciklar"daki başlıkta söylediğiyle yaptığı arasını kapatan, "korNokta"daki koruyucu inancı/kalkanı nazikçe sınayan bir görev seç. Ritim "patlayan" ise sürekliliği, geri bildirim açıklığı düşükse geri bildirim almayı/işlemeyi çalıştır. Kör noktayı/açığı ASLA açıkça yüzüne vurma — görev onu sessizce çalışsın. Zorluk yönergesine MUTLAKA uy. ${tur === "gizli" ? 'Gizli görevse "Bunu kimseye söyleme" ruhuyla yaz.' : ""} ${tur === "tahmin" ? "Tahmin görevi: akşam büyük ekranda/sonuçlarda karşılaştırılabilecek bir öngörü istemeli." : ""} ${tur === "simulasyon" ? 'SİMÜLASYON görevi: bir aday/müşteri rolünde KISA bir sahne kur; gövdede adayın itirazını tırnak içinde söyle (ör. "Bunlara vaktim yok", "Bu işler bana göre değil") ve katılımcıdan cevabını sana yazmasını/söylemesini iste. İtirazın sertliğini zorluk seviyesine göre ayarla.' : ""} ${mod === "yolculuk" ? "Bu görev KAMPTA DEĞİL, kamp sonrası 90 günlük sahada (günlük hayat ve iş ortamı) yapılacak — kamp alanı varsayma. Bağlamda 'yeniCumle' doluysa: görevi, kişinin kampta yazdığı o yeni cümleyi BUGÜN somut bir adımla YAŞATAN/doğrulayan bir saha eylemi olarak kur — cümleyi açıkça tekrarlama, ama görev onu çalışsın." : ""} ${baglam.yenidenBagla ? "YENİDEN BAĞLAMA: Bu aday son görevlerde sessizleşti/takıldı. Onu YARGILAMADAN, sıcak bir dille yeniden çağır — küçük, eğlenceli, kesinlikle başarılabilir bir başlangıç ver; 'tekrar buradayım, hoş geldin' hissi uyandır. Suçluluk ya da baskı yükleme." : ""} ${naziklesir ? "ŞEFKAT MODU: Bu aday yakın zamanda bir görevi 'ağır geldi' diye hafifletti. Görevi KÜÇÜK, güvenli ve baskısız tut; ona kendi hızında olduğunu hissettir. Zorlama, yüzleştirme, risk yükleme — önce güveni geri kur." : ""} ${yay ? `GÖREV YAYI: Bu adayın görevleri kopuk kopuk değil — tek bir çekirdek tema ("${yay.cekirdekTema}") etrafında derinleşen bir yay. Şu anki aşama "${yay.ad}": ${yay.yonerge} Önceki aşamaların üstüne çık, geri gitme; ama çekirdek temadan da sapma. Temayı adıyla yüzüne vurma.` : ""} ${bitenEtkinlik ? `AN'A KİLİTLİ: Az önce "${bitenEtkinlik.baslik}" anı bitti — duygusu hâlâ sıcak. Görevi bu anın enerjisine bağla; o deneyimde yaşanan şeyi BUGÜN somut bir adıma çevir. Anı doğal biçimde an, zorlama.` : ""} ${gununTemasi ? `GÜNÜN TEMASI (admin belirledi — görevi mümkünse buna dik): ${gununTemasi}` : ""} ${aynaEkTon ? `ADMIN TON AYARI (üsluba uygula): ${aynaEkTon}` : ""}`,
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

// GELİŞTİRME #1 — YANSIMA KAPANIŞI. Görev puanlandıktan sonra adaydan tek
// cümlelik bir iç-yansıma alınır ("ne zorladı, ne değişti?"). AYNA bunu okuyup
// kişinin kör noktasıyla SESSİZ bir bağ kurar ve tek, sıcak cümleyle geri
// yansıtır — kör noktayı adıyla koymadan. Görevi "yapılan iş"ten "görülen
// içgörü"ye çeviren adım budur. Serbest metin, hızlı model.
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
      model: "claude-sonnet-4-6",
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

// GELİŞTİRME #3 — AYNA ANI. Adayın kamp ÖNCESİ kendi yazdığı kör nokta cümlesini
// (ters davranış / kalkan / varsayım), kampta yaptıklarıyla yüzleştirip tek bir
// "gördün mü?" anında geri yansıtır. Kişi yeterince görev tamamladıysa (≥3) ve
// elimizde alıntılayacak kendi cümlesi varsa üretilir; kişi başına bir kez.
// Döndürdüğü metin yoksa null (koşul tutmadı ya da üretim düştü).
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
  // Alıntılanacak kendi cümlesi yoksa Ayna Anı'nın gücü olmaz.
  const kendiCumlesi =
    of?.korNokta?.tersDavranis || of?.korNokta?.kalkan || of?.korNokta?.varsayim || null;
  if (!kendiCumlesi) return null;

  const kapananlar = kapananSonuc.data ?? [];
  if (kapananlar.length < 3) return null; // yeterince "yaşanmış" iş yok

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

// GELİŞTİRME #6 — SEÇİLEN ZORLUK ("daha ileri git"). Aday aktif bir görevi
// kendi isteğiyle zorlaştırabilir. Dayatılan değil SEÇİLEN meydan okuma çok daha
// fazla sahiplik ve farkındalık üretir. Aynı tema/tür korunur; ask cesurlaşır.
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
      system: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\nAday bu görevi KENDİ İSTEĞİYLE zorlaştırmak istedi — bu cesareti onurlandır. Aynı temayı ve türü ("${gorev.kind}") koru ama ASK'i belirgin biçimde cesurlaştır: daha yüksek risk, daha görünür, daha çok temas. Yeni zorluk yönergesi: ${ZORLUK_YONERGESI[yeniZorluk]} Görev hâlâ 1-3 saatte yapılabilir ve net olmalı. Gövdeye küçük bir "seçtiğin için" takdiri kat ama abartma.`,
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

// GELİŞTİRME #8 — DUYGUSAL GÜVENLİK ("bu bana ağır geldi"). Aday bir görevi
// fazla bulduğunda AYNA YARGILAMADAN, şefkatle daha küçük/güvenli bir varyant
// verir. Kişiyi koparmak yerine yanında tutar. #6'nın tersi: ask yumuşar.
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
      system: `${PERSONA}\n\n${BASARI_STRATEJISI}\n\nAday bu görevi şu an FAZLA bulduğunu söyledi. Onu ASLA yargılama, suçlu hissettirme; "anladım, beraber küçültelim" tonu. Aynı temayı ve türü ("${gorev.kind}") koru ama ASK'i belirgin biçimde KÜÇÜLT: daha düşük risk, daha az görünür, tek ve çok kolay bir ilk adım. Yeni zorluk yönergesi: ${ZORLUK_YONERGESI[yeniZorluk]} Gövdeye kısa, sıcak bir güvence kat (ör. "kendi hızında, baskı yok"). 1 saatte rahatça yapılabilsin.`,
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
