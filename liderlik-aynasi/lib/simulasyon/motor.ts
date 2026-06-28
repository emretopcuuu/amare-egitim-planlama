import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { eslestir, type EslesmeKisi } from "@/lib/eslestirme";
import { gorevUret, gorevPuanla } from "@/lib/ayna";
import { kariyerHalKisidenTuret } from "@/lib/persona";
import {
  SIM_KARAKTERLER,
  simPuan,
  simYorum,
  simYanit,
  tohumla,
  type SimKarakter,
} from "@/lib/simulasyon/karakterler";
import { SIM_ADIMLAR, SIM_BATCH, SIM_TOPLAM, type SimDurum } from "@/lib/simulasyon/adimlar";

type Db = SupabaseClient<Database>;

const DURUM_ANAHTAR = "simulasyon_durum";
const SLOTLAR = ["21:00", "21:50", "22:40"];

export type { SimDurum };

export type AdimSonuc = {
  tamam: boolean;
  ilerleme: number;
  mesaj: string;
};

// ── Durum (settings'te JSON) ──
export async function durumOku(db: Db): Promise<SimDurum> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", DURUM_ANAHTAR)
    .maybeSingle();
  if (!data?.value) return { adim: 0, ilerleme: 0, log: [] };
  try {
    const d = JSON.parse(data.value) as SimDurum;
    return { adim: d.adim ?? 0, ilerleme: d.ilerleme ?? 0, log: d.log ?? [] };
  } catch {
    return { adim: 0, ilerleme: 0, log: [] };
  }
}

