import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { ESLESMELI_TURLER } from "@/lib/gorevEslesme";

// ============================================================================
// G6 — HAMLE SIRASI (karşılıklılık borcu + kilitli reveal)
// ============================================================================
// Eşleşmeli görevde (bag/sahit) A tamamlayıp bir cümle yazınca B'ye "hamle
// sırası sende" düşer. B kendi tarafını yazınca İKİSİ de karşı cümleyi görür +
// kıvılcım. B yazmazsa A'nın cümlesi B'ye kilitli kalır (suçlama yok). Görev
// tamamlama hot-path'ine dokunmaz — tik taramasıyla oluşturulur.

const HAMLE_ODULU = 10;

export async function hamleAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "hamle_acik").maybeSingle();
  return data?.value === "true";
}

function ilkCumle(metin: string): string {
  const temiz = metin.trim().replace(/\s+/g, " ");
  const nokta = temiz.search(/[.!?]/);
  const cumle = nokta > 15 ? temiz.slice(0, nokta + 1) : temiz;
  return cumle.slice(0, 160);
}

// Bugün (ya da 21:00 geçtiyse yarın) 21:00 Istanbul.
function sureBitis(simdi: Date): string {
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const bugun21 = new Date(`${bugun}T21:00:00+03:00`);
  if (simdi.getTime() < bugun21.getTime()) return bugun21.toISOString();
  const yarin = new Date(bugun21.getTime() + 24 * 3_600_000);
  return yarin.toISOString();
}

// TARAMA (tik): son 48s'te tamamlanmış eşleşmeli görevlerden hamle üret + B'ye
// bildir. Kendi hatasını yutar.
export async function hamleTaraOlustur(db: Db, simdi: Date): Promise<{ olusan: number }> {
  try {
    const esik = new Date(simdi.getTime() - 48 * 3_600_000).toISOString();
    const { data: gorevler } = await db
      .from("missions")
      .select("id, participant_id, response_text, kind")
      .in("kind", ESLESMELI_TURLER as string[])
      .gte("responded_at", esik)
      .not("response_text", "is", null);
    const rows = (gorevler ?? []) as { id: string; participant_id: string; response_text: string | null; kind: string }[];
    if (rows.length === 0) return { olusan: 0 };
    const missionIdler = rows.map((r) => r.id);

    const [{ data: eslesmeler }, { data: mevcut }] = await Promise.all([
      db.from("gorev_eslesme").select("mission_id, kaynak_id, hedef_id").in("mission_id", missionIdler),
      db.from("hamle").select("mission_id").in("mission_id", missionIdler),
    ]);
    const eslesmeMap = new Map((eslesmeler ?? []).map((e) => [e.mission_id, e]));
    const varOlan = new Set((mevcut ?? []).map((h) => h.mission_id));

    const sb = sureBitis(simdi);
    let olusan = 0;
    for (const m of rows) {
      if (varOlan.has(m.id)) continue;
      const e = eslesmeMap.get(m.id);
      if (!e || !e.hedef_id || !m.response_text) continue;
      if (e.hedef_id === m.participant_id) continue;
      const { error } = await db.from("hamle").insert({
        mission_id: m.id,
        kaynak_id: m.participant_id,
        hedef_id: e.hedef_id,
        kaynak_cumle: ilkCumle(m.response_text),
        sure_bitis: sb,
      });
      if (error) continue;
      olusan++;
      await katilimciyaBildir(
        db,
        e.hedef_id,
        "♟ Hamle sırası sende",
        "Kamp arkadaşın konuşmanızdan bir cümle yazdı. Görmek için sen de kendi tarafını anlat.",
        "/hamle"
      ).catch(() => {});
    }
    return { olusan };
  } catch {
    return { olusan: 0 };
  }
}

export type HamleSatir = {
  id: string;
  rol: "cevapla" | "acildi" | "bekliyor"; // B cevaplamalı / karşılıklı açıldı / A bekliyor
  karsiAd: string;
  benimCumle: string | null;
  karsiCumle: string | null; // yalnız açıldıysa
  sonSaat: string | null; // "HH:MM"
};

