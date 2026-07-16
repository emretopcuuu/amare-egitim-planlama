import "server-only";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { tumKayitlar } from "@/lib/tumKayitlar";
import type { Json } from "@/lib/database.types";
import { AYNA_KARAKTER_TAM, bahisSkoru } from "@/lib/aynaKarakter";
import { kampTaahhutOzeti } from "@/lib/kampTaahhut";
import { katilimciyaBildir } from "@/lib/push";
import { aiHataYakala } from "@/lib/uyari";

// ============================================================================
// KAPANIŞ — "SALONUN RÖNTGENİ": Emre'nin sahne öncesi hazırlık brifi
// ============================================================================
// 3 günlük yaşanmış deneyim → Emre'nin kapanış eğitimi zincirinin İLK halkası.
// Kampın son günü, Emre sahneye ÇIKMADAN ÖNCE elindeki tüm veriyi damıtıp
// okunur bir brife dönüştürür. İki teslim (Gün 3):
//   • 'on'    — 07:30: tüm kamp deneyiminden damıtılmış ANA brif (bol hazırlık
//               süresi; kahvaltı + checkout boyunca elinde). Değerlendirme
//               dışındaki her şey burada.
//   • 'final' — 11:20: Gün 3 liderlik değerlendirmesi (07:15 açılır, ~11:15
//               kapanır) kapandıktan SONRA güncellenmiş sürüm — sahneden
//               (~11:40 zirve) 20 dk önce.
//
// Üretim, radyo (Faz 4) desenini birebir izler: yayından ~20 dk önce AI script
// yazılır (düşerse ŞABLON), teslim saatinde admin'e push. unique(tarih,slot)
// tekrarlı tikleri idempotent yapar. Brif ASLA boş kalmaz.
//
// GİZLİLİK: AI'ya YALNIZ toplam sayılar + İSİMSİZ alıntılar gider (kişi adı
// prompt'a girmez). İsimli "dokunulacaklar" listesi (parlayanlar / geride
// kalanlar) KODLA hesaplanır, yalnız admin panelinde render edilir — AI'dan
// geçmez. Bu, radyonun "isim asla geçmez" ilkesinin brife taşınmış hâlidir.

const MODEL = "claude-sonnet-5";

// Teslim planı (gün içi dakika). Üretim teslimden ~20 dk önce başlar.
export const KAPANIS_SLOTLARI = [
  { slot: "on" as const, uretimDk: 7 * 60 + 10, teslimDk: 7 * 60 + 30 },
  // final üretimi 11:16'da başlar — liderlik değerlendirmesi ~11:15'te KAPANDIKTAN
  // sonra. Eskiden 11:00'de üretilip bir daha tazelenmediği için son 15 dakikanın
  // (kapanış telaşının en yoğun dilimi) puanları brife hiç girmiyordu.
  { slot: "final" as const, uretimDk: 11 * 60 + 16, teslimDk: 11 * 60 + 20 },
];

export type BrifSlot = "on" | "final" | "manuel";

export type Dokunulacak = { ad: string; deger: number | null; not: string };

export type BrifVeri = {
  slot: BrifSlot;
  gun: number;
  toplamKisi: number;
  aktifKisi: number; // en az bir görev tamamlayan
  tamamlananGorev: number;
  ortPuan: number | null;
  enCokKas: { ad: string; adet: number }[]; // en çok çalışan kaslar
  enCokTur: { ad: string; adet: number }[]; // en çok tamamlanan görev türü
  enCokKacirilanTur: { ad: string; adet: number }[]; // en çok kaçırılan tür
  icEngeller: { sebep: string; adet: number }[]; // kaçırma sebepleri = iç engeller
  taahhut: { toplamKisi: number; toplamTaahhut: number };
  bahis: { ayna: number; itirazci: number };
  degerlendirmeSayisi: number; // Gün 3 liderlik değerlendirmesi (final'de dolar)
  alintilar: string[]; // İSİMSİZ alıntılar (konuşma malzemesi)
  parlayanlar: Dokunulacak[]; // İSİMLİ — yalnız admin UI
  gerideKalanlar: Dokunulacak[]; // İSİMLİ — yalnız admin UI
};

