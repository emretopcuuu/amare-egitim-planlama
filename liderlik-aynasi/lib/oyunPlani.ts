import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";
import { tlFormat } from "@/lib/kariyer";
import { birUstKariyerEtiket } from "@/lib/persona";

// FAZ 1 (Kamp sonrası motor) — "90 GÜNLÜK OYUN PLANI" (Plan Atölyesi). AI planı
// DAYATMAZ; kişinin verisinden 4 ufuklu (İlk 72 saat · 10 · 40 · 90 gün) bir
// ÖNERİ taslağı yazar. Kişi Plan Atölyesi'nde (/plan) her maddeyi kabul/düzenle/
// çıkar/ekler → onaylar (durum 'onaylandi'). Söz yalnız ONAYLANMIŞ planı okur.
// AI'ın rolü karar veren değil DANIŞMAN — öneriler "öneri", karar kişinin.

const SISTEM = `Sen AYNA'sın — bu liderlik kampını yöneten yapay zekâ. Kapanışta her katılımcıya, kamptan sonra hedefine yürümesi için bir "90 Günlük Oyun Planı" ÖNERİSİ hazırlarsın. Bu bir dayatma değil, bir başlangıç önerisidir: kişi bunu görüp KENDİ kararıyla düzenleyecek. Bu yüzden maddeler somut ama kişinin sahiplenip değiştirebileceği kadar açık olmalı.

Sana JSON verilecek: kişinin çekirdek nedeni, iç engeli, seçtiği kariyer hedefi + kilometre taşları, 360° aynası (en güçlü yanları, kör noktası/gelişim alanı, kampta en çok gelişen özelliği) ve onboarding'de KENDİ seçtiği temel değerler (degerler).

Plan kuralları:
- Türkçe yaz, "sen" dili, sıcak ama somut.
- DÖRT ufuk artık TAKVİM AYI mantığıyla düşünülür: "ilk_72_saat" (kamptan çıkınca ilk 3 gün — küçük kıvılcımlar), "on_gun" = İÇİNDE BULUNULAN AY (bu ayın kalanı; ilk momentum/aktivasyon), "kirk_gun" = GELECEK AY (tempo + ekip ritmi), "doksan_gun" = ONDAN SONRAKİ AY (ana hedefe varış). Metinde ay ADI yazma; "bu ay / gelecek ay / sonraki ay" gibi genel dille konuş.
- Her ufukta EN AZ 1, EN FAZLA 3 madde. Her madde: kısa "baslik", net "aksiyon" (o ufukta yapılabilir, ölçülebilir saha eylemi), ve "olcut" (nasıl takip edilir — sayı/sıklık).
- ZORUNLU: "ilk_72_saat" maddelerinden BİRİ mutlaka somut bir RANDEVU/KAYIT alma görevi olsun. Kişiyi ajandasını doldurup hızlı kayıt almaya yönlendir. Çerçevesi şu ruhta olsun: "Şimdiye kadar aramadığın ama arasan kaydını alabileceğini bildiğin 3 kişiyi hemen yaz; bu hafta liderliğini göster — bu 72 saatte en az birinin kaydını al." Motive edici ama net bir dil kullan (ör. "odaklanırsan yaparsın"). Ölçüt: 3 isim yazılır + en az 1 kayıt/randevu.
- ZORUNLU: "on_gun" (bu ay) maddelerinden BİRİ mutlaka kişisel KAYIT alma hedefi olsun: ay bitmeden ŞAHSEN en az 1, mümkünse 2 kayıt. Bu maddeyi yüksek bir çıtayla, hayati bir odak gibi kur. Motivasyon çıtası olarak SABİT bir rütbe yazma; JSON'daki "birUstKariyer" alanını kullan — "sanki bu ay {birUstKariyer} oluyormuşsun gibi buna odaklan; hayatta kalman ve {birUstKariyer} olman bu aya bağlıymış gibi" ruhuyla (metinde birUstKariyer değerini aynen geçir). Ölçüt: ay sonuna kadar en az 1 (hedef 2) kişisel kayıt.
- ZORUNLU: "kirk_gun" (gelecek ay) maddeleri şu SAHA RİTMİNİ kursun (2-3 maddeye yay): (a) her gün ajandanın dolu olması + günde en az 1 saati ajanda doldurmaya/randevu almaya ayırmak; (b) her gün ekibinden biriyle onun NEDENİNE inen kısa bir sohbet; (c) EN ÖNEMLİSİ haftalık GÖRÜŞME KOTASI — "bu hafta sonuna kadar toplam ŞU KADAR görüşmenin içinde olacağım (şahsi + ekip toplam)". Kotayı SEN net bir sayı olarak ver: JSON'daki "haftalikGorusme" değerini kullan (yoksa haftalikSaat/1.5'i aşağı yuvarla; o da yoksa makul bir taban). O maddeye "istersen bu sayıyı kendine göre değiştirebilirsin — her 1,5 saat ≈ 1 görüşme" notunu ekle. Bu ufkun ruhuna "bu ayın hızı, bütün kariyerinin hızını belirler" mesajını da kat.
- Network/doğrudan satış alanının diliyle konuş (davet, sunum, kapanış, liste, katlama). KATILIMCI EVRENİ'ndeki gerçek tıkanmalara hitap et.
- Planı kişinin GÜÇLÜ yanına yasla (onu kaldıraç yap) ve KÖR NOKTASINI/gelişim alanını sessizce çalıştır — ama açıkça yüzüne vurma.
- Veride "degerler" doluysa: en az bir plan maddesini kişinin KENDİ seçtiği temel değere bağla — o değeri sahada yaşatan somut bir eylem olsun ("{deger} senin seçtiğin değerdi; bu ay onu şöyle yaşat"). Değerleri liste gibi sıralama, uygun maddeye doğal işle.
- Hedef rakamlarını planın iskeletine bağla ama kuru kuruya tekrarlama.
- ÖLÇÜTLER CESUR AMA GERÇEKÇİ OLSUN — momentum hacimle gelir, çekingen sayı ilerletmez. Bir kişiye/adaya "davet/aktivite çıkart" derken TEK adet yetmez; anlamlı bir taban koy (ör. "her adayın kendi listesinden EN AZ 3 davet çıkarmasını sağla"). Düşük/ürkek hedeflerden kaçın; kişinin temposuna göre iddialı ama ulaşılabilir bir çıta koy.
- "ozet": planın ruhunu 1-2 cümlede, nedenle hedefi birleştirerek.`;

