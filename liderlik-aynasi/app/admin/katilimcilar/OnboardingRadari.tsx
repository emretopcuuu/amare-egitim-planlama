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
  "hazirlik", "rituel", "oyun", "degerler", "pusula", "hedef", "onFarkindalik",
];

export default async function OnboardingRadari() {
  const db = supabaseAdmin();
  // onboarding_hatirlatma migration 0134'te eklendi; üretilmiş tipler henüz
  // içermediği için bu tabloya erişimde bilinçli cast (hedef.ts deseni).
  type GecmisSatir = { participant_id: string; hedef: string; created_at: string; kanal: string };
  const [durumlar, { data: aboneler }, { data: ayarlar }, { data: gecmisHam }] = await Promise.all([
    onboardingDurumlari(db),
    db.from("push_subscriptions").select("participant_id"),
    db.from("settings").select("key, value").in("key", ["ayna_aktif", "onboarding_wa_oto"]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from("onboarding_hatirlatma").select("participant_id, hedef, created_at, kanal"),
  ]);
  const gecmis = (gecmisHam ?? []) as GecmisSatir[];
  const ayarMap = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  const toplam = durumlar.length;
  const pushSet = new Set((aboneler ?? []).map((a) => a.participant_id));
  // Otomatik hatırlatma yalnız kamp KAPALIYKEN (ayna_aktif≠true) çalışır.
  const otoAcik = ayarMap.get("ayna_aktif") !== "true";
  // Otomatik onboarding WhatsApp: admin açtıysa (varsayılan kapalı).
  const waOtoAcik = ayarMap.get("onboarding_wa_oto") === "true";

  const eksikIdx = (eksik: OnboardingAdimKod | null) =>
    eksik === null ? SIRA.length : SIRA.indexOf(eksik);

  // Funnel: her aşamayı GEÇMİŞ (tamamlamış) kişi sayısı.
  // EN TEPEDE: koduyla en az bir kez GİRİŞ yapan kişi sayısı (huninin ağzı —
  // kaç kişiye kod ulaştı ve uygulamayı açtı). Tıklanınca girmeyenleri süzer.
  const girisSayi = durumlar.filter((d) => d.girisYapti).length;
  const asamalar: RadarAsama[] = [
    { kod: "giris", ad: "Giriş yaptı", tamam: girisSayi, toplam },
    ...HUNI.map((h) => {
      const hIdx = SIRA.indexOf(h.kod);
      const tamam = durumlar.filter((d) => eksikIdx(d.eksikAdim) > hIdx).length;
      return { kod: h.kod, ad: h.ad, tamam, toplam };
    }),
  ];

  // HERKES (142) listede — bitmemişler aksiyon için üstte, bitirenler ✓ ile
  // en altta. Böylece tüm kampı tek listeden takip edersin (kim nerede kaldı).
  const takilanlar = durumlar;
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

  // Son hatırlatma zamanı + kişi başı KANAL sayaçları (senin dürtülerin):
  //   bildirim = uygulama-içi/push manuel dürtme · whatsapp = WhatsApp tıklaması.
  const sonHatirlat = new Map<string, string>();
  const bildirimSayi = new Map<string, number>();
  const whatsappSayi = new Map<string, number>();
  const otoWaSayi = new Map<string, number>(); // otomatik gönderilen WhatsApp (whatsapp_oto)
  for (const g of gecmis ?? []) {
    const v = sonHatirlat.get(g.participant_id);
    if (!v || g.created_at > v) sonHatirlat.set(g.participant_id, g.created_at);
    if (g.kanal === "whatsapp") whatsappSayi.set(g.participant_id, (whatsappSayi.get(g.participant_id) ?? 0) + 1);
    else if (g.kanal === "whatsapp_oto") otoWaSayi.set(g.participant_id, (otoWaSayi.get(g.participant_id) ?? 0) + 1);
    else bildirimSayi.set(g.participant_id, (bildirimSayi.get(g.participant_id) ?? 0) + 1);
  }

  const kisiler: RadarKisi[] = takilanlar
    // Bitmemişler önce (aksiyon gereken), en sessizden başlayarak; bitirenler EN ALTTA.
    .sort((a, b) => {
      const af = a.eksikAdim === null, bf = b.eksikAdim === null;
      if (af !== bf) return af ? 1 : -1;
      return (a.sonIlerlemeAt ?? "") < (b.sonIlerlemeAt ?? "") ? -1 : 1;
    })
    .map((k) => {
      const bitti = k.eksikAdim === null;
      const ilkAd = k.ad.split(" ")[0];
      const girisLink = `${BAGLANTI_TABANI}/giris?kod=${k.loginKod}`;
      const mesaj = tr.onboardingTakip.waMesaj(ilkAd, k.eksikAdimAd || "hazırlık", girisLink);
      const waLink = k.telefon
        ? `https://wa.me/${k.telefon.replace(/\D/g, "")}?text=${encodeURIComponent(mesaj)}`
        : null;
      return {
        id: k.id,
        ad: k.ad,
        foto: fotoUrller[k.id] ?? null,
        telefon: k.telefon,
        kod: k.loginKod,
        girisYapti: k.girisYapti,
        eksikKod: (bitti ? "tamam" : (k.eksikAdim as OnboardingAdimKod)) as OnboardingAdimKod | "tamam",
        eksikAd: bitti ? "Tamamladı" : k.eksikAdimAd,
        bitti,
        sonIlerlemeAt: k.sonIlerlemeAt,
        pushVar: pushSet.has(k.id),
        otoNudgeSayi: k.hatirlatmaSayi,
        bildirimSayi: bildirimSayi.get(k.id) ?? 0,
        whatsappSayi: whatsappSayi.get(k.id) ?? 0,
        otoWaSayi: otoWaSayi.get(k.id) ?? 0,
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
      waOtoAcik={waOtoAcik}
      adimAdlari={ONBOARDING_ADIM_AD}
    />
  );
}