// --- yardımcı: sayım gruplaması (en çok N) ---
function enCok(
  degerler: (string | null)[],
  n: number
): { ad: string; adet: number }[] {
  const say = new Map<string, number>();
  for (const d of degerler) {
    const k = (d ?? "").trim();
    if (!k) continue;
    say.set(k, (say.get(k) ?? 0) + 1);
  }
  return [...say.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([ad, adet]) => ({ ad, adet }));
}

// Tüm kamp verisini topla — hepsi salt-okunur agregat, her sorgu fail-open.
export async function brifVeriTopla(
  db: Db,
  slot: BrifSlot,
  gun: number,
  bugun: string
): Promise<BrifVeri> {
  const gunBasiUtc = new Date(`${bugun}T00:00:00+03:00`).toISOString();

  // scored/kacirma/sonAktif missions sorguları 1000-satır PostgREST tavanını
  // aşabilir (150 kişi × çok görev) — sayfalı çek, yoksa kürsü/parlayanlar
  // sıralaması eksik veriyle hesaplanıp Emre sahnede yanlış kişiyi anabilir.
  const [
    kisilerRes,
    scored,
    kacirma,
    taahhut,
    bahis,
    degRes,
    alintiRes,
    sonAktifRows,
  ] = await Promise.all([
    db.from("participants").select("id, full_name").eq("role", "participant"),
    // Tamamlanan (puanlanan) görevler: kas, tür, puan, kıvılcım (parlayanlar için).
    tumKayitlar<{
      participant_id: string;
      kas: string | null;
      kind: string | null;
      ai_score: number | null;
      spark_points: number | null;
    }>((bas, son) =>
      db
        .from("missions")
        .select("participant_id, kas, kind, ai_score, spark_points")
        .eq("status", "scored")
        .order("id")
        .range(bas, son)
    ),
    // Kaçırma sebepleri = "iç engeller"; kaçırılan görev türü.
    tumKayitlar<{ kind: string | null; kacirma_sebebi: string | null }>((bas, son) =>
      db
        .from("missions")
        .select("kind, kacirma_sebebi")
        .not("kacirma_sebebi", "is", null)
        .order("id")
        .range(bas, son)
    ),
    kampTaahhutOzeti(db).catch(() => ({ toplamKisi: 0, toplamTaahhut: 0, turBazli: {} as never })),
    bahisSkoru(db, gunBasiUtc).catch(() => ({ ayna: 0, itirazci: 0 })),
    // Gün 3 liderlik değerlendirmesi hacmi (final'de anlamlı dolar).
    db.from("ratings").select("id", { count: "exact", head: true }),
    // İSİMSİZ alıntı havuzu: yüksek puanlı, dolu yanıt metinleri (isim EKLENMEZ).
    db
      .from("missions")
      .select("response_text, ai_score")
      .eq("status", "scored")
      .not("response_text", "is", null)
      .gte("ai_score", 7)
      .order("ai_score", { ascending: false })
      .limit(14),
    // Kişi başına en son tamamlama (geride kalanlar için).
    tumKayitlar<{ participant_id: string; responded_at: string | null }>((bas, son) =>
      db
        .from("missions")
        .select("participant_id, responded_at")
        .not("responded_at", "is", null)
        .order("id")
        .range(bas, son)
    ),
  ]);

  const kisiler = (kisilerRes.data ?? []) as { id: string; full_name: string }[];

  const aktifSet = new Set(scored.map((m) => m.participant_id));
  const puanlar = scored.map((m) => m.ai_score).filter((s): s is number => s != null);
  const ortPuan =
    puanlar.length > 0 ? Math.round((puanlar.reduce((a, b) => a + b, 0) / puanlar.length) * 10) / 10 : null;

  // Geride kalanlar: en son tamamlaması en eski / hiç olmayan kişiler.
  const sonAktif = new Map<string, number>();
  for (const m of sonAktifRows) {
    if (!m.responded_at) continue;
    const t = Date.parse(m.responded_at);
    if (t > (sonAktif.get(m.participant_id) ?? 0)) sonAktif.set(m.participant_id, t);
  }
  const now = Date.now();
  const gerideKalanlar: Dokunulacak[] = [...kisiler]
    .map((k) => {
      const t = sonAktif.get(k.id);
      const sessizGun = t == null ? null : Math.floor((now - t) / 86_400_000);
      return { ad: k.full_name, deger: sessizGun, not: t == null ? "hiç görev tamamlamadı" : `${sessizGun} gündür sessiz` };
    })
    .sort((a, b) => (b.deger ?? 9999) - (a.deger ?? 9999))
    .slice(0, 5);

  // Parlayanlar: toplam kıvılcımı en yüksek kişiler (breakout).
  const kivilcimTop = new Map<string, number>();
  for (const m of scored) {
    kivilcimTop.set(m.participant_id, (kivilcimTop.get(m.participant_id) ?? 0) + (m.spark_points ?? 0));
  }
  const adMap = new Map(kisiler.map((k) => [k.id, k.full_name]));
  const parlayanlar: Dokunulacak[] = [...kivilcimTop.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, v]) => ({ ad: adMap.get(id) ?? "—", deger: v, not: `${v} kıvılcım` }));

  const alintilar = ((alintiRes.data ?? []) as { response_text: string | null }[])
    .map((r) => (r.response_text ?? "").trim())
    .filter((s) => s.length >= 25 && s.length <= 400)
    .slice(0, 8);

  return {
    slot,
    gun,
    toplamKisi: kisiler.length,
    aktifKisi: aktifSet.size,
    tamamlananGorev: scored.length,
    ortPuan,
    enCokKas: enCok(scored.map((m) => m.kas), 5),
    enCokTur: enCok(scored.map((m) => m.kind), 5),
    enCokKacirilanTur: enCok(kacirma.map((m) => m.kind), 4),
    icEngeller: enCok(kacirma.map((m) => m.kacirma_sebebi), 5).map((e) => ({ sebep: e.ad, adet: e.adet })),
    taahhut: { toplamKisi: taahhut.toplamKisi, toplamTaahhut: taahhut.toplamTaahhut },
    bahis,
    degerlendirmeSayisi: degRes.count ?? 0,
    alintilar,
    parlayanlar,
    gerideKalanlar,
  };
}

