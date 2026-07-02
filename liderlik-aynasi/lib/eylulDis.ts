import "server-only";
import crypto from "crypto";
import type { Db } from "@/lib/degerlendirme";

// [E11] EYLÜL AYNASI DIŞ DEĞERLENDİRME — oturumsuz, tek kullanımlık, 14 gün geçerli
// jetonlar. Kişi en çok 3 jeton üretir (ekibinden 3 kişiye). Dış değerlendirici
// jetonla oturumsuz doldurur; kayıt anonimdir, PII sızmaz.

export const MAX_JETON = 3;
const GECERLILIK_GUN = 14;

// Dış değerlendirmenin 3 kısa sorusu (1-5). Kimlik/PII yok; yalnız liderlik izlenimi.
export const DIS_SORULAR = [
  { kod: "q1", metin: "Bu kişi sözünü tutar, güven verir." },
  { kod: "q2", metin: "Zorlukta öne çıkar, sorumluluk alır." },
  { kod: "q3", metin: "Çevresine enerji/istek katar." },
] as const;

export type JetonDurumu = { token: string; kullanildi: boolean; suresiGecti: boolean };

export async function jetonlarGetir(db: Db, pid: string): Promise<JetonDurumu[]> {
  const { data } = await db
    .from("eylul_dis")
    .select("token, used_at, expires_at")
    .eq("participant_id", pid)
    .order("created_at", { ascending: true });
  const simdi = Date.now();
  return (data ?? []).map((r) => ({
    token: r.token,
    kullanildi: !!r.used_at,
    suresiGecti: Date.parse(r.expires_at) < simdi,
  }));
}

// Eksik jetonları MAX_JETON'a tamamla (mevcutları koru). Üretilen jetonları döner.
export async function jetonlariUret(db: Db, pid: string): Promise<string[]> {
  const mevcut = await jetonlarGetir(db, pid);
  const eksik = Math.max(0, MAX_JETON - mevcut.length);
  const yeni: string[] = [];
  const expires = new Date(Date.now() + GECERLILIK_GUN * 86_400_000).toISOString();
  for (let i = 0; i < eksik; i++) {
    const token = crypto.randomBytes(18).toString("base64url");
    const { error } = await db
      .from("eylul_dis")
      .insert({ token, participant_id: pid, expires_at: expires, kvkk_onay: false });
    if (!error) yeni.push(token);
  }
  return [...mevcut.map((m) => m.token), ...yeni];
}

// Dış değerlendirici için jetonu doğrular; geçerliyse kişinin YALNIZ adını döner.
export async function tokenDogrula(
  db: Db,
  token: string
): Promise<{ gecerli: boolean; sebep?: string; ad?: string }> {
  const t = (token ?? "").trim();
  if (!t) return { gecerli: false, sebep: "gecersiz" };
  const { data } = await db
    .from("eylul_dis")
    .select("participant_id, used_at, expires_at")
    .eq("token", t)
    .maybeSingle();
  if (!data) return { gecerli: false, sebep: "yok" };
  if (data.used_at) return { gecerli: false, sebep: "kullanildi" };
  if (Date.parse(data.expires_at) < Date.now()) return { gecerli: false, sebep: "suresi" };
  const { data: kisi } = await db
    .from("participants")
    .select("full_name")
    .eq("id", data.participant_id)
    .maybeSingle();
  // PII-güvenli: yalnız ilk ad gösterilir.
  return { gecerli: true, ad: (kisi?.full_name ?? "").split(" ")[0] || "Bu kişi" };
}

// Dış değerlendirmeyi kaydeder (KVKK onayı şart), jetonu tek kullanımlık kilitler.
export async function disDegerlendirmeKaydet(
  db: Db,
  token: string,
  cevaplar: Record<string, number>,
  yorum: string,
  kvkkOnay: boolean
): Promise<{ ok: boolean; sebep?: string }> {
  if (!kvkkOnay) return { ok: false, sebep: "kvkk" };
  const kontrol = await tokenDogrula(db, token);
  if (!kontrol.gecerli) return { ok: false, sebep: kontrol.sebep };
  // Cevaplar 1-5 doğrula.
  const temiz: Record<string, number> = {};
  for (const s of DIS_SORULAR) {
    const v = Number(cevaplar?.[s.kod]);
    if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, sebep: "cevap" };
    temiz[s.kod] = v;
  }
  // used_at'i ÖNCE koşullu set et (tek kullanım yarış guard'ı).
  const { data: kilit } = await db
    .from("eylul_dis")
    .update({
      used_at: new Date().toISOString(),
      cevaplar: temiz as never,
      yorum: (yorum ?? "").trim().slice(0, 800) || null,
      kvkk_onay: true,
    })
    .eq("token", token.trim())
    .is("used_at", null)
    .select("token")
    .maybeSingle();
  if (!kilit) return { ok: false, sebep: "kullanildi" };
  return { ok: true };
}
