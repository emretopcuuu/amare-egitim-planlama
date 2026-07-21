import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir, adminlereBildir } from "@/lib/push";
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
};

// Bir liderin şahit olduğu kişiler + ilerlemeleri (şahit paneli).
export async function takipEttiklerim(db: Db, witnessId: string): Promise<TakipEdilen[]> {
  const [{ data: tanikRows }, { data: bugunDurtmeler }] = await Promise.all([
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
  ]);
  const bugunGonderildiSet = new Set((bugunDurtmeler ?? []).map((d) => d.sahibi));
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

    const yediGunOnce = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const { data: takipler } = await db
      .from("soz_takip")
      .select("participant_id, gun, yapildi")
      .in("participant_id", aktifler)
      .gte("gun", yediGunOnce);

    const adimAtan = new Set<string>(); // bu hafta en az 1 gün "yaptım"
    const sonAktivite = new Map<string, string>(); // pid → en son işaretlenen gün
    for (const t of takipler ?? []) {
      if (t.yapildi) adimAtan.add(t.participant_id);
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
    const govde =
      `Kapanışta verilen ${toplam} söz 90 günde yaşıyor. Bu hafta ${tutan} kişi (%${oran}) sözüne en az bir adım attı` +
      (sessiz > 0 ? `; ${sessiz} kişi 4+ gündür sessiz.` : ".");

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
