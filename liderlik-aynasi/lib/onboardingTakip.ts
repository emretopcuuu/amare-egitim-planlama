import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { whatsAppYapilandirildiMi, whatsAppGonder, sablonSidleri } from "@/lib/whatsapp";
import { ilkAd } from "@/lib/whatsappSablonlari";
import { tr } from "@/lib/i18n/tr";
import {
  ONBOARDING_ADIM_AD,
  type OnboardingAdimKod,
} from "@/lib/onboardingSure";

// [E6] ONBOARDING TAKİBİ — kamp ÖNCESİ dönemde onboarding'i yarıda bırakanları
// bulur: (a) dakikalık cron'dan saat başı çalışan tek seferlik push hatırlatması,
// (b) admin panelindeki "Onboarding'de takılanlar" listesi (WhatsApp = kayıp
// radarı deseni: otomatik gönderim YOK, admin wa.me linkine dokunup gönderir).
// Adım sırası lib/akis.ts ile birebir aynıdır (tek doğruluk kaynağına sadık).

export type OnboardingKisi = {
  id: string;
  ad: string;
  telefon: string | null;
  loginKod: string;
  girisYapti: boolean; // first_login_at dolu mu (koduyla en az bir kez girdi mi)
  ilkGirisAt: string | null; // ilk giriş zamanı (sessizlik referansı)
  rizaVar: boolean; // consent_at dolu mu (onboarding'e başladı mı)
  eksikAdim: OnboardingAdimKod | null; // null = onboarding tamam
  eksikAdimAd: string;
  sonIlerlemeAt: string | null; // son onboarding ilerlemesinin zamanı
  hatirlatildiAt: string | null; // en son ne zaman dürtüldü (null = hiç)
  hatirlatmaSayi: number; // kaç kez dürtüldü (en fazla HATIRLATMA_LIMIT)
};

function enYeni(...tarihler: (string | null | undefined)[]): string | null {
  let son: string | null = null;
  for (const t of tarihler) {
    if (t && (!son || t > son)) son = t;
  }
  return son;
}

/** Tüm katılımcıların onboarding durumu (ilk eksik adım + son ilerleme zamanı). */
export async function onboardingDurumlari(db: Db): Promise<OnboardingKisi[]> {
  const [
    { data: kisiler },
    { data: sesler },
    { data: degerler },
    { data: pusulalar },
    { data: hedefler },
    { data: farkindaliklar },
  ] = await Promise.all([
    db
      .from("participants")
      .select(
        "id, full_name, phone, login_code, first_login_at, consent_at, ayna_ses_secildi_at, team, onboarding_hatirlatma_at, onboarding_hatirlatma_sayi"
      )
      .eq("role", "participant"),
    db.from("voice_profiles").select("participant_id, updated_at"),
    db.from("degerler_calismasi").select("participant_id, tamamlandi_at, updated_at"),
    db.from("pusula").select("participant_id, tamamlandi_at, updated_at"),
    db.from("hedef").select("participant_id, tamamlandi_at, updated_at"),
    db.from("on_farkindalik").select("participant_id, tamamlandi_at, updated_at"),
  ]);

  type Satir = { tamamlandi_at?: string | null; updated_at?: string | null };
  const haritala = (satirlar: ({ participant_id: string } & Satir)[] | null) =>
    new Map((satirlar ?? []).map((s) => [s.participant_id, s]));
  const sesMap = haritala(sesler);
  const degerMap = haritala(degerler);
  const pusulaMap = haritala(pusulalar);
  const hedefMap = haritala(hedefler);
  const ofMap = haritala(farkindaliklar);

  return (kisiler ?? []).map((k) => {
    const ses = sesMap.get(k.id);
    const deger = degerMap.get(k.id);
    const pusula = pusulaMap.get(k.id);
    const hedef = hedefMap.get(k.id);
    const of = ofMap.get(k.id);

    // İlk eksik adım — lib/akis.ts sırası: hazırlık → ses seçimi → ritüel →
    // oyun → değerler → pusula → hedef → ön farkındalık.
    let eksik: OnboardingAdimKod | null = null;
    if (!k.consent_at) eksik = "hazirlik";
    else if (!k.ayna_ses_secildi_at) eksik = "sesSecimi";
    else if (!ses) eksik = "rituel";
    else if (!k.team) eksik = "oyun";
    else if (!deger?.tamamlandi_at) eksik = "degerler";
    else if (!pusula?.tamamlandi_at) eksik = "pusula";
    else if (!hedef?.tamamlandi_at) eksik = "hedef";
    else if (!of?.tamamlandi_at) eksik = "onFarkindalik";

    return {
      id: k.id,
      ad: k.full_name,
      telefon: k.phone,
      loginKod: k.login_code,
      girisYapti: !!k.first_login_at,
      ilkGirisAt: (k.first_login_at as string | null) ?? null,
      rizaVar: !!k.consent_at,
      eksikAdim: eksik,
      eksikAdimAd: eksik ? ONBOARDING_ADIM_AD[eksik] : "",
      sonIlerlemeAt: enYeni(
        k.consent_at,
        k.ayna_ses_secildi_at,
        ses?.updated_at,
        deger?.updated_at,
        pusula?.updated_at,
        hedef?.updated_at,
        of?.updated_at
      ),
      hatirlatildiAt: k.onboarding_hatirlatma_at,
      hatirlatmaSayi: k.onboarding_hatirlatma_sayi ?? 0,
    };
  });
}

