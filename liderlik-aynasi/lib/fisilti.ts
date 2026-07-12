import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";

// ============================================================================
// G5 — FISILTI POSTASI (kilitli sesli takdir + tahmin oyunu)
// ============================================================================
// Günde 1 fısıltı hakkı (kıtlık = değer; market'ten +1). Kişi seç → 15-30 sn
// GERÇEK sesle söyle (isimli/anonim). Alıcıya KİLİTLİ gelir; alıcı 1 görev
// tamamlayınca açılır. Anonimde "Kim söyledi?" 3 şık; doğru bilirse İKİSİNE
// kıvılcım (kivilcim_bonus). Ses GERÇEK kayıt — KVKK saklama/silme kuralına tabi.

const TAHMIN_ODULU = 12;

export async function fisiltiAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "fisilti_acik").maybeSingle();
  return data?.value === "true";
}

function istBugun(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

// Günlük hak: taban 1 + bugün market'ten alınan "fisilti_arti"; kullanılan =
// bugün gönderilen. Kalan = max(0, hak − kullanılan).
export async function gunlukHak(db: Db, pid: string): Promise<{ hak: number; kullanilan: number; kalan: number }> {
  const bugun = istBugun();
  const gunBasi = new Date(`${bugun}T00:00:00+03:00`).toISOString();
  const [{ count: ekstra }, { count: gonderilen }] = await Promise.all([
    db.from("market_islem").select("id", { count: "exact", head: true }).eq("participant_id", pid).eq("urun_kod", "fisilti_arti").gte("created_at", gunBasi),
    db.from("fisilti").select("id", { count: "exact", head: true }).eq("gonderen", pid).gte("created_at", gunBasi),
  ]);
  const hak = 1 + (ekstra ?? 0);
  const kullanilan = gonderilen ?? 0;
  return { hak, kullanilan, kalan: Math.max(0, hak - kullanilan) };
}

// Fısıltı gönder (ses zaten yüklendi; path verilir). Hak yoksa null.
export async function fisiltiGonder(
  db: Db,
  gonderen: string,
  opts: { alici: string; sesPath: string; anonim: boolean; bilirseOgrensin: boolean }
): Promise<{ ok: boolean }> {
  if (opts.alici === gonderen) return { ok: false };
  const { kalan } = await gunlukHak(db, gonderen);
  if (kalan <= 0) return { ok: false };
  const { error } = await db.from("fisilti").insert({
    gonderen,
    alici: opts.alici,
    ses_path: opts.sesPath,
    anonim: opts.anonim,
    bilirse_ogrensin: opts.anonim ? opts.bilirseOgrensin : false,
    kilit: true,
  });
  if (error) return { ok: false };
  await katilimciyaBildir(
    db,
    opts.alici,
    "🔒 Seni bekleyen bir fısıltı var",
    "Biri sana sesli bir şey söyledi. Açmak için 1 görev tamamla.",
    "/fisilti"
  ).catch(() => {});
  return { ok: true };
}

export type GelenFisilti = {
  id: string;
  kilitli: boolean;
  anonim: boolean;
  gonderenAd: string | null; // kilitli/anonim çözülmediyse null
  sesUrl: string | null; // yalnız açıldıysa
  dinlendi: boolean;
  tahminDurumu: "yok" | "dogru" | "yanlis"; // anonim tahmin
};

// Alıcının gelen kutusu — TEMBEL KİLİT AÇMA: fısıltıdan sonra tamamlanmış görev
// varsa açılır (hot-path'e dokunmadan).
export async function gelenFisiltilar(db: Db, pid: string): Promise<GelenFisilti[]> {
  const [{ data: fisiltilar }, { data: gorevler }] = await Promise.all([
    db.from("fisilti").select("id, gonderen, anonim, bilirse_ogrensin, kilit, acildi_at, tahmin_dogru, ses_path, created_at").eq("alici", pid).order("created_at", { ascending: false }),
    db.from("missions").select("responded_at").eq("participant_id", pid).not("responded_at", "is", null),
  ]);
  const yanitlar = (gorevler ?? []).map((g) => Date.parse(g.responded_at as string)).filter((t) => Number.isFinite(t));
  const rows = (fisiltilar ?? []) as {
    id: string; gonderen: string; anonim: boolean; bilirse_ogrensin: boolean; kilit: boolean;
    acildi_at: string | null; tahmin_dogru: boolean | null; ses_path: string; created_at: string;
  }[];

  // Kilidi açılması gerekenleri toplu güncelle.
  const acilacak: string[] = [];
  for (const f of rows) {
    if (f.kilit) {
      const olusma = Date.parse(f.created_at);
      if (yanitlar.some((t) => t > olusma)) acilacak.push(f.id);
    }
  }
  if (acilacak.length > 0) {
    await db.from("fisilti").update({ kilit: false }).in("id", acilacak);
  }

  const gonderenIdler = [...new Set(rows.filter((f) => !f.anonim).map((f) => f.gonderen))];
  const { data: kisiler } = gonderenIdler.length
    ? await db.from("participants").select("id, full_name").in("id", gonderenIdler)
    : { data: [] as { id: string; full_name: string }[] };
  const adMap = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));

  const sonuc: GelenFisilti[] = [];
  for (const f of rows) {
    const kilitli = f.kilit && !acilacak.includes(f.id);
    let sesUrl: string | null = null;
    if (!kilitli) {
      const { data: imza } = await db.storage.from("sesler").createSignedUrl(f.ses_path, 3600);
      sesUrl = imza?.signedUrl ?? null;
    }
    // İsim: anonim değilse hep; anonimse yalnız tahmin doğru + bilirse_ogrensin.
    let gonderenAd: string | null = null;
    if (!f.anonim) gonderenAd = adMap.get(f.gonderen) ?? null;
    else if (f.tahmin_dogru && f.bilirse_ogrensin) {
      const { data: k } = await db.from("participants").select("full_name").eq("id", f.gonderen).maybeSingle();
      gonderenAd = k?.full_name ?? null;
    }
    sonuc.push({
      id: f.id,
      kilitli,
      anonim: f.anonim,
      gonderenAd,
      sesUrl,
      dinlendi: !!f.acildi_at,
      tahminDurumu: f.tahmin_dogru == null ? "yok" : f.tahmin_dogru ? "dogru" : "yanlis",
    });
  }
  return sonuc;
}

