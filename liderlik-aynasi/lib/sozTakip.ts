import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir, adminlereBildir } from "@/lib/push";
import { seslendir, aynaSesId, sesYapilandirildiMi } from "@/lib/eleven";
import { aynaKarakterAcikMi } from "@/lib/aynaKarakter";
import { taniklar, sozGetir } from "@/lib/soz";
import { haftaBaslangici } from "@/lib/momentum";
import { hedefCekirdek } from "@/lib/hedef";
import { haftalikGorusmeKotasi } from "@/lib/oyunPlani";
import {
  bugunTr,
  takipDurumHesapla,
  eskalasyonKarar,
  type TakipDurum,
} from "@/lib/takipHesap";

// FAZ B — 90 GÜN TAKİP + DÜRTME ESKALASYONU. Söz mühürlendikten (durum 'sesli')
// sonra kişi günlük check-in yapar. Atmayınca sistem önce kişiyi, sonra
// ŞAHİTLERİ dürter. Şahitler de elle dürtebilir/arayabilir.
// Seri/kaçırma matematiği ve eskalasyon eşikleri lib/takipHesap.ts'de (saf,
// simülasyonla test edilen tek doğruluk kaynağı); burada yalnız DB erişimi var.

export { bugunTr };
export type { TakipDurum };

// Günlük check-in: "bugün sözüme/hedefime yönelik bir adım attım mı?" +
// (FAZ 3/4) kaç görüşme yapıldı (haftalık kota barı) + kaç kişisel KAYIT
// alındı (Kayıt Zili — kutlama + şahitlere müjde push'u, bkz. kayitBildir).
export async function checkin(
  db: Db,
  pid: string,
  yapildi: boolean,
  notlar: string | null,
  gorusmeSayisi?: number | null,
  kayitSayisi?: number
): Promise<boolean> {
  const { error } = await db.from("soz_takip").upsert(
    {
      participant_id: pid,
      gun: bugunTr(),
      yapildi,
      notlar: (notlar ?? "").trim().slice(0, 500) || null,
      gorusme_sayisi:
        typeof gorusmeSayisi === "number" && gorusmeSayisi >= 0
          ? Math.min(999, Math.round(gorusmeSayisi))
          : null,
      kayit_sayisi:
        typeof kayitSayisi === "number" && kayitSayisi >= 0 ? Math.min(99, Math.round(kayitSayisi)) : 0,
    },
    { onConflict: "participant_id,gun" }
  );
  return !error;
}

// Bu haftanın (Pazartesi'den bugüne) toplam görüşme + kayıt sayısı — haftalık
// kota barı ve momentum hesabı için TEK doğruluk kaynağı.
export async function haftalikSayilar(
  db: Db,
  pid: string
): Promise<{ gorusmeToplam: number; kayitToplam: number }> {
  const haftaBasi = haftaBaslangici(new Date());
  const { data } = await db
    .from("soz_takip")
    .select("gorusme_sayisi, kayit_sayisi")
    .eq("participant_id", pid)
    .gte("gun", haftaBasi);
  let gorusmeToplam = 0;
  let kayitToplam = 0;
  for (const r of data ?? []) {
    gorusmeToplam += r.gorusme_sayisi ?? 0;
    kayitToplam += r.kayit_sayisi ?? 0;
  }
  return { gorusmeToplam, kayitToplam };
}

// KAYIT ZİLİ (#6) — kişi kayıt aldığında şahitlerine ANINDA müjde push'u.
// İmza şartı yok: henüz imzalamamış şahit de haberi almalı.
export async function kayitBildir(db: Db, pid: string, ad: string): Promise<void> {
  const ilkAd = ad.split(" ")[0];
  // Yalnız KABUL etmiş şahitler ilerleme haberini alır (bekleyen/reddeden değil).
  const tanikList = (await taniklar(db, pid)).filter((t) => t.durum === "kabul");
  for (const t of tanikList) {
    await katilimciyaBildir(
      db,
      t.witness_id,
      "🔔 Kayıt Zili",
      `${ilkAd} yeni bir kayıt aldı! Şahidi olduğun sözünde ilerliyor.`,
      "/sahitlik"
    );
  }
}