// Saat başı koruma damgası (settings) — cron dakikada bir vurur, bu kontrol
// saatte en fazla bir kez tam liste taraması yapar.
const KONTROL_ANAHTARI = "onboarding_hatirlatma_kontrol_at";
const KONTROL_ARALIK_MS = 60 * 60_000; // 1 saat
const SESSIZLIK_ESIGI_MS = 3 * 60 * 60_000; // son ilerlemeden > 3 saat
// [U7] Tekrarlanabilir hatırlatma: iki dürtme arası en az ~20 saat, toplam en
// fazla 3 kez. Böylece admin düşenleri elle kovalamaz; sistem otomatik ~+3s,
// ~+1gün, ~+2gün ritmiyle nazikçe geri çağırır, sonra susar (spam olmaz).
const HATIRLATMA_ARALIK_MS = 20 * 60 * 60_000; // iki dürtme arası min 20 saat
const HATIRLATMA_LIMIT = 3; // toplam en fazla 3 dürtme

/**
 * [E6/U7] Yarıda bırakana TEKRARLANABİLİR push: consent verilmiş AMA onboarding
 * bitmemiş + son ilerlemeden >3 saat geçmiş + (hiç dürtülmemiş VEYA son
 * dürtmeden >20 saat geçmiş) + toplam dürtme < 3.
 * KAMP AÇIKKEN (ayna_aktif=true) HİÇ ÇALIŞMAZ — kamp içinde onboarding
 * hatırlatması gürültüdür; yalnız kamp öncesi dönem içindir.
 * Dönüş: gönderilen push sayısı.
 */
