import { supabaseAdmin } from "@/lib/supabase/server";
import { onboardingDurumlari } from "@/lib/onboardingTakip";
import { ONBOARDING_ADIM_AD, type OnboardingAdimKod } from "@/lib/onboardingSure";
import { tr } from "@/lib/i18n/tr";
import { BAGLANTI_TABANI } from "@/lib/whatsappSablonlari";
import OnboardingRadar, { type RadarKisi, type RadarAsama } from "./OnboardingRadar";

// [Radar v2] ONBOARDING RADARI — kim hazır, kim eksik + tek-tık hatırlatma.
// Zengin kişi-bazlı funnel (onboardingDurumlari) + kanal-farkında dürtme + wa.me
// + otomatik hatırlatma durumu. KVKK: yalnız sonuç (hangi adımda takıldı), içerik değil.

// Funnel'da gösterilecek aşamalar (akis.ts sırasına sadık, anlamlı olanlar).
const HUNI: { kod: OnboardingAdimKod; ad: string }[] = [
  { kod: "rituel", ad: "Ritüel (ses)" },
  { kod: "oyun", ad: "Oyun / grup" },
  { kod: "degerler", ad: "Değerler" },
  { kod: "pusula", ad: "Pusula" },
  { kod: "hedef", ad: "Hedef" },
  { kod: "onFarkindalik", ad: "Ön Farkındalık" },
];
const SIRA: OnboardingAdimKod[] = [
  "hazirlik", "sesSecimi", "rituel", "oyun", "degerler", "pusula", "hedef", "onFarkindalik",
];

export default async function OnboardingRadari() {
  const db = supabaseAdmin();
  // onboarding_hatirlatma migration 0134'te eklendi; üretilmiş tipler henüz
  // içermediği için bu tabloya erişimde bilinçli cast (hedef.ts deseni).
  type GecmisSatir = { participant_id: string; hedef: string; created_at: string };
  const [durumlar, { data: aboneler }, { data: ayarRow }, { data: gecmisHam }] = await Promise.all([
    onboardingDurumlari(db),
    db.from("push_subscriptions").select("participant_id"),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from("onboarding_hatirlatma").select("participant_id, hedef, created_at"),
  ]);
  const gecmis = (gecmisHam ?? []) as GecmisSatir[];

  const toplam = durumlar.length;
  const pushSet = new Set((aboneler ?? []).map((a) => a.participant_id));
  // Otomatik hatırlatma yalnız kamp KAPALIYKEN (ayna_aktif≠true) çalışır.
  const otoAcik = ayarRow?.value !== "true";

  const eksikIdx = (eksik: OnboardingAdimKod | null) =>
    eksik === null ? SIRA.length : SIRA.indexOf(eksik);

  // Funnel: her aşamayı GEÇMİŞ (tamamlamış) kişi sayısı.
  const asamalar: RadarAsama[] = HUNI.map((h) => {
    const hIdx = SIRA.indexOf(h.kod);
    const tamam = durumlar.filter((d) => eksikIdx(d.eksikAdim) > hIdx).length;
    return { kod: h.kod, ad: h.ad, tamam, toplam };
  });

  // Fotoğraflar (imzalı) — yalnız takılan (rıza vermiş + bitmemiş) kişiler için.
  const takilanlar = durumlar.filter((d) => d.rizaVar && d.eksikAdim !== null);
  const fotoUrller: Record<string, string> = {};
  if (takilanlar.length > 0) {
    const { data: fotoRows } = await db
      .from("participants")
      .select("id, profil_foto_path")
      .in("id", takilanlar.map((t) => t.id))
      .not("profil_foto_path", "is", null);
    const yollar = (fotoRows ?? []).map((r) => r.profil_foto_path as string);
    if (yollar.length > 0) {
      const { data: imzali } = await db.storage.from("sesler").createSignedUrls(yollar, 3600);
      const yolUrl = new Map((imzali ?? []).map((s) => [s.path, s.signedUrl]));
      for (const r of fotoRows ?? []) {
        const u = yolUrl.get(r.profil_foto_path as string);
        if (u) fotoUrller[r.id] = u;
      }
    }
  }

  // Son hatırlatma zamanı (bu araç, onboarding_hatirlatma) — kişi bazlı en yeni.
  const sonHatirlat = new Map<string, string>();
  for (const g of gecmis ?? []) {
    const v = sonHatirlat.get(g.participant_id);
    if (!v || g.created_at > v) sonHatirlat.set(g.participant_id, g.created_at);
  }

  const kisiler: RadarKisi[] = takilanlar
    .sort((a, b) => ((a.sonIlerlemeAt ?? "") < (b.sonIlerlemeAt ?? "") ? -1 : 1))
    .map((k) => {
      const ilkAd = k.ad.split(" ")[0];
      const girisLink = `${BAGLANTI_TABANI}/giris?kod=${k.loginKod}`;
      const mesaj = tr.onboardingTakip.waMesaj(ilkAd, k.eksikAdimAd, girisLink);
      const waLink = k.telefon
        ? `https://wa.me/${k.telefon.replace(/\D/g, "")}?text=${encodeURIComponent(mesaj)}`
        : null;
      return {
        id: k.id,
        ad: k.ad,
        foto: fotoUrller[k.id] ?? null,
        telefon: k.telefon,
        kod: k.loginKod,
        eksikKod: k.eksikAdim as OnboardingAdimKod,
        eksikAd: k.eksikAdimAd,
        sonIlerlemeAt: k.sonIlerlemeAt,
        pushVar: pushSet.has(k.id),
        otoNudgeSayi: k.hatirlatmaSayi,
        sonHatirlatAt: sonHatirlat.get(k.id) ?? null,
        waLink,
      };
    });

  // Dönüşüm: bu araçla hatırlatılan kişilerden kaçı ilgili aşamayı GEÇTİ.
  const gectiMi = (id: string, hedef: "degerler" | "oyun") => {
    const d = durumlar.find((x) => x.id === id);
    if (!d) return false;
    const hedefIdx = SIRA.indexOf(hedef);
    return eksikIdx(d.eksikAdim) > hedefIdx;
  };
  const donusum = { degerler: { hatirlatilan: 0, tamamlayan: 0 }, oyun: { hatirlatilan: 0, tamamlayan: 0 } };
  const gorulen = { degerler: new Set<string>(), oyun: new Set<string>() };
  for (const g of gecmis ?? []) {
    const h = g.hedef as "degerler" | "oyun";
    if (h !== "degerler" && h !== "oyun") continue;
    if (gorulen[h].has(g.participant_id)) continue;
    gorulen[h].add(g.participant_id);
    donusum[h].hatirlatilan++;
    if (gectiMi(g.participant_id, h)) donusum[h].tamamlayan++;
  }

  return (
    <OnboardingRadar
      toplam={toplam}
      pushVarSayi={pushSet.size}
      asamalar={asamalar}
      kisiler={kisiler}
      donusum={donusum}
      otoAcik={otoAcik}
      adimAdlari={ONBOARDING_ADIM_AD}
    />
  );
}
