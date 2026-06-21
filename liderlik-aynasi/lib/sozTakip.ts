import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";

// FAZ B — 90 GÜN TAKİP + DÜRTME ESKALASYONU. Söz mühürlendikten (durum 'sesli')
// sonra kişi günlük check-in yapar. Atmayınca sistem önce kişiyi, sonra
// ŞAHİTLERİ dürter. Şahitler de elle dürtebilir/arayabilir.

// İstanbul yerel günü YYYY-MM-DD.
export function bugunTr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
}

function gunFarki(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

// Günlük check-in: "bugün sözüme/hedefime yönelik bir adım attım mı?"
export async function checkin(
  db: Db,
  pid: string,
  yapildi: boolean,
  notlar: string | null
): Promise<boolean> {
  const { error } = await db.from("soz_takip").upsert(
    {
      participant_id: pid,
      gun: bugunTr(),
      yapildi,
      notlar: (notlar ?? "").trim().slice(0, 500) || null,
    },
    { onConflict: "participant_id,gun" }
  );
  return !error;
}

export type TakipDurum = {
  bugunYapildi: boolean | null;
  seri: number; // bugüne kadar kesintisiz "yapıldı" günü
  toplam: number; // toplam yapıldı günü
  son14: { gun: string; yapildi: boolean | null }[];
  kacirilanGun: number; // son adımdan bu yana kaç gün geçti
};

export async function takipDurum(db: Db, pid: string): Promise<TakipDurum> {
  const bugun = bugunTr();
  const { data } = await db
    .from("soz_takip")
    .select("gun, yapildi")
    .eq("participant_id", pid)
    .order("gun", { ascending: false })
    .limit(120);
  const satirlar = data ?? [];
  const harita = new Map(satirlar.map((s) => [s.gun, s.yapildi]));

  const bugunYapildi = harita.has(bugun) ? !!harita.get(bugun) : null;
  const toplam = satirlar.filter((s) => s.yapildi).length;

  // Seri: bugünden (ya da dünden) geriye kesintisiz "yapıldı".
  let seri = 0;
  for (let i = 0; i < 120; i++) {
    const g = bugunTr(new Date(Date.parse(bugun) - i * 86_400_000));
    const v = harita.get(g);
    if (v) seri++;
    else if (i === 0) continue; // bugün henüz işaretlenmediyse seriyi kırma
    else break;
  }

  // Son 14 gün şeridi.
  const son14: { gun: string; yapildi: boolean | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const g = bugunTr(new Date(Date.parse(bugun) - i * 86_400_000));
    son14.push({ gun: g, yapildi: harita.has(g) ? !!harita.get(g) : null });
  }

  // Son "yapıldı" gününden bu yana kaçırılan gün.
  const sonYapildi = satirlar.find((s) => s.yapildi)?.gun ?? null;
  const kacirilanGun = sonYapildi ? gunFarki(bugun, sonYapildi) : 999;

  return { bugunYapildi, seri, toplam, son14, kacirilanGun };
}

export type TakipEdilen = {
  sahibiId: string;
  ad: string;
  telefon: string | null;
  seri: number;
  kacirilanGun: number;
  sonAdim: string | null;
};

// Bir liderin şahit olduğu kişiler + ilerlemeleri (şahit paneli).
export async function takipEttiklerim(db: Db, witnessId: string): Promise<TakipEdilen[]> {
  const { data: tanikRows } = await db
    .from("soz_tanik")
    .select("soz_sahibi, sahip:participants!soz_tanik_soz_sahibi_fkey(full_name, phone)")
    .eq("witness_id", witnessId)
    .not("imza_at", "is", null);
  const rows = tanikRows ?? [];
  const sonuc: TakipEdilen[] = [];
  for (const r of rows) {
    const durum = await takipDurum(db, r.soz_sahibi);
    const sahip = r.sahip as { full_name: string; phone: string | null } | null;
    const sonAdim = durum.son14.filter((g) => g.yapildi).slice(-1)[0]?.gun ?? null;
    sonuc.push({
      sahibiId: r.soz_sahibi,
      ad: sahip?.full_name ?? "—",
      telefon: sahip?.phone ?? null,
      seri: durum.seri,
      kacirilanGun: durum.kacirilanGun,
      sonAdim,
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
    if (kacti < 2) continue;

    // 1) Kişiyi dürt (günde en fazla 1 kez).
    const sonDurtme = s.son_durtme_at ? Date.parse(s.son_durtme_at) : 0;
    if (simdi - sonDurtme > 20 * 3_600_000) {
      await durtmeGonder(db, s.participant_id, null, "hatirlatma", null);
      await db
        .from("soz")
        .update({ son_durtme_at: new Date().toISOString() })
        .eq("participant_id", s.participant_id);
      kisiSayi++;
    }

    // 2) 4+ gün kaçırma → şahitleri uyar (2 günde en fazla 1 kez).
    if (kacti >= 4) {
      const sonUyari = s.son_tanik_uyari_at ? Date.parse(s.son_tanik_uyari_at) : 0;
      if (simdi - sonUyari > 44 * 3_600_000) {
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

// Kişinin şahit olduğu (imzaladığı) kişi sayısı — şahit paneli linki için.
export async function sahitSayim(db: Db, witnessId: string): Promise<number> {
  const { count } = await db
    .from("soz_tanik")
    .select("id", { count: "exact", head: true })
    .eq("witness_id", witnessId)
    .not("imza_at", "is", null);
  return count ?? 0;
}
