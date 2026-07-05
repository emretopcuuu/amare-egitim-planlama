import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
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
  rizaVar: boolean; // consent_at dolu mu (onboarding'e başladı mı)
  eksikAdim: OnboardingAdimKod | null; // null = onboarding tamam
  eksikAdimAd: string;
  sonIlerlemeAt: string | null; // son onboarding ilerlemesinin zamanı
  hatirlatildiAt: string | null; // tek seferlik push damgası
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
        "id, full_name, phone, login_code, consent_at, ayna_ses_secildi_at, team, onboarding_hatirlatma_at"
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
    };
  });
}

// Saat başı koruma damgası (settings) — cron dakikada bir vurur, bu kontrol
// saatte en fazla bir kez tam liste taraması yapar.
const KONTROL_ANAHTARI = "onboarding_hatirlatma_kontrol_at";
const KONTROL_ARALIK_MS = 60 * 60_000; // 1 saat
const SESSIZLIK_ESIGI_MS = 3 * 60 * 60_000; // son ilerlemeden > 3 saat

/**
 * [E6] Yarıda bırakana tek seferlik push: consent verilmiş AMA onboarding
 * bitmemiş + son ilerlemeden >3 saat geçmiş + daha önce hatırlatılmamış.
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
    if (!d.rizaVar || !d.eksikAdim || d.hatirlatildiAt) continue;
    if (!d.sonIlerlemeAt || simdi - Date.parse(d.sonIlerlemeAt) < SESSIZLIK_ESIGI_MS) continue;
    // Damgayı ÖNCE at (yarış/çift push guard'ı — taahhüt push deseni).
    const { data: sahiplenilen } = await db
      .from("participants")
      .update({ onboarding_hatirlatma_at: new Date().toISOString() })
      .eq("id", d.id)
      .is("onboarding_hatirlatma_at", null)
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