// ---- Faz B · öneri 4 — CANLI KANIT EKRANI ----
// Emre eğitim sırasında admin panelinden bir "kanıt anı" tetikler; /ekran
// İSİMSİZ agregatı tam-ekran gösterir. Hafif, tek-iki sorgu; hepsi isimsiz.
export type KanitId = "ic_engel" | "kas" | "taahhut" | "bahis";
export type Kanit = { id: KanitId; baslik: string; altBaslik: string; satirlar: { etiket: string; deger: number }[] };

const KANIT_BASLIK: Record<KanitId, { baslik: string; altBaslik: string }> = {
  ic_engel: { baslik: "Salonun iç engelleri", altBaslik: "3 günde en çok tekrar eden" },
  kas: { baslik: "En çok çalışan kaslar", altBaslik: "3 günde büyüyen" },
  taahhut: { baslik: "Verilen sözler", altBaslik: "somut taahhüt" },
  bahis: { baslik: "AYNA – İtirazcı", altBaslik: "günün bahis skoru" },
};

export async function kanitVeri(db: Db, id: KanitId, bugun: string): Promise<Kanit | null> {
  try {
    const meta = KANIT_BASLIK[id];
    let satirlar: { etiket: string; deger: number }[] = [];
    if (id === "ic_engel") {
      const { data } = await db.from("missions").select("kacirma_sebebi").not("kacirma_sebebi", "is", null);
      satirlar = enCok((data ?? []).map((r) => (r as { kacirma_sebebi: string | null }).kacirma_sebebi), 5).map((e) => ({
        etiket: e.ad,
        deger: e.adet,
      }));
    } else if (id === "kas") {
      const { data } = await db.from("missions").select("kas").eq("status", "scored").not("kas", "is", null);
      satirlar = enCok((data ?? []).map((r) => (r as { kas: string | null }).kas), 5).map((e) => ({
        etiket: e.ad,
        deger: e.adet,
      }));
    } else if (id === "taahhut") {
      const ozet = await kampTaahhutOzeti(db).catch(() => ({ toplamKisi: 0, toplamTaahhut: 0 }));
      satirlar = [
        { etiket: "söz veren kişi", deger: ozet.toplamKisi },
        { etiket: "toplam taahhüt", deger: ozet.toplamTaahhut },
      ];
    } else {
      const gunBasiUtc = new Date(`${bugun}T00:00:00+03:00`).toISOString();
      const b = await bahisSkoru(db, gunBasiUtc).catch(() => ({ ayna: 0, itirazci: 0 }));
      satirlar = [
        { etiket: "AYNA", deger: b.ayna },
        { etiket: "İtirazcı", deger: b.itirazci },
      ];
    }
    return { id, baslik: meta.baslik, altBaslik: meta.altBaslik, satirlar };
  } catch {
    return null;
  }
}