export async function onboardingHatirlat(db: Db): Promise<number> {
  const { data: ayarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ayna_aktif", KONTROL_ANAHTARI]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  // AÇIK KAPI: kamp canlıyken bu kontrol tamamen devre dışı.
  if (ayar.get("ayna_aktif") === "true") return 0;

  const simdi = Date.now();
  const sonKontrol = ayar.get(KONTROL_ANAHTARI);
  if (sonKontrol && simdi - Date.parse(sonKontrol) < KONTROL_ARALIK_MS) return 0;
  await db
    .from("settings")
    .upsert(
      { key: KONTROL_ANAHTARI, value: new Date(simdi).toISOString(), updated_at: new Date(simdi).toISOString() },
      { onConflict: "key" }
    );

  const durumlar = await onboardingDurumlari(db);
  let gonderilen = 0;
  for (const d of durumlar) {
    if (!d.rizaVar || !d.eksikAdim || d.hatirlatmaSayi >= HATIRLATMA_LIMIT) continue;
    if (!d.sonIlerlemeAt || simdi - Date.parse(d.sonIlerlemeAt) < SESSIZLIK_ESIGI_MS) continue;
    // Daha önce dürtüldüyse iki dürtme arası min süre (20s) geçmeli.
    if (d.hatirlatildiAt && simdi - Date.parse(d.hatirlatildiAt) < HATIRLATMA_ARALIK_MS) continue;
    // Damgayı + sayacı ÖNCE artır (yarış/çift push guard'ı): yalnız OKUDUĞUMUZ
    // sayaç hâlâ aynıysa güncelle (compare-and-swap) — böylece iki tik aynı
    // kişiye çift push atmaz.
    const { data: sahiplenilen } = await db
      .from("participants")
      .update({
        onboarding_hatirlatma_at: new Date().toISOString(),
        onboarding_hatirlatma_sayi: d.hatirlatmaSayi + 1,
      })
      .eq("id", d.id)
      .eq("onboarding_hatirlatma_sayi", d.hatirlatmaSayi)
      .select("id")
      .maybeSingle();
    if (!sahiplenilen) continue; // başka bir tik aldı
    await katilimciyaBildir(
      db,
      d.id,
      tr.onboardingTakip.pushBaslik,
      tr.onboardingTakip.pushGovde,
      "/"
    ).catch(() => {});
    gonderilen++;
  }
  return gonderilen;
}

// ─── OTOMATİK ONBOARDING WHATSAPP (girmiş ama devam etmemişe) ───────────────
// Kullanıcı isteği: koduyla GİRMİŞ ama onboarding'i bitirmemiş kişilere, elle
// uğraşmadan WhatsApp dürtmesi. Push'un aksine WhatsApp push izni istemez —
// asıl ulaşılabilir kanal budur. GÜVENLİK: yalnız admin `onboarding_wa_oto`
// ayarını "true" yaptıysa çalışır (VARSAYILAN KAPALI — deploy ile kimseye
// mesaj gitmez). Kamp AÇIKKEN (ayna_aktif=true) susar (kamp öncesi dürtmesi).
// Onaylı `duyuru` şablonuyla (Meta) gider; kişi başı en fazla 3 kez, ~20 saat
// arayla, son ilerlemeden/giriş­ten >3 saat sessizse. Kanal geçmişi
// onboarding_hatirlatma'ya kanal='whatsapp_oto' olarak yazılır (sayaç + soğuma).
export const WA_OTO_LIMIT = 3; // kişi başı en fazla otomatik WhatsApp
export const WA_OTO_ARALIK_SAAT = 20; // iki gönderim arası min (saat)
export const WA_OTO_SESSIZLIK_SAAT = 3; // son aktiviteden/girişten min sessizlik (saat)
const WA_OTO_ARALIK_MS = WA_OTO_ARALIK_SAAT * 60 * 60_000;
const WA_OTO_SESSIZLIK_MS = WA_OTO_SESSIZLIK_SAAT * 60 * 60_000;
const WA_OTO_KONTROL_ANAHTARI = "onboarding_wa_kontrol_at"; // saat başı koruma
const WA_OTO_KONTROL_ARALIK_MS = 60 * 60_000;
const WA_OTO_AYAR_ANAHTARI = "onboarding_wa_oto"; // "true" = admin açtı
export const WA_OTO_TUR_TAVANI = 40; // bir taramada en fazla (Meta/ani patlama koruması)

// Gönderilecek serbest-metin gövdesi (duyuru şablonunun {{2}}'si). Motor +
// önizleme tek yerden okusun diye ayrı — ikisi ASLA ayrışmasın.
export function onboardingWaGovde(eksikAdimAd: string): string {
  return `Uygulamada seni bekleyen bir adım var: ${eksikAdimAd || "hazırlık"}. Birkaç dakika yeter, kaldığın yerden devam et. 🪞`;
}

export type WaOtoAday = {
  id: string;
  ad: string;
  ilkAd: string;
  telefon: string;
  eksikAdimAd: string;
  govde: string; // {{2}} — kişiye özel gövde
};

// Bir sonraki taramada GERÇEKTEN WhatsApp gidecek kişiler (salt okuma; gönderim
// yok). On/off + kamp + saat-başı kapıları HARİÇ tutulur ki önizleme "açarsan
// kime gider" sorusunu yanıtlasın. Filtre motorla birebir aynı: girmiş +
// bitmemiş + telefonu var + 3+ saat sessiz + kişi başı <3 ve son gönderimden
// ≥20 saat. Sessizden başlayarak sıralı, tur tavanına göre kesilebilir.
export async function onboardingWaAdaylari(db: Db): Promise<WaOtoAday[]> {
  const simdi = Date.now();
  const durumlar = await onboardingDurumlari(db);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gecmisHam } = await (db as any)
    .from("onboarding_hatirlatma")
    .select("participant_id, created_at")
    .eq("kanal", "whatsapp_oto");
  const gecmis = (gecmisHam ?? []) as { participant_id: string; created_at: string }[];
  const waSayac = new Map<string, number>();
  const waSon = new Map<string, string>();
  for (const g of gecmis) {
    waSayac.set(g.participant_id, (waSayac.get(g.participant_id) ?? 0) + 1);
    const v = waSon.get(g.participant_id);
    if (!v || g.created_at > v) waSon.set(g.participant_id, g.created_at);
  }

  const adaylar: WaOtoAday[] = [];
  for (const d of durumlar) {
    if (!d.girisYapti || !d.eksikAdim || !d.telefon) continue;
    if ((waSayac.get(d.id) ?? 0) >= WA_OTO_LIMIT) continue;
    const sonWa = waSon.get(d.id);
    if (sonWa && simdi - Date.parse(sonWa) < WA_OTO_ARALIK_MS) continue;
    const ref = enYeni(d.sonIlerlemeAt, d.ilkGirisAt);
    if (!ref || simdi - Date.parse(ref) < WA_OTO_SESSIZLIK_MS) continue;
    const eksikAdimAd = d.eksikAdimAd || "hazırlık";
    adaylar.push({ id: d.id, ad: d.ad, ilkAd: ilkAd(d.ad), telefon: d.telefon, eksikAdimAd, govde: onboardingWaGovde(eksikAdimAd) });
  }
  // En sessizden başla (sonIlerleme boşsa en önce) — motorla aynı öncelik.
  return adaylar;
}