// [FAZ 8 · Madde 16] ŞAHİDE İYİ HABER: kişi haftalık görüşme kotasını doldurunca
// şahitlerine POZİTİF haber. Mevcut şahit push'ları çoğunlukla "takıldı/sessiz"
// idi; dengeyi iyi habere çevirir. Haftada bir (Cuma momentum bloğundan).
export async function kotaDolduBildir(db: Db, pid: string, ad: string): Promise<void> {
  const ilkAd = ad.split(" ")[0];
  const tanikList = (await taniklar(db, pid)).filter((t) => t.durum === "kabul");
  for (const t of tanikList) {
    await katilimciyaBildir(
      db,
      t.witness_id,
      "🎯 Şahidin hedefte",
      `${ilkAd} bu hafta görüşme kotasını doldurdu — şahidi olduğun sözde güçlü ilerliyor.`,
      "/sahitlik"
    ).catch(() => {});
  }
}

export async function takipDurum(db: Db, pid: string): Promise<TakipDurum> {
  const { data } = await db
    .from("soz_takip")
    .select("gun, yapildi")
    .eq("participant_id", pid)
    .order("gun", { ascending: false })
    .limit(120);
  return takipDurumHesapla(data ?? [], bugunTr());
}

export type TakipEdilen = {
  sahibiId: string;
  ad: string;
  telefon: string | null;
  seri: number;
  kacirilanGun: number;
  sonAdim: string | null;
  // [Faz 9] Şahit Karnesi — haftalık kota gerçekleşmesi (varsa).
  haftaGorusme: number;
  haftaKota: number | null;
  // [Şahitlik geliştirme #1] Foto (henüz imzalanmamış storage path — page.tsx
  // imzalar) — "150 kişilik organizasyonda isimden tanımıyorum" isteğinin devamı.
  profilFotoPath: string | null;
  // [Şahitlik geliştirme #2] Kişinin mühürlü sözü — şahit KİME şahit olduğunu
  // ve neye söz verdiğini unutmasın. Ses path'i de page.tsx imzalar.
  sozMetni: string | null;
  sozSesPath: string | null;
  sozAksiyonlari: { metin: string; ufuk: string }[];
  // [Şahitlik geliştirme #4] Bu hafta alınan kayıt sayısı.
  haftaKayit: number;
  // [Şahitlik geliştirme #5] Bugün bu kişiye dürtme/teşvik gönderildi mi —
  // sunucudan (sayfa yenilense de kalıcı; client state'e güvenmez).
  bugunGonderildi: boolean;
  // [Şahitlik geliştirme #3] Son 14 gün mini şerit — /takip'teki aynı veri.
  son14: { gun: string; yapildi: boolean | null }[];
  // [B#18] Karşılıklı şahitlik — bu kişi de benim sözüme şahit.
  karsilikli: boolean;
};