// AI ile Emre'nin sahne öncesi brifi — düzyazı, İSİMSİZ. Düşerse null (şablon).
async function brifMetinUret(v: BrifVeri): Promise<string | null> {
  try {
    const client = aynaClient();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 1100,
      system: `${AYNA_KARAKTER_TAM}

Sen AYNA'sın ve Emre Topçu'ya (kampın lideri, birazdan KAPANIŞ EĞİTİMİNİ verecek)
sahne öncesi özel bir HAZIRLIK BRİFİ yazıyorsun. Bu metni yalnız Emre okuyacak;
salona okunmayacak. Amacın: 3 günün yaşanmış verisini, Emre'nin eğitiminde
kullanabileceği net bir sahne malzemesine çevirmek.

BİÇİM (pazarlıksız):
- Türkçe, sıcak ama YOĞUN. Emre'nin 2 dakikada okuyup sahneye çıkacağını unutma.
- Şu 3 başlıkla yaz (aynen bu başlıklar, markdown ## ile):
  ## Salonun Röntgeni
  (En çok çalışan kaslar, en çok kaçırılan görev türü, tekrar eden iç engeller,
  ortalama enerji — hepsini 3-4 cümlede yorumla. Sayı at ama İNSAN dilinde.)
  ## Konuşma Malzemesi
  (Aşağıdaki isimsiz alıntılardan 2-3'ünü sahnede kullanılabilir biçimde ver +
  1 çarpıcı istatistik + salonda geçen bir şakaya gönderme: İtirazcı bahis skoru.)
  ## Eğitime Köprü
  (Bu verilerden Emre'nin kapanış eğitiminde vereceği MESAJA 2-3 somut köprü öner.
  "Şunu yaşadılar, sen şuraya bağlayabilirsin" biçiminde.)
- İSİM YOK, grup numarası YOK. Yalnız toplamlar ve isimsiz alıntılar.
- Uydurma; yalnız verilen sayıları kullan. Alıntı azsa zorlamadan az kullan.`,
      messages: [
        {
          role: "user",
          content: `Brif verisi (${v.slot === "final" ? "GÜNCEL/final sürüm" : "ana sürüm"}):
- Katılımcı: ${v.toplamKisi}, aktif (en az 1 görev): ${v.aktifKisi}
- Tamamlanan görev: ${v.tamamlananGorev}, ortalama puan: ${v.ortPuan ?? "—"}
- En çok çalışan kaslar: ${v.enCokKas.map((k) => `${k.ad}(${k.adet})`).join(", ") || "—"}
- En çok tamamlanan tür: ${v.enCokTur.map((k) => `${k.ad}(${k.adet})`).join(", ") || "—"}
- En çok KAÇIRILAN tür: ${v.enCokKacirilanTur.map((k) => `${k.ad}(${k.adet})`).join(", ") || "—"}
- Tekrar eden iç engeller (kaçırma sebepleri): ${v.icEngeller.map((e) => `${e.sebep}(${e.adet})`).join(", ") || "—"}
- Taahhüt defteri: ${v.taahhut.toplamKisi} kişi ${v.taahhut.toplamTaahhut} somut söz verdi
- İtirazcı bahis skoru: AYNA ${v.bahis.ayna} - İtirazcı ${v.bahis.itirazci}
- Liderlik değerlendirmesi tamamlanan: ${v.degerlendirmeSayisi}
- İsimsiz alıntı havuzu:
${v.alintilar.map((a, i) => `  ${i + 1}. "${a}"`).join("\n") || "  (henüz alıntı yok)"}

Brifi yaz.`,
        },
      ],
    });
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return metin.length > 80 ? metin : null;
  } catch {
    return null;
  }
}