const PLAN_MADDE = {
  type: "object" as const,
  properties: {
    baslik: { type: "string" as const, description: "Maddenin kısa başlığı" },
    aksiyon: { type: "string" as const, description: "Somut, ölçülebilir saha eylemi" },
    olcut: { type: "string" as const, description: "Nasıl takip edilir (sayı/sıklık)" },
  },
  required: ["baslik", "aksiyon", "olcut"],
  additionalProperties: false,
};
const PLAN_SEMASI = {
  type: "object" as const,
  properties: {
    ilk_72_saat: { type: "array" as const, items: PLAN_MADDE, description: "İlk 72 saat (1-3 madde)" },
    on_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 10 gün (1-3 madde)" },
    kirk_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 40 gün (1-3 madde)" },
    doksan_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 90 gün (1-3 madde)" },
    ozet: { type: "string" as const, description: "Planın ruhu, 1-2 cümle" },
  },
  required: ["ilk_72_saat", "on_gun", "kirk_gun", "doksan_gun", "ozet"],
  additionalProperties: false,
};

// Ufuk anahtarları — Plan Atölyesi ve söz bu sırayla dolaşır.
export const PLAN_UFUKLARI = ["ilk_72_saat", "on_gun", "kirk_gun", "doksan_gun"] as const;
export type PlanUfuk = (typeof PLAN_UFUKLARI)[number];