// Bir liderin şahit olduğu kişiler + ilerlemeleri (şahit paneli).
export async function takipEttiklerim(db: Db, witnessId: string): Promise<TakipEdilen[]> {
  const [{ data: tanikRows }, { data: bugunDurtmeler }, { data: banaSahitler }] = await Promise.all([
    db
      .from("soz_tanik")
      .select(
        "soz_sahibi, sahip:participants!soz_tanik_soz_sahibi_fkey(full_name, phone, profil_foto_path)"
      )
      .eq("witness_id", witnessId)
      .not("imza_at", "is", null),
    db
      .from("soz_durtme")
      .select("sahibi")
      .eq("gonderen", witnessId)
      .in("tip", ["hatirlatma", "tesvik"])
      .gte("created_at", new Date(`${bugunTr()}T00:00:00+03:00`).toISOString()),
    // [B#18] Karşılıklılık: BENİM sözüme şahit olan (kabul etmiş) kişiler.
    db.from("soz_tanik").select("witness_id").eq("soz_sahibi", witnessId).not("imza_at", "is", null),
  ]);
  const bugunGonderildiSet = new Set((bugunDurtmeler ?? []).map((d) => d.sahibi));
  const banaSahitSet = new Set((banaSahitler ?? []).map((r) => r.witness_id));
  const rows = tanikRows ?? [];
  const sonuc: TakipEdilen[] = [];
  for (const r of rows) {
    const [durum, hafta, hedef, soz] = await Promise.all([
      takipDurum(db, r.soz_sahibi),
      haftalikSayilar(db, r.soz_sahibi),
      hedefCekirdek(db, r.soz_sahibi),
      sozGetir(db, r.soz_sahibi),
    ]);
    const sahip = r.sahip as
      | { full_name: string; phone: string | null; profil_foto_path: string | null }
      | null;
    const sonAdim = durum.son14.filter((g) => g.yapildi).slice(-1)[0]?.gun ?? null;
    sonuc.push({
      sahibiId: r.soz_sahibi,
      ad: sahip?.full_name ?? "—",
      telefon: sahip?.phone ?? null,
      seri: durum.seri,
      kacirilanGun: durum.kacirilanGun,
      sonAdim,
      haftaGorusme: hafta.gorusmeToplam,
      haftaKota: haftalikGorusmeKotasi(hedef?.plan?.haftalikSaat ?? null),
      profilFotoPath: sahip?.profil_foto_path ?? null,
      sozMetni: soz?.metin ?? null,
      sozSesPath: soz?.voice_path ?? null,
      sozAksiyonlari: soz?.aksiyonlar ?? [],
      haftaKayit: hafta.kayitToplam,
      bugunGonderildi: bugunGonderildiSet.has(r.soz_sahibi),
      son14: durum.son14,
      // [B#18] Bu kişi de senin sözüne şahit → karşılıklı bağ (🔁 rozeti).
      karsilikli: banaSahitSet.has(r.soz_sahibi),
    });
  }
  return sonuc.sort((a, b) => b.kacirilanGun - a.kacirilanGun);
}

// Şahit (ya da sistem) dürtmesi: günlüğe yaz + kişiye push.
export async function durtmeGonder(
  db: Db,
  sahibi: string,
  gonderen: string | null,
  tip: string,
  mesaj: string | null,
  gonderenAd?: string
): Promise<void> {
  await db.from("soz_durtme").insert({ sahibi, gonderen, tip, mesaj: mesaj?.slice(0, 500) ?? null });
  const baslik =
    tip === "tesvik" ? "💪 Bir liderin sana inanıyor" : "👋 Sözünü hatırla";
  const govde =
    mesaj?.trim() ||
    (gonderenAd
      ? `${gonderenAd} seni hatırladı — bugün sözüne bir adım at.`
      : "Bugün hedefine yönelik küçük bir adım at.");
  await katilimciyaBildir(db, sahibi, baslik, govde, "/takip");
}