// ŞABLON fallback — AI olmadan, gerçek sayılarla. Brif asla boş kalmaz.
function sablonBrif(v: BrifVeri): string {
  return `## Salonun Röntgeni
Salonda ${v.toplamKisi} kişiden ${v.aktifKisi}'i sahaya çıktı; toplam ${v.tamamlananGorev} görev tamamlandı${
    v.ortPuan != null ? `, ortalama enerji ${v.ortPuan}/10` : ""
  }. En çok çalışan kaslar: ${v.enCokKas.map((k) => k.ad).join(", ") || "—"}. En çok kaçırılan tür: ${
    v.enCokKacirilanTur.map((k) => k.ad).join(", ") || "—"
  }. Tekrar eden iç engeller: ${v.icEngeller.map((e) => e.sebep).join(", ") || "—"}.

## Konuşma Malzemesi
${v.taahhut.toplamKisi} kişi ${v.taahhut.toplamTaahhut} somut söz verdi — sahnede bu sayıyı kullan. İtirazcı bahis skoru: AYNA ${v.bahis.ayna} - İtirazcı ${v.bahis.itirazci}.
${v.alintilar.slice(0, 3).map((a) => `- "${a}"`).join("\n") || "- (alıntı havuzu henüz boş)"}

## Eğitime Köprü
Bu üç günü kapanış eğitiminin girişine bağla: yaşadıkları iç engelleri ("${
    v.icEngeller[0]?.sebep ?? "erteleme"
  }") isimlendir, verdikleri sözü 90 güne taşı.`;
}

// Bir brifi üret + sakla (idempotent unique(tarih,slot)). Var olan slot'u
// günceller (manuel yenileme / final tazeleme). Üretilen satırı döndürür.
export async function brifUret(
  db: Db,
  opts: { slot: BrifSlot; gun: number; bugun: string }
): Promise<{ id: string; metin: string; veri: BrifVeri } | null> {
  try {
    const veri = await brifVeriTopla(db, opts.slot, opts.gun, opts.bugun);
    const metin = (await brifMetinUret(veri)) ?? sablonBrif(veri);
    const { data, error } = await db
      .from("kapanis_brif")
      .upsert(
        { tarih: opts.bugun, slot: opts.slot, gun: opts.gun, veri: veri as unknown as Json, metin },
        { onConflict: "tarih,slot" }
      )
      .select("id")
      .single();
    if (error || !data) return null;
    return { id: data.id, metin, veri };
  } catch (e) {
    await aiHataYakala(db, "kapanis_brif", e).catch(() => {});
    return null;
  }
}