async function durumYaz(db: Db, durum: SimDurum): Promise<void> {
  await db.from("settings").upsert(
    {
      key: DURUM_ANAHTAR,
      value: JSON.stringify({ ...durum, log: durum.log.slice(-40) }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

// ── Yardımcılar ──
type SimKisi = {
  id: string;
  full_name: string;
  team: string | null;
  kariyer_seviyesi: string | null;
  en_yuksek_kariyer: string | null;
  gecen_ay_kariyer: string | null;
  kidem_ay: number | null;
};

async function simKatilimcilar(db: Db): Promise<SimKisi[]> {
  const { data } = await db
    .from("participants")
    .select(
      "id, full_name, team, kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay"
    )
    .eq("simulasyon", true)
    .order("created_at");
  return (data ?? []) as SimKisi[];
}

// Karakter adından arketipi geri bul (puanlama/yanıt davranışı için).
function karakterBul(ad: string): SimKarakter | null {
  return SIM_KARAKTERLER.find((k) => k.ad === ad) ?? null;
}

async function ayarYaz(db: Db, key: string, value: string): Promise<void> {
  await db
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

// Dalga aç (diğerlerini kapat) — /api/admin/dalga mantığının özeti.
async function dalgaAc(db: Db, dalgaId: number): Promise<void> {
  const simdi = new Date().toISOString();
  await db
    .from("waves")
    .update({ is_open: false, closed_at: simdi })
    .eq("is_open", true)
    .neq("id", dalgaId);
  await db
    .from("waves")
    .update({ is_open: true, opened_at: simdi, closed_at: null })
    .eq("id", dalgaId);
}

// Bir dalga için sim kohortunun tüm puanlarını üret (öz + atanan hedefler).
async function dalgaPuanla(db: Db, dalgaId: number): Promise<number> {
  const kisiler = await simKatilimcilar(db);
  const ozellikler = await aktifOzellikler(db);
  const { data: atamalar } = await db
    .from("assignments")
    .select("observer_id, target_id")
    .in(
      "observer_id",
      kisiler.map((k) => k.id)
    );

  const adMap = new Map(kisiler.map((k) => [k.id, k.full_name]));
  const satirlar: Database["public"]["Tables"]["ratings"]["Insert"][] = [];

  // Öz-değerlendirme — herkes kendini puanlar.
  for (const k of kisiler) {
    const kar = karakterBul(k.full_name);
    const rnd = tohumla(k.id, "oz", dalgaId);
    for (const o of ozellikler) {
      satirlar.push({
        rater_id: k.id,
        target_id: k.id,
        trait_id: o.id,
        wave: dalgaId,
        score: simPuan(kar?.puanArketip ?? "tutarli", true, rnd),
      });
    }
  }

  // Akran değerlendirmesi — atanan hedefler.
  for (const a of atamalar ?? []) {
    const kar = karakterBul(adMap.get(a.observer_id) ?? "");
    const arketip = kar?.puanArketip ?? "tutarli";
    const rnd = tohumla(a.observer_id, a.target_id, dalgaId);
    for (const o of ozellikler) {
      const puan = simPuan(arketip, false, rnd);
      satirlar.push({
        rater_id: a.observer_id,
        target_id: a.target_id,
        trait_id: o.id,
        wave: dalgaId,
        score: puan,
        comment: puan <= 5 ? simYorum(arketip, o.name, rnd) : null,
      });
    }
  }

  if (satirlar.length > 0) {
    await db
      .from("ratings")
      .upsert(satirlar, { onConflict: "rater_id,target_id,trait_id,wave" });
  }
  return satirlar.length;
}

// ── Adım yürütücüler ──
// Her biri: (db, ilerleme) → { tamam, ilerleme, mesaj }

async function adimKarakterler(db: Db): Promise<AdimSonuc> {
  const mevcut = await simKatilimcilar(db);
  if (mevcut.length >= SIM_TOPLAM) {
    return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: `${mevcut.length} sim karakter zaten mevcut.` };
  }
  // Kullanılmış kodları topla, sim kodları 9xxxxx aralığından ver (çakışma az).
  const { data: kodlar } = await db.from("participants").select("login_code");
  const kullanilmis = new Set((kodlar ?? []).map((k) => k.login_code));
  const satirlar: Database["public"]["Tables"]["participants"]["Insert"][] = [];
  let sayac = 900000;
  for (const k of SIM_KARAKTERLER) {
    while (kullanilmis.has(String(sayac))) sayac++;
    const kod = String(sayac);
    kullanilmis.add(kod);
    sayac++;
    const persona = kariyerHalKisidenTuret({
      kariyer_seviyesi: k.kariyer_seviyesi,
      en_yuksek_kariyer: k.en_yuksek_kariyer,
      gecen_ay_kariyer: k.gecen_ay_kariyer,
      kidem_ay: k.kidem_ay,
    });
    satirlar.push({
      full_name: k.ad,
      login_code: kod,
      team: k.takim,
      city: k.sehir,
      role: "participant",
      simulasyon: true,
      consent_at: new Date().toISOString(),
      kariyer_seviyesi: k.kariyer_seviyesi,
      en_yuksek_kariyer: k.en_yuksek_kariyer,
      gecen_ay_kariyer: k.gecen_ay_kariyer,
      kidem_ay: k.kidem_ay,
      kariyer_durumu: persona?.hal ?? null,
    });
  }
  const { error } = await db.from("participants").insert(satirlar);
  if (error) throw error;
  return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: `${satirlar.length} sim karakter oluşturuldu (kod 900000+).` };
}

async function adimPusula(db: Db): Promise<AdimSonuc> {
  const kisiler = await simKatilimcilar(db);
  const satirlar: Database["public"]["Tables"]["pusula"]["Insert"][] = [];
  const simdi = new Date().toISOString();
  for (const k of kisiler) {
    const kar = karakterBul(k.full_name);
    if (!kar) continue;
    const oncelikler = [
      "Ailem", "Sağlığım", "Kariyerim", "Ekibim", "Maddi özgürlük",
      "Kişisel gelişim", "Sosyal çevre", "Ruhsal denge", "Özgürlük", "İz bırakmak",
    ].map((metin, i) => ({ sira: i + 1, metin }));
    satirlar.push({
      participant_id: k.id,
      asama: "tamam",
      oncelikler,
      cekirdek_neden: [
        "Sevdiklerime daha iyi bir hayat sunmak",
        kar.slogan,
      ],
      mevcut_bosluk: "Bildiğim ile yaşadığım arasında bir mesafe var.",
      ic_engel: kar.icEngel,
      ic_engel_kat: kar.icEngelKat,
      slogan: kar.slogan,
      slogan_adaylar: [kar.slogan, "Bugün bir adım.", "Korkuya rağmen."],
      ozet: `${k.full_name.replace("Sim · ", "")}: iç engeli "${kar.icEngel}". Sloganı "${kar.slogan}". Persona hâline uygun, somut adımlarla ilerlemeye hazır.`,
      baz_guven: 6,
      tamamlandi_at: simdi,
      updated_at: simdi,
    });
  }
  if (satirlar.length > 0) {
    await db.from("pusula").upsert(satirlar, { onConflict: "participant_id" });
  }
  return { tamam: true, ilerleme: kisiler.length, mesaj: `${satirlar.length} karakter için pusula tamamlandı.` };
}

async function adimEslestirme(db: Db): Promise<AdimSonuc> {
  const kisiler = await simKatilimcilar(db);
  const kisilerEsles: EslesmeKisi[] = kisiler.map((k) => ({ id: k.id, team: k.team }));
  const atamalar = eslestir(kisilerEsles, 2, 2);
  // Yalnız sim atamalarını sil (gerçek katılımcılara dokunma).
  await db
    .from("assignments")
    .delete()
    .in(
      "observer_id",
      kisiler.map((k) => k.id)
    );
  if (atamalar.length > 0) {
    await db.from("assignments").insert(atamalar);
  }
  return { tamam: true, ilerleme: kisiler.length, mesaj: `${atamalar.length} gözlem ataması kuruldu (kişi başı ~4).` };
}

async function adimKampAc(db: Db): Promise<AdimSonuc> {
  const { data } = await db
    .from("participants")
    .update({ camp_unlocked_at: new Date().toISOString() })
    .eq("simulasyon", true)
    .is("camp_unlocked_at", null)
    .select("id");
  return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: `${data?.length ?? 0} karakter için kamp açıldı.` };
}

async function adimDalga(db: Db, dalgaId: number): Promise<AdimSonuc> {
  await dalgaAc(db, dalgaId);
  const n = await dalgaPuanla(db, dalgaId);
  return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: `Dalga ${dalgaId} açıldı, ${n} puan girildi.` };
}

// AI: AYNA görev üretimi (batch'li).
async function adimGorev(db: Db, ilerleme: number, gun: number): Promise<AdimSonuc> {
  // İlk dilimde AYNA'yı aktif et — admin nav rozeti "uyanık" görünsün.
  if (ilerleme === 0) await ayarYaz(db, "ayna_aktif", "true");
  const kisiler = await simKatilimcilar(db);
  const dilim = kisiler.slice(ilerleme, ilerleme + SIM_BATCH);
  let uretilen = 0;
  await Promise.all(
    dilim.map(async (k) => {
      try {
        const g = await gorevUret(
          db,
          { id: k.id, full_name: k.full_name, team: k.team },
          gun,
          10,
          "kamp"
        );
        if (!g) return;
        const sureMs = g.sure_saat * 3600_000;
        await db.from("missions").insert({
          participant_id: k.id,
          kind: g.kind,
          title: g.title,
          body: g.body,
          status: "pending",
          trait_id: g.trait_id,
          difficulty: g.difficulty,
          micro_sprint: g.micro_sprint,
          neden: g.neden,
          due_at: new Date(Date.now() + sureMs).toISOString(),
        });
        uretilen++;
      } catch {
        // tek kişi başarısızsa devam et
      }
    })
  );
  const yeniIlerleme = ilerleme + dilim.length;
  const tamam = yeniIlerleme >= kisiler.length;
  return {
    tamam,
    ilerleme: yeniIlerleme,
    mesaj: `Gün ${gun}: ${yeniIlerleme}/${kisiler.length} karaktere görev üretildi (+${uretilen}).`,
  };
}

// AI: görev yanıtı + puanlama (batch'li).
async function adimYanit(db: Db, ilerleme: number, gun: number): Promise<AdimSonuc> {
  const kisiler = await simKatilimcilar(db);
  const dilim = kisiler.slice(ilerleme, ilerleme + SIM_BATCH);
  let puanlanan = 0;
  await Promise.all(
    dilim.map(async (k) => {
      const { data: gorev } = await db
        .from("missions")
        .select("id, title, body, kind")
        .eq("participant_id", k.id)
        .eq("status", "pending")
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!gorev) return;
      const kar = karakterBul(k.full_name);
      const rnd = tohumla(k.id, gorev.id, "yanit");
      const yanit = simYanit(kar?.yanitArketip ?? "derin", gorev.title, rnd);
      const simdi = new Date().toISOString();
      try {
        const sonuc = await gorevPuanla(
          { title: gorev.title, body: gorev.body, kind: gorev.kind },
          yanit
        );
        if (!sonuc) {
          // puanlama başarısızsa yanıtı kaydet, sonra tekrar denenebilir
          await db
            .from("missions")
            .update({ status: "submitted", response_text: yanit, responded_at: simdi })
            .eq("id", gorev.id);
          return;
        }
        await db
          .from("missions")
          .update({
            status: "scored",
            response_text: yanit,
            responded_at: simdi,
            scored_at: simdi,
            ai_score: sonuc.puan,
            ai_comment: sonuc.yorum,
            response_tags: sonuc.response_tags ?? null,
            spark_points: Math.max(5, sonuc.puan * 5),
          })
          .eq("id", gorev.id);
        puanlanan++;
      } catch {
        // devam
      }
    })
  );
  const yeniIlerleme = ilerleme + dilim.length;
  const tamam = yeniIlerleme >= kisiler.length;
  return {
    tamam,
    ilerleme: yeniIlerleme,
    mesaj: `Gün ${gun}: ${yeniIlerleme}/${kisiler.length} yanıt işlendi (+${puanlanan} puanlandı).`,
  };
}