export async function onboardingWhatsAppHatirlat(db: Db): Promise<number> {
  if (!whatsAppYapilandirildiMi()) return 0;
  const { data: ayarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ayna_aktif", WA_OTO_AYAR_ANAHTARI, WA_OTO_KONTROL_ANAHTARI]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  if (ayar.get(WA_OTO_AYAR_ANAHTARI) !== "true") return 0; // admin açmadıysa sus (varsayılan)
  if (ayar.get("ayna_aktif") === "true") return 0; // kamp açıkken sus

  const simdi = Date.now();
  const sonKontrol = ayar.get(WA_OTO_KONTROL_ANAHTARI);
  if (sonKontrol && simdi - Date.parse(sonKontrol) < WA_OTO_KONTROL_ARALIK_MS) return 0;
  await db
    .from("settings")
    .upsert(
      { key: WA_OTO_KONTROL_ANAHTARI, value: new Date(simdi).toISOString(), updated_at: new Date(simdi).toISOString() },
      { onConflict: "key" }
    );

  const sid = (await sablonSidleri(db))["duyuru"];
  if (!sid) return 0; // onaylı serbest-metin şablonu yoksa gönderme

  const adaylar = await onboardingWaAdaylari(db);
  let gonderilen = 0;
  for (const a of adaylar) {
    if (gonderilen >= WA_OTO_TUR_TAVANI) break; // ani patlama koruması
    const ok = await whatsAppGonder(a.telefon, sid, { "1": a.ilkAd, "2": a.govde }).catch(() => false);
    if (!ok) continue;
    // Yalnız başarılı gönderimi kayda al (sayaç + soğuma + radar görünürlüğü).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("onboarding_hatirlatma")
      .insert({ participant_id: a.id, hedef: "onboarding", kanal: "whatsapp_oto" });
    gonderilen++;
  }
  return gonderilen;
}