// Kişinin hamleleri — hem cevaplaması gerekenler (hedef) hem karşılık verdiği/
// başlattığı açık olanlar.
export async function hamleDurumu(db: Db, pid: string): Promise<HamleSatir[]> {
  const [{ data: hedefOlan }, { data: kaynakOlan }] = await Promise.all([
    db.from("hamle").select("id, kaynak_id, hedef_id, kaynak_cumle, hedef_cumle, sure_bitis").eq("hedef_id", pid).order("created_at", { ascending: false }),
    db.from("hamle").select("id, kaynak_id, hedef_id, kaynak_cumle, hedef_cumle, sure_bitis").eq("kaynak_id", pid).order("created_at", { ascending: false }),
  ]);
  const hepsi = [...(hedefOlan ?? []), ...(kaynakOlan ?? [])] as {
    id: string; kaynak_id: string; hedef_id: string; kaynak_cumle: string; hedef_cumle: string | null; sure_bitis: string;
  }[];
  if (hepsi.length === 0) return [];
  const pidler = [...new Set(hepsi.flatMap((h) => [h.kaynak_id, h.hedef_id]))];
  const { data: kisiler } = await db.from("participants").select("id, full_name").in("id", pidler);
  const ad = new Map((kisiler ?? []).map((k) => [k.id, k.full_name.split(" ")[0]]));
  const simdi = Date.now();

  return hepsi.map((h) => {
    const benHedef = h.hedef_id === pid;
    const acildi = !!h.hedef_cumle;
    const suresiGecti = Date.parse(h.sure_bitis) < simdi;
    let rol: HamleSatir["rol"];
    if (acildi) rol = "acildi";
    else if (benHedef && !suresiGecti) rol = "cevapla";
    else rol = "bekliyor";
    const saat = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(h.sure_bitis));
    return {
      id: h.id,
      rol,
      karsiAd: ad.get(benHedef ? h.kaynak_id : h.hedef_id) ?? "arkadaşın",
      // Kendi cümlem: A isem kaynak_cumle, B isem hedef_cumle.
      benimCumle: benHedef ? h.hedef_cumle : h.kaynak_cumle,
      // Karşı cümle YALNIZ açıldıysa görünür (kilitli reveal).
      karsiCumle: acildi ? (benHedef ? h.kaynak_cumle : h.hedef_cumle) : null,
      sonSaat: rol === "cevapla" ? saat : null,
    };
  });
}

export async function bekleyenHamleSayisi(db: Db, pid: string): Promise<number> {
  const { count } = await db.from("hamle").select("id", { count: "exact", head: true }).eq("hedef_id", pid).is("hedef_cumle", null).gte("sure_bitis", new Date().toISOString());
  return count ?? 0;
}

// B kendi tarafını yazar → karşılıklı reveal + ikisine kıvılcım + A'ya bildir.
export async function hamleYanitla(db: Db, pid: string, hamleId: string, cumle: string): Promise<{ ok: boolean; karsiCumle?: string; karsiAd?: string }> {
  const temiz = cumle.trim().slice(0, 400);
  if (temiz.length < 2) return { ok: false };
  const { data: h } = await db.from("hamle").select("id, kaynak_id, hedef_id, kaynak_cumle, hedef_cumle, sure_bitis").eq("id", hamleId).maybeSingle();
  if (!h || h.hedef_id !== pid || h.hedef_cumle) return { ok: false };
  if (Date.parse(h.sure_bitis) < Date.now()) return { ok: false };
  const { error } = await db.from("hamle").update({ hedef_cumle: temiz, hedef_yanit_at: new Date().toISOString() }).eq("id", hamleId).is("hedef_cumle", null);
  if (error) return { ok: false };
  await db.from("kivilcim_bonus").insert([
    { participant_id: h.kaynak_id, kaynak: "hamle", deger: HAMLE_ODULU },
    { participant_id: h.hedef_id, kaynak: "hamle", deger: HAMLE_ODULU },
  ]);
  const { data: k } = await db.from("participants").select("full_name").eq("id", h.hedef_id).maybeSingle();
  await katilimciyaBildir(db, h.kaynak_id, "♟ Hamlene karşılık geldi", `${(k?.full_name ?? "Arkadaşın").split(" ")[0]} kendi tarafını yazdı — ikiniz de gördünüz.`, "/hamle").catch(() => {});
  return { ok: true, karsiCumle: h.kaynak_cumle };
}

// 20:30 — bugün süresi dolacak, cevaplanmamış hamlelerde hedefe tek nazik
// hatırlatma (settings kilidiyle bir kez). Kendi hatasını yutar — tik'i
// asla düşürmez (kardeş fonksiyonlarla aynı desen).
export async function hamleHatirlat(db: Db, simdi: Date): Promise<void> {
  try {
    const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
    const { error: kilit } = await db.from("settings").insert({ key: `hamle_hatirlat_${bugun}`, value: "1" });
    if (kilit) return;
    const yarinBasi = new Date(`${bugun}T21:00:00+03:00`).toISOString();
    const { data: aciklar } = await db
      .from("hamle")
      .select("hedef_id")
      .is("hedef_cumle", null)
      .gte("sure_bitis", simdi.toISOString())
      .lte("sure_bitis", yarinBasi);
    for (const h of aciklar ?? []) {
      await katilimciyaBildir(db, h.hedef_id, "♟ Hamle sırası sende", "Bir cümlelik karşılık yeter — 21:00'e kadar açık.", "/hamle").catch(() => {});
    }
  } catch {
    /* tik'i asla düşürme */
  }
}