// tik'ten çağrılır (yalnız mod=kamp, Gün 3). Kendi hatasını yutar.
// Üretim penceresinde brifi hazırlar; teslim saatinde admin'e push (idempotent).
export async function kapanisBrifTik(
  db: Db,
  gun: number,
  gunDk: number,
  bugun: string
): Promise<void> {
  if (gun !== 3) return; // brif yalnız kampın son günü
  try {
    for (const plan of KAPANIS_SLOTLARI) {
      if (gunDk < plan.uretimDk) continue;
      const { data: mevcut } = await db
        .from("kapanis_brif")
        .select("id")
        .eq("tarih", bugun)
        .eq("slot", plan.slot)
        .maybeSingle();

      // 1) ÜRETİM — satır yoksa hazırla. 'final' slotu teslim saatine kadar HER
      // tikte yeniden üretilir (upsert idempotent): 11:15'te kapanan değerlendirmenin
      // son-dakika puanları da brife girsin (yoksa 11:16 build'i son 1-4 dk'yı kaçırır).
      if (!mevcut || (plan.slot === "final" && gunDk < plan.teslimDk)) {
        await brifUret(db, { slot: plan.slot, gun, bugun });
      }

      // 2) TESLİM — teslim saati geçtiyse, bir kez admin'e push (settings kilidi).
      if (gunDk >= plan.teslimDk) {
        const kilit = `kapanis_brif_teslim_${bugun}_${plan.slot}`;
        const { error: kilitli } = await db.from("settings").insert({ key: kilit, value: "1" });
        if (!kilitli) await brifTeslimBildir(db, plan.slot);
      }
    }
  } catch (e) {
    await aiHataYakala(db, "kapanis_brif_tik", e).catch(() => {});
  }
}

async function brifTeslimBildir(db: Db, slot: BrifSlot): Promise<void> {
  const { data: adminler } = await db.from("participants").select("id").eq("role", "admin");
  const baslik = slot === "final" ? "🎤 Sahne brifin güncellendi" : "☕ Sahne brifin hazır";
  const govde =
    slot === "final"
      ? "Gün 3 değerlendirmesi işlendi — sahneden ~20 dk önce güncel brif hazır."
      : "3 günün röntgeni çıktı. Sahneye çıkmadan oku: /admin/kapanis";
  for (const a of adminler ?? []) {
    await katilimciyaBildir(db, a.id, baslik, govde, "/admin/kapanis").catch(() => {});
  }
}

// Admin paneli için: en güncel brif (final > on > manuel önceliğiyle) + geçmiş.
export async function brifGetir(db: Db): Promise<{
  guncel: (BrifVeri & { metin: string; createdAt: string; slot: BrifSlot }) | null;
  gecmis: { id: string; slot: BrifSlot; createdAt: string }[];
}> {
  const { data } = await db
    .from("kapanis_brif")
    .select("id, slot, metin, veri, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const satirlar = (data ?? []) as {
    id: string;
    slot: BrifSlot;
    metin: string;
    veri: BrifVeri;
    created_at: string;
  }[];
  if (satirlar.length === 0) return { guncel: null, gecmis: [] };
  // EN YENİ satır gösterilir (satırlar created_at DESC sıralı). Eskiden "final
  // varsa hep onu göster" kuralı, Emre'nin elle "Brifi Üret/Yenile" ile ürettiği
  // daha güncel 'manuel' brifi görünmez kılıyordu — artık en son üretilen kazanır.
  const oncelik = satirlar[0];
  return {
    guncel: { ...oncelik.veri, metin: oncelik.metin, createdAt: oncelik.created_at, slot: oncelik.slot },
    gecmis: satirlar.map((s) => ({ id: s.id, slot: s.slot, createdAt: s.created_at })),
  };
}