// ESKALASYON TARAMASI (tik tarafından saatlik çağrılır). Mühürlü sözü olup
// adımını kaçıranları bulur: 2+ gün → kişiyi dürt; 4+ gün → şahitleri uyar.
export async function eskalasyonTara(db: Db): Promise<{ kisi: number; tanik: number }> {
  const { data: sozler } = await db
    .from("soz")
    .select("participant_id, son_durtme_at, son_tanik_uyari_at, kayit_at")
    .eq("durum", "sesli");
  if (!sozler?.length) return { kisi: 0, tanik: 0 };

  const simdi = Date.now();
  let kisiSayi = 0;
  let tanikSayi = 0;

  for (const s of sozler) {
    const durum = await takipDurum(db, s.participant_id);
    const kacti = durum.kacirilanGun;
    const karar = eskalasyonKarar(
      kacti,
      s.son_durtme_at,
      s.son_tanik_uyari_at,
      simdi
    );

    // 1) Kişiyi dürt (günde en fazla 1 kez).
    if (karar.kisiDurt) {
      await durtmeGonder(db, s.participant_id, null, "hatirlatma", null);
      await db
        .from("soz")
        .update({ son_durtme_at: new Date().toISOString() })
        .eq("participant_id", s.participant_id);
      kisiSayi++;
    }

    // 2) 4+ gün kaçırma → şahitleri uyar (~2 günde en fazla 1 kez).
    if (karar.tanikUyar) {
      const [{ data: taniklar }, { data: kisi }] = await Promise.all([
        db.from("soz_tanik").select("witness_id").eq("soz_sahibi", s.participant_id).not("imza_at", "is", null),
        db.from("participants").select("full_name").eq("id", s.participant_id).maybeSingle(),
      ]);
      const ad = (kisi?.full_name ?? "Birisi").split(" ")[0];
      for (const tn of taniklar ?? []) {
        await katilimciyaBildir(
          db,
          tn.witness_id,
          "🤝 Şahidi olduğun kişi takıldı",
          `${ad} ${kacti} gündür adımını atmadı. Onu ara, dürt, teşvik et.`,
          "/sahitlik"
        );
      }
      await db
        .from("soz")
        .update({ son_tanik_uyari_at: new Date().toISOString() })
        .eq("participant_id", s.participant_id);
      tanikSayi++;

      // [Faz 11 — 90 gün motoru #15] 14+ gün sessizlik: kapanış panelindeki
      // "elle ara" basamağı (churnMerdiveni) yalnız admin BAKARSA görünüyordu —
      // artık aynı taramada (aynı throttle penceresiyle) admin'e OTOMATİK haber
      // gider. Mevcut churn panelini tekrar yazmaz, yalnız otomatik uyarı katar.
      if (kacti >= 14) {
        await adminlereBildir(
          db,
          "🚨 14+ gün sessizlik",
          `${ad} ${kacti} gündür sözüne adım atmadı, şahitleri de yanıtsız. Elle ara.`,
          "/admin/kapanis"
        );
      }
    }
  }
  return { kisi: kisiSayi, tanik: tanikSayi };
}

// Kişi bir söz vermiş mi (takip akışı için).
export async function sozTakipAktif(db: Db, pid: string): Promise<boolean> {
  const { data } = await db
    .from("soz")
    .select("durum")
    .eq("participant_id", pid)
    .maybeSingle();
  return data?.durum === "sesli";
}