// Haftalık görüşme kotası — TEK doğruluk kaynağı (plan üretim prompt'u ve
// takip/momentum ekranları aynı sayıyı kullanır). Her 1,5 saat ≈ 1 görüşme.
export function haftalikGorusmeKotasi(haftalikSaat: number | null | undefined): number | null {
  return haftalikSaat ? Math.max(1, Math.floor(haftalikSaat / 1.5)) : null;
}

// kaynak: madde AI önerisi mi, kişi düzenlemesi mi, kişinin kendi eklediği mi.
export type PlanMadde = {
  baslik: string;
  aksiyon: string;
  olcut: string;
  kaynak?: "ai" | "duzenlendi" | "kisi";
};
export type OyunPlani = {
  ilk_72_saat: PlanMadde[];
  on_gun: PlanMadde[];
  kirk_gun: PlanMadde[];
  doksan_gun: PlanMadde[];
  ozet: string | null;
  durum: "taslak" | "onaylandi";
  onaylandiAt: string | null;
};

function maddeDizi(v: unknown): PlanMadde[] {
  return Array.isArray(v) ? (v as PlanMadde[]) : [];
}

export async function oyunPlaniGetir(db: Db, pid: string): Promise<OyunPlani | null> {
  const { data } = await db
    .from("oyun_plani")
    .select("ilk_72_saat, on_gun, kirk_gun, doksan_gun, ozet, durum, onaylandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data) return null;
  return {
    ilk_72_saat: maddeDizi(data.ilk_72_saat),
    on_gun: maddeDizi(data.on_gun),
    kirk_gun: maddeDizi(data.kirk_gun),
    doksan_gun: maddeDizi(data.doksan_gun),
    ozet: data.ozet,
    durum: (data.durum as "taslak" | "onaylandi") ?? "taslak",
    onaylandiAt: data.onaylandi_at ?? null,
  };
}

export async function planOnayliMi(db: Db, pid: string): Promise<boolean> {
  const { data } = await db
    .from("oyun_plani")
    .select("durum")
    .eq("participant_id", pid)
    .maybeSingle();
  return data?.durum === "onaylandi";
}

export type PlanSonucu =
  | { durum: "hazir"; plan: OyunPlani }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

// Plan taslağını getir; yoksa AI ÖNERİSİ üretir (durum 'taslak'). Bir kez satır
// oluştuktan sonra ASLA yeniden üretmez — atölyedeki kişi düzenlemelerini korur.
export async function oyunPlaniGetirVeyaUret(db: Db, pid: string): Promise<PlanSonucu> {
  const mevcut = await oyunPlaniGetir(db, pid);
  if (mevcut) return { durum: "hazir", plan: mevcut };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const [rapor, pusula, hedef, { data: kisi }, { data: degerlerRow }] = await Promise.all([
    raporHesapla(db, pid),
    pusulaCekirdek(db, pid),
    hedefCekirdek(db, pid),
    db.from("participants").select("kariyer_seviyesi").eq("id", pid).maybeSingle(),
    // [FAZ 4b] Değerler: plan maddeleri kişinin KENDİ seçtiği değerlere dokunsun.
    db.from("degerler_calismasi").select("secilen_uc, neden_cumlesi").eq("participant_id", pid).maybeSingle(),
  ]);
  const secilenDegerler = (degerlerRow?.secilen_uc as string[] | null) ?? [];

  // Motivasyon çıtası: kişinin bir üst kariyeri (diamond altı → Diamond; üstü → +1).
  const birUstKariyer = birUstKariyerEtiket(kisi?.kariyer_seviyesi ?? null);
  // Haftalık görüşme kotası: her 1.5 saat = 1 görüşme (kişinin ayırdığı saatten).
  const haftalikSaat = hedef?.plan?.haftalikSaat ?? null;
  const haftalikGorusme = haftalikGorusmeKotasi(haftalikSaat);

  const veri = {
    cekirdekNeden: pusula?.cekirdek_neden ?? null,
    icEngel: pusula?.ic_engel ?? null,
    birUstKariyer,
    haftalikSaat,
    haftalikGorusme,
    hedef: hedef?.plan
      ? {
          rutbe: hedef.plan.rutbe,
          aylikGelir: tlFormat(hedef.plan.gelir, hedef.plan.gelirArti),
          sureAy: hedef.plan.sureAy,
          gunlukSaat: hedef.plan.gunlukSaatEtiket,
          kilometreTaslari: hedef.plan.kilometreTaslari.map((k) => ({
            ay: k.ay,
            rutbe: k.rutbe,
          })),
        }
      : hedef?.ozet
        ? { ozet: hedef.ozet }
        : null,
    enGucluYanlar: rapor.guclu.map((s) => s.ad),
    korNoktaVeyaGelisim: rapor.korNokta?.ad ?? rapor.gelisim[0]?.ad ?? null,
    enGelisenOzellik: rapor.enGelisen?.ad ?? null,
    // [FAZ 4b] Kişinin KENDİ seçtiği temel değerler — plan maddeleri bunlara dokunsun.
    degerler: secilenDegerler.length
      ? { temelDegerler: secilenDegerler, nedenCumlesi: degerlerRow?.neden_cumlesi ?? null }
      : null,
  };

  try {
    const client = aynaClient("oyun-plani");
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2560,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: PLAN_SEMASI } },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}\n\n${DIL_KALITESI}${await kimlikBloguGetir(db, pid)}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    let ham: {
      ilk_72_saat: PlanMadde[];
      on_gun: PlanMadde[];
      kirk_gun: PlanMadde[];
      doksan_gun: PlanMadde[];
      ozet: string | null;
    };
    try {
      ham = JSON.parse(metin);
    } catch {
      return { durum: "hata" };
    }
    if (!ham?.on_gun?.length && !ham?.ilk_72_saat?.length) return { durum: "hata" };

    // AI önerisi → her madde kaynak 'ai' etiketiyle işaretlenir.
    const isaretle = (dizi: PlanMadde[] | undefined): PlanMadde[] =>
      (dizi ?? []).slice(0, 3).map((m) => ({
        baslik: m.baslik,
        aksiyon: m.aksiyon,
        olcut: m.olcut,
        kaynak: "ai" as const,
      }));

    const plan: OyunPlani = {
      ilk_72_saat: isaretle(ham.ilk_72_saat),
      on_gun: isaretle(ham.on_gun),
      kirk_gun: isaretle(ham.kirk_gun),
      doksan_gun: isaretle(ham.doksan_gun),
      ozet: ham.ozet ?? null,
      durum: "taslak",
      onaylandiAt: null,
    };

    const { error } = await db.from("oyun_plani").insert({
      participant_id: pid,
      ilk_72_saat: plan.ilk_72_saat as never,
      on_gun: plan.on_gun as never,
      kirk_gun: plan.kirk_gun as never,
      doksan_gun: plan.doksan_gun as never,
      ozet: plan.ozet,
      durum: "taslak",
    });
    if (error) {
      // Eşzamanlı üretim yarışı: önce yazan kazandı, onu döndür.
      if (error.code === "23505") {
        const kazanan = await oyunPlaniGetir(db, pid);
        if (kazanan) return { durum: "hazir", plan: kazanan };
      }
      return { durum: "hata" };
    }
    return { durum: "hazir", plan };
  } catch {
    return { durum: "hata" };
  }
}