async function adimOyun(db: Db): Promise<AdimSonuc> {
  const kisiler = await simKatilimcilar(db);
  // 15 gruba dengeli dağıt (en boş gruba) — basit round-robin.
  for (let i = 0; i < kisiler.length; i++) {
    const grup = `Grup ${(i % 15) + 1}`;
    await db.from("participants").update({ team: grup }).eq("id", kisiler[i].id);
  }
  return { tamam: true, ilerleme: kisiler.length, mesaj: `${kisiler.length} karakter Cumartesi gruplarına atandı.` };
}

async function adimAynaEsi(db: Db): Promise<AdimSonuc> {
  const kisiler = await simKatilimcilar(db);
  // Sim ayna_esi satırlarını temizle (idempotent) — sadece sim kişileri içerenler.
  const idSet = kisiler.map((k) => k.id);
  await db.from("ayna_esi").delete().in("a_id", idSet);
  const yarisi = Math.floor(kisiler.length / 2);
  const satirlar: Database["public"]["Tables"]["ayna_esi"]["Insert"][] = [];
  for (let i = 0; i < yarisi; i++) {
    const a = kisiler[i];
    const b = kisiler[i + yarisi];
    if (!a || !b) continue;
    const rnd = tohumla(a.id, b.id, "esi");
    const aVerir = 1 + Math.floor(rnd() * 10);
    let bVerir = 1 + Math.floor(rnd() * 10);
    if (bVerir === aVerir) bVerir = (bVerir % 10) + 1;
    const tamam = rnd() < 0.6;
    satirlar.push({
      a_id: a.id,
      b_id: b.id,
      a_verir: aVerir,
      b_verir: bVerir,
      tur: 1,
      slot: SLOTLAR[i % SLOTLAR.length],
      a_tamam: tamam,
      b_tamam: tamam,
    });
  }
  if (satirlar.length > 0) await db.from("ayna_esi").insert(satirlar);
  const tamamSayi = satirlar.filter((s) => s.a_tamam).length;
  return { tamam: true, ilerleme: kisiler.length, mesaj: `${satirlar.length} ayna eşi kuruldu, ${tamamSayi} tanesi tamamlandı.` };
}