// [FAZ 7 · Madde 10] AKŞAM ÇEKİN ÇIPASI — 90 gün motorunun #1 boşluğu: günlük
// check-in için tek POZİTİF hatırlatma yoktu (yalnız 2+ gün kaçırınca ceza
// gelirdi). Akşam, mühürlü sözü olan ama BUGÜN henüz işaretlememiş herkese
// nazik bir "bugünü işaretle" push'u — ceza motorundan ÖNCE gelen yapıcı dokunuş.
export async function checkinCipasi(db: Db): Promise<{ gonderilen: number }> {
  const bugun = bugunTr();
  const { data: sozler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
  const aktifler = (sozler ?? []).map((s) => s.participant_id);
  if (aktifler.length === 0) return { gonderilen: 0 };
  const { data: bugunler } = await db
    .from("soz_takip")
    .select("participant_id")
    .eq("gun", bugun)
    .in("participant_id", aktifler);
  const yapanSet = new Set((bugunler ?? []).map((b) => b.participant_id));
  let gonderilen = 0;
  for (const pid of aktifler) {
    if (yapanSet.has(pid)) continue;
    await katilimciyaBildir(
      db,
      pid,
      "🌙 Bugünü işaretle",
      "Bugün sözüne yönelik bir adım attın mı? Aynana tek dokunuşla işaretle.",
      "/takip"
    ).catch(() => {});
    gonderilen++;
  }
  return { gonderilen };
}

// KAPANIŞ Faz D · öneri 10 — SÖZ KARNESİ: kampta verilen sözlerin 90 gün
// boyunca nasıl tutulduğunu HAFTALIK olarak Emre'ye (adminlere) raporlar. Zincirin
// son halkası: 3 gün → eğitim → söz → 90 gün → Emre'ye geri ölçüm. Verimli
// (2 sorgu, agregat); tik'ten haftada bir (Pazartesi, kilit deseniyle) çağrılır.
export async function sozKarnesiGonder(db: Db): Promise<{ gonderildi: boolean }> {
  try {
    const { data: sozler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
    const aktifler = (sozler ?? []).map((s) => s.participant_id);
    if (aktifler.length === 0) return { gonderildi: false };

    // [F#45] Trend için 14 gün çek; bu hafta (son 7) ile geçen haftayı ayır.
    const yediGunOnce = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const ondortGunOnce = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const { data: takipler } = await db
      .from("soz_takip")
      .select("participant_id, gun, yapildi")
      .in("participant_id", aktifler)
      .gte("gun", ondortGunOnce);

    const adimAtan = new Set<string>(); // bu hafta (son 7) en az 1 gün "yaptım"
    const adimAtanGecen = new Set<string>(); // geçen hafta (8-14 gün önce)
    const sonAktivite = new Map<string, string>(); // pid → en son işaretlenen gün
    for (const t of takipler ?? []) {
      if (t.yapildi) {
        if (t.gun >= yediGunOnce) adimAtan.add(t.participant_id);
        else if (t.gun >= ondortGunOnce) adimAtanGecen.add(t.participant_id);
      }
      const onceki = sonAktivite.get(t.participant_id);
      if (!onceki || t.gun > onceki) sonAktivite.set(t.participant_id, t.gun);
    }
    const dortGunOnce = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10);
    const sessiz = aktifler.filter((pid) => {
      const son = sonAktivite.get(pid);
      return !son || son < dortGunOnce;
    }).length;

    const toplam = aktifler.length;
    const tutan = adimAtan.size;
    const oran = Math.round((tutan / toplam) * 100);
    const oranGecen = Math.round((adimAtanGecen.size / toplam) * 100);
    // Trend oku: geçen haftaya göre yön.
    const fark = oran - oranGecen;
    const trend =
      fark > 3
        ? ` 📈 Geçen hafta %${oranGecen} → bu hafta %${oran} (yükseliyor).`
        : fark < -3
          ? ` 📉 Geçen hafta %${oranGecen} → bu hafta %${oran} (düşüyor — dikkat).`
          : ` ➡️ Geçen haftayla benzer (%${oranGecen}→%${oran}).`;
    const govde =
      `Kapanışta verilen ${toplam} söz 90 günde yaşıyor. Bu hafta ${tutan} kişi (%${oran}) sözüne en az bir adım attı` +
      (sessiz > 0 ? `; ${sessiz} kişi 4+ gündür sessiz.` : ".") +
      trend;

    await adminlereBildir(db, "📊 Söz Karnesi (haftalık)", govde, "/admin/kapanis");
    return { gonderildi: true };
  } catch {
    return { gonderildi: false };
  }
}

// Kişinin KENDİ sözüne seçtiği şahit sayısı — REDDEDENLER HARİÇ (bekliyor + kabul).
// Kabul şart değil, davet yeterli; ama reddeden slot tutmaz → sahibi yerine yeni
// birini seçer. 90 gün yolculuğu bu sayı hedefe ulaşmadan AÇILMAZ (şahit zorunlu).
export async function secilenSahitSayisi(db: Db, pid: string): Promise<number> {
  const { count } = await db
    .from("soz_tanik")
    .select("id", { count: "exact", head: true })
    .eq("soz_sahibi", pid)
    .neq("durum", "ret");
  return count ?? 0;
}

// Kişinin sözüne davet edilip REDDEDEN şahit sayısı — "biri kabul etmedi, yeni
// şahit seç" uyarısı için (0 ise uyarı yok).
export async function reddedenSahitSayisi(db: Db, pid: string): Promise<number> {
  const { count } = await db
    .from("soz_tanik")
    .select("id", { count: "exact", head: true })
    .eq("soz_sahibi", pid)
    .eq("durum", "ret");
  return count ?? 0;
}

// [E#41] SESSİZLEŞENE AYNA'NIN SESİNDEN KİŞİSEL MESAJ — 7+ gün adım atmayana,
// markanın (AYNA'nın) gerçek sesinden kısa, SICAK, suçlamasız bir dönüş daveti.
// "Küs değil özleyen" ton (aynaKarakter ilkesi). Haftada bir (tik, Çarşamba,
// kilitle) + kişi başına 6 gün throttle (settings) + TTS maliyeti için CAP.
// Kill switch: ayna_karakter_acik=false → çalışmaz. Ses yapılandırılmamışsa atlar.
const SESSIZ_ESIK_GUN = 7;
const SESSIZ_CAP = 10; // tik başına üst sınır (TTS süresi/maliyeti) — fazlası log'lanır

function sessizDonusMetni(isim: string): string {
  return `${isim}... Ben AYNA. Birkaç gündür buralarda yoktun ve fark ettim, çünkü seni takip ediyorum. Kızmadım — merak ettim, açıkçası biraz da özledim. Verdiğin söz hâlâ burada, tam da bıraktığın yerde seni bekliyor. Ben de buradayım. Bugün küçücük bir adım at, bu kadarı yeter. Serini yeniden başlat; gerisini birlikte hallederiz.`;
}

export async function sessizDonusSesi(db: Db): Promise<{ gonderilen: number; atlanan: number }> {
  if (!sesYapilandirildiMi()) return { gonderilen: 0, atlanan: 0 };
  if (!(await aynaKarakterAcikMi(db))) return { gonderilen: 0, atlanan: 0 };
  const { data: sozluler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
  if (!sozluler?.length) return { gonderilen: 0, atlanan: 0 };

  const simdi = Date.now();
  const adaylar: { pid: string; gun: number }[] = [];
  for (const s of sozluler) {
    const durum = await takipDurum(db, s.participant_id);
    if (durum.kacirilanGun < SESSIZ_ESIK_GUN || durum.kacirilanGun >= 900) continue;
    // Haftalık throttle: son sesli mesajdan 6+ gün geçmiş olmalı.
    const { data: son } = await db
      .from("settings")
      .select("value")
      .eq("key", `sessiz_ses_${s.participant_id}`)
      .maybeSingle();
    if (son?.value && simdi - Date.parse(son.value) < 6 * 86_400_000) continue;
    adaylar.push({ pid: s.participant_id, gun: durum.kacirilanGun });
  }
  if (adaylar.length === 0) return { gonderilen: 0, atlanan: 0 };
  adaylar.sort((a, b) => b.gun - a.gun);
  const secilen = adaylar.slice(0, SESSIZ_CAP);
  const atlanan = Math.max(0, adaylar.length - SESSIZ_CAP);

  const { data: kisiler } = await db
    .from("participants")
    .select("id, full_name")
    .in("id", secilen.map((a) => a.pid));
  const adMap = new Map((kisiler ?? []).map((k) => [k.id, (k.full_name ?? "").split(" ")[0] || "Lider"]));

  let gonderilen = 0;
  for (const a of secilen) {
    const isim = adMap.get(a.pid) ?? "Lider";
    try {
      const buf = await seslendir(aynaSesId(), sessizDonusMetni(isim));
      const yol = `${a.pid}/sessiz_donus.mp3`;
      const { error } = await db.storage
        .from("sesler")
        .upload(yol, buf, { contentType: "audio/mpeg", upsert: true });
      if (error) continue;
      await db
        .from("settings")
        .upsert({ key: `sessiz_ses_${a.pid}`, value: new Date().toISOString() }, { onConflict: "key" });
      await katilimciyaBildir(
        db,
        a.pid,
        "🎧 AYNA senin için bir şey kaydetti",
        `${isim}, seni özledim — 30 saniyeni ayır.`,
        "/takip"
      ).catch(() => {});
      gonderilen++;
    } catch {
      // bu kişiyi atla, diğerlerine devam (tik'i asla düşürme)
    }
  }
  return { gonderilen, atlanan };
}

// [B#11] ŞAHİT DAVET HATIRLATICISI — davet → kabul/ret akışında (PR #823) bir
// davet "bekliyor"da unutulabiliyor. Günde bir (tik'ten, kilitle) taranır:
//  • 2 gün yanıtsız → ŞAHİDE nazik dürtme ("seni bekleyen bir söz var").
//  • 5 gün yanıtsız → SAHİBE "yanıt vermedi, istersen yerine başka şahit seç" (#12).
// Migration yok: eşikler created_at'ten gün farkıyla; tik günde bir çalıştığı için
// her davet her eşiği tam bir kez geçer (spam yok, ekstra kolon gerekmez).
export async function sahitDavetHatirlat(db: Db): Promise<{ sahit: number; sahibi: number }> {
  const { data: bekleyenler } = await db
    .from("soz_tanik")
    .select("soz_sahibi, witness_id, created_at")
    .eq("durum", "bekliyor");
  if (!bekleyenler?.length) return { sahit: 0, sahibi: 0 };

  const idler = [...new Set(bekleyenler.flatMap((b) => [b.soz_sahibi, b.witness_id]))];
  const { data: kisiler } = await db.from("participants").select("id, full_name").in("id", idler);
  const ilkAd = new Map((kisiler ?? []).map((k) => [k.id, (k.full_name ?? "").split(" ")[0] || "Bir lider"]));

  const simdi = Date.now();
  let sahit = 0;
  let sahibi = 0;
  for (const b of bekleyenler) {
    const gun = (simdi - new Date(b.created_at).getTime()) / 86_400_000;
    if (gun >= 2 && gun < 3) {
      await katilimciyaBildir(
        db,
        b.witness_id,
        "🤝 Bir söz seni bekliyor",
        `${ilkAd.get(b.soz_sahibi)} seni sözüne şahit gösterdi. Sözünü aç, gör ve kabul/ret ver.`,
        "/sahitlik"
      ).catch(() => {});
      sahit++;
    } else if (gun >= 5 && gun < 6) {
      await katilimciyaBildir(
        db,
        b.soz_sahibi,
        "🤝 Şahidin henüz yanıt vermedi",
        `${ilkAd.get(b.witness_id)} 5 gündür davetini yanıtlamadı. İstersen yerine başka bir lider seç.`,
        "/sozum"
      ).catch(() => {});
      sahibi++;
    }
  }
  return { sahit, sahibi };
}

// Kişinin şahit olduğu (imzaladığı) kişi sayısı — şahit paneli linki için.
export async function sahitSayim(db: Db, witnessId: string): Promise<number> {
  const { count } = await db
    .from("soz_tanik")
    .select("id", { count: "exact", head: true })
    .eq("witness_id", witnessId)
    .not("imza_at", "is", null);
  return count ?? 0;
}

// [Şahitlik geliştirme #8] PAZARTESİ ŞAHİT ÖZETİ — tik tarafından haftalık
// (bir kez, kilit deseniyle) çağrılır. Her şahide TEK bir push: takip ettiği
// kişilerden kaçı bu hafta kotasını doldurdu + kim birkaç gündür sessiz.
// Şahitliği "imza günü unutulan" bir kâğıttan haftalık 2 dakikalık aktif role
// çevirir.
export async function sahitOzetiGonder(db: Db): Promise<{ gonderilen: number }> {
  const { data: sahitRows } = await db
    .from("soz_tanik")
    .select("witness_id")
    .not("imza_at", "is", null);
  const witnessIds = [...new Set((sahitRows ?? []).map((r) => r.witness_id))];

  let gonderilen = 0;
  for (const wid of witnessIds) {
    const kisiler = await takipEttiklerim(db, wid);
    if (kisiler.length === 0) continue;

    const kotaDolduran = kisiler.filter(
      (k) => k.haftaKota != null && k.haftaGorusme >= k.haftaKota
    ).length;
    const takilanlar = kisiler.filter((k) => k.kacirilanGun >= 2);

    let govde = `Şahit olduğun ${kisiler.length} kişiden ${kotaDolduran} tanesi bu hafta kotasını doldurdu.`;
    if (takilanlar.length > 0) {
      const isimler = takilanlar.map((k) => k.ad.split(" ")[0]).join(", ");
      govde += ` ${isimler} birkaç gündür sessiz — bu hafta bir ara.`;
    }

    await katilimciyaBildir(db, wid, "📋 Haftalık Şahit Özeti", govde, "/sahitlik");
    gonderilen++;
  }
  return { gonderilen };
}