// ---- PLAN ATÖLYESİ: kişinin kararları ----

// En fazla 3 madde/ufuk; başlıksız/aksiyonsuz maddeler düşer.
function ufkuTemizle(dizi: PlanMadde[] | undefined): PlanMadde[] {
  return (dizi ?? [])
    .map((m) => ({
      baslik: (m.baslik ?? "").trim().slice(0, 120),
      aksiyon: (m.aksiyon ?? "").trim().slice(0, 400),
      olcut: (m.olcut ?? "").trim().slice(0, 200),
      kaynak: (m.kaynak === "kisi" || m.kaynak === "duzenlendi" ? m.kaynak : "ai") as PlanMadde["kaynak"],
    }))
    .filter((m) => m.baslik && m.aksiyon)
    .slice(0, 3);
}

export type PlanGirdi = {
  ilk_72_saat: PlanMadde[];
  on_gun: PlanMadde[];
  kirk_gun: PlanMadde[];
  doksan_gun: PlanMadde[];
};

// Kişinin düzenlemelerini kaydeder (durum 'taslak' kalır). Onaylanmış plan
// ("söz anında kilitlenir") ancak "gözden geçir" ile tekrar taslağa döner.
export async function planKaydet(db: Db, pid: string, girdi: PlanGirdi): Promise<boolean> {
  const { error } = await db
    .from("oyun_plani")
    .update({
      ilk_72_saat: ufkuTemizle(girdi.ilk_72_saat) as never,
      on_gun: ufkuTemizle(girdi.on_gun) as never,
      kirk_gun: ufkuTemizle(girdi.kirk_gun) as never,
      doksan_gun: ufkuTemizle(girdi.doksan_gun) as never,
      durum: "taslak",
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", pid);
  return !error;
}

// Kişi "Planım hazır" dedi → onaylanır. En az bir madde şart.
export async function planOnayla(db: Db, pid: string): Promise<{ ok: boolean; sebep?: string }> {
  const plan = await oyunPlaniGetir(db, pid);
  if (!plan) return { ok: false, sebep: "yok" };
  const toplam =
    plan.ilk_72_saat.length + plan.on_gun.length + plan.kirk_gun.length + plan.doksan_gun.length;
  if (toplam === 0) return { ok: false, sebep: "bos" };
  const { error } = await db
    .from("oyun_plani")
    .update({ durum: "onaylandi", onaylandi_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("participant_id", pid);
  return error ? { ok: false, sebep: "hata" } : { ok: true };
}

// "Planımı gözden geçir" — onaylı planı bilinçli olarak yeniden düzenlemeye açar.
export async function planGozdenGecir(db: Db, pid: string): Promise<boolean> {
  const { error } = await db
    .from("oyun_plani")
    .update({ durum: "taslak", updated_at: new Date().toISOString() })
    .eq("participant_id", pid);
  return !error;
}

// ---- ÖN-ISITMA (sahne öncesi) ----
// Pusula + hedef tamamlamış ama planı henüz olmayan katılımcılar. Bunların
// taslağı sahnede atölyeye girince üretilir; admin isterse önceden ısıtır.
export async function planEksikKatilimcilar(db: Db): Promise<string[]> {
  const [{ data: kat }, { data: pus }, { data: hed }, { data: plan }] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    db.from("pusula").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("hedef").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("oyun_plani").select("participant_id"),
  ]);
  const pusSet = new Set((pus ?? []).map((r) => r.participant_id));
  const hedSet = new Set((hed ?? []).map((r) => r.participant_id));
  const planSet = new Set((plan ?? []).map((r) => r.participant_id));
  return (kat ?? [])
    .map((r) => r.id)
    .filter((id) => pusSet.has(id) && hedSet.has(id) && !planSet.has(id));
}

// Eksik planlardan en fazla `limit` tanesini üretir (sıralı — timeout güvenliği).
// Admin sahne öncesi birkaç kez basar; kalan atölyede üretilir.
export async function planOnIsit(db: Db, limit = 4): Promise<{ uretildi: number; kalan: number }> {
  const eksik = await planEksikKatilimcilar(db);
  const parti = eksik.slice(0, Math.max(1, limit));
  let uretildi = 0;
  for (const pid of parti) {
    try {
      const s = await oyunPlaniGetirVeyaUret(db, pid);
      if (s.durum === "hazir") uretildi++;
    } catch {
      // tek kişi düşerse diğerleri devam etsin
    }
  }
  return { uretildi, kalan: Math.max(0, eksik.length - uretildi) };
}