async function adimMuhur(db: Db): Promise<AdimSonuc> {
  await ayarYaz(db, "reports_visible", "true");
  await ayarYaz(db, "muhur_acik", "true");
  return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: "Raporlar görünür kılındı ve mühür açıldı." };
}

// ── Dispatcher ──
async function adimCalistir(db: Db, adimId: string, ilerleme: number): Promise<AdimSonuc> {
  switch (adimId) {
    case "karakterler": return adimKarakterler(db);
    case "pusula": return adimPusula(db);
    case "eslestirme": return adimEslestirme(db);
    case "kamp_ac": return adimKampAc(db);
    case "dalga1": return adimDalga(db, 1);
    case "gorev1": return adimGorev(db, ilerleme, 1);
    case "yanit1": return adimYanit(db, ilerleme, 1);
    case "dalga2": return adimDalga(db, 2);
    case "gorev2": return adimGorev(db, ilerleme, 2);
    case "yanit2": return adimYanit(db, ilerleme, 2);
    case "oyun": return adimOyun(db);
    case "dalga3": return adimDalga(db, 3);
    case "aynaesi": return adimAynaEsi(db);
    case "muhur": return adimMuhur(db);
    case "tamam": return { tamam: true, ilerleme: SIM_TOPLAM, mesaj: "Simülasyon zaten tamamlandı." };
    default: return { tamam: true, ilerleme: 0, mesaj: "Bilinmeyen adım." };
  }
}