// Bekleyen (kilitli veya dinlenmemiş açık) fısıltı sayısı — ana sayfa rozeti.
export async function bekleyenFisiltiSayisi(db: Db, pid: string): Promise<number> {
  const { count } = await db.from("fisilti").select("id", { count: "exact", head: true }).eq("alici", pid).is("acildi_at", null);
  return count ?? 0;
}

// Dinlemeyi işaretle + (anonimse) tahmin şıklarını üret (gerçek + 2 çeldirici).
export async function fisiltiDinle(
  db: Db,
  pid: string,
  fisiltiId: string
): Promise<{ ok: boolean; secenekler?: { id: string; ad: string }[] }> {
  const { data: f } = await db.from("fisilti").select("id, alici, gonderen, anonim, kilit, tahmin_dogru").eq("id", fisiltiId).maybeSingle();
  if (!f || f.alici !== pid || f.kilit) return { ok: false };
  await db.from("fisilti").update({ acildi_at: new Date().toISOString() }).eq("id", fisiltiId).is("acildi_at", null);
  if (!f.anonim || f.tahmin_dogru != null) return { ok: true };

  // 3 şık: gerçek gönderen + 2 rastgele çeldirici (alıcı hariç).
  const { data: adaylar } = await db
    .from("participants")
    .select("id, full_name")
    .eq("role", "participant")
    .neq("id", pid)
    .neq("id", f.gonderen)
    .limit(40);
  const havuz = (adaylar ?? []) as { id: string; full_name: string }[];
  const celdiriciler: { id: string; ad: string }[] = [];
  for (let i = 0; i < 2 && havuz.length > 0; i++) {
    const idx = Math.floor(Math.random() * havuz.length);
    const c = havuz.splice(idx, 1)[0];
    celdiriciler.push({ id: c.id, ad: c.full_name });
  }
  const { data: gonderenKisi } = await db.from("participants").select("full_name").eq("id", f.gonderen).maybeSingle();
  const secenekler = [{ id: f.gonderen, ad: gonderenKisi?.full_name ?? "?" }, ...celdiriciler];
  // Karıştır (index'e göre deterministik değil; rastgele sıra).
  for (let i = secenekler.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [secenekler[i], secenekler[j]] = [secenekler[j], secenekler[i]];
  }
  return { ok: true, secenekler };
}

// "Kim söyledi?" tahmini. Doğruysa ikisine kıvılcım (kivilcim_bonus) + tahmin_dogru.
export async function fisiltiTahmin(
  db: Db,
  pid: string,
  fisiltiId: string,
  tahminId: string
): Promise<{ dogru: boolean; gonderenAd: string | null }> {
  const { data: f } = await db.from("fisilti").select("id, alici, gonderen, anonim, bilirse_ogrensin, tahmin_dogru").eq("id", fisiltiId).maybeSingle();
  if (!f || f.alici !== pid || !f.anonim || f.tahmin_dogru != null) return { dogru: false, gonderenAd: null };
  const dogru = tahminId === f.gonderen;
  await db.from("fisilti").update({ tahmin_dogru: dogru }).eq("id", fisiltiId);
  let gonderenAd: string | null = null;
  if (dogru) {
    await db.from("kivilcim_bonus").insert([
      { participant_id: pid, kaynak: "fisilti_tahmin", deger: TAHMIN_ODULU },
      { participant_id: f.gonderen, kaynak: "fisilti_tahmin", deger: TAHMIN_ODULU },
    ]);
    if (f.bilirse_ogrensin) {
      const { data: k } = await db.from("participants").select("full_name").eq("id", f.gonderen).maybeSingle();
      gonderenAd = k?.full_name ?? null;
    }
  }
  return { dogru, gonderenAd };
}