// Bir "İleri" tıkı: mevcut adımı (batch'liyse bir dilim) yürüt, durumu güncelle.
export async function ileriAl(db: Db): Promise<{ durum: SimDurum; mesaj: string }> {
  const durum = await durumOku(db);
  const adim = SIM_ADIMLAR[durum.adim];
  if (!adim || adim.id === "tamam") {
    return { durum, mesaj: "Simülasyon tamamlandı." };
  }
  const sonuc = await adimCalistir(db, adim.id, durum.ilerleme);
  const log = [...durum.log, { i: durum.adim, m: sonuc.mesaj, ts: new Date().toISOString() }];
  let yeni: SimDurum;
  if (sonuc.tamam) {
    yeni = { adim: durum.adim + 1, ilerleme: 0, log };
  } else {
    yeni = { adim: durum.adim, ilerleme: sonuc.ilerleme, log };
  }
  await durumYaz(db, yeni);
  return { durum: yeni, mesaj: sonuc.mesaj };
}

// Sıfırla: TÜM sim verisini sil, küresel ayarları geri al, durumu başa sar.
// GERÇEK katılımcılara dokunmaz (yalnız simulasyon=true kişileri ve onların
// referans verdiği satırlar).
export async function sifirla(db: Db): Promise<{ mesaj: string }> {
  const kisiler = await simKatilimcilar(db);
  const ids = kisiler.map((k) => k.id);
  if (ids.length > 0) {
    await db.from("ratings").delete().in("rater_id", ids);
    await db.from("ratings").delete().in("target_id", ids);
    await db.from("assignments").delete().in("observer_id", ids);
    await db.from("assignments").delete().in("target_id", ids);
    await db.from("missions").delete().in("participant_id", ids);
    await db.from("pusula").delete().in("participant_id", ids);
    await db.from("ayna_esi").delete().in("a_id", ids);
    await db.from("ayna_esi").delete().in("b_id", ids);
    await db.from("participants").delete().eq("simulasyon", true);
  }
  // Küresel kamp durumunu geri al.
  const simdi = new Date().toISOString();
  await db.from("waves").update({ is_open: false, closed_at: simdi }).eq("is_open", true);
  await ayarYaz(db, "ayna_aktif", "false");
  await ayarYaz(db, "reports_visible", "false");
  await ayarYaz(db, "muhur_acik", "false");
  await durumYaz(db, { adim: 0, ilerleme: 0, log: [] });
  return { mesaj: `${ids.length} sim karakter ve tüm sim verisi silindi; ayarlar sıfırlandı.` };
}
