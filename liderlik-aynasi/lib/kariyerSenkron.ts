import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { KARIYER_RANK, KARIYER_ETIKET } from "@/lib/persona";
import { katilimciyaBildir } from "@/lib/push";
import { telefonNormalize } from "@/lib/telefon";

type Db = ReturnType<typeof supabaseAdmin>;

// [E12] İŞ VERİSİ KÖPRÜSÜ OTOMASYONU — kariyer seviyelerini dış kaynaktan (amare_raw_members,
// AYRI Supabase projesi) senkronlar. SADECE kariyer seviyesi + telefon/e-posta eşleşmesi
// taşınır; başka PII taşınmaz. Env yoksa admin CSV yükleme fallback'i. Kariyer ATLAYANA
// kutlama push'u. Kaynak-bağımsız çekirdek: {eslesme (email/telefon), rank}[] alır.

export type KaynakKayit = { eslesme: string; rank: string };

// Dış rank etiketini uygulamanın kariyer anahtarına indirger (bilinmeyeni atlar).
function rankAnahtari(ham: string): string | null {
  const t = (ham ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (KARIYER_RANK[t]) return t;
  // Yaygın varyant eşlemesi (yıldızlı elmaslar).
  const eslem: Record<string, string> = {
    "1_star_diamond": "1_star_diamond",
    "2_star_diamond": "2_star_diamond",
    "3_star_diamond": "3_star_diamond",
    "presidential": "presidential_diamond",
    "president_diamond": "presidential_diamond",
  };
  return eslem[t] && KARIYER_RANK[eslem[t]] ? eslem[t] : null;
}

export type SenkronSonuc = { taranan: number; guncellenen: number; atlayan: string[] };

// Kaynak-bağımsız senkron: eşleşen katılımcıların kariyeri YÜKSELDİYSE günceller +
// kutlama push'u atar. Düşüş/aynıda dokunmaz.
type Kisi = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  kariyer_seviyesi: string | null;
};

export async function kariyerSenkronCalistir(db: Db, kayitlar: KaynakKayit[]): Promise<SenkronSonuc> {
  const { data: kisiler } = await db
    .from("participants")
    .select("id, full_name, email, phone, kariyer_seviyesi")
    .eq("role", "participant");

  // E-posta + telefon → katılımcı haritası (PII yalnız eşleşme için, saklanmaz).
  const epostaMap = new Map<string, Kisi>();
  const telMap = new Map<string, Kisi>();
  for (const k of (kisiler ?? []) as Kisi[]) {
    if (k.email) epostaMap.set(k.email.trim().toLowerCase(), k);
    const tn = telefonNormalize(k.phone);
    if (tn) telMap.set(tn, k);
  }

  const sonuc: SenkronSonuc = { taranan: kayitlar.length, guncellenen: 0, atlayan: [] };
  for (const kayit of kayitlar) {
    const anahtar = rankAnahtari(kayit.rank);
    if (!anahtar) {
      sonuc.atlayan.push(`bilinmeyen rütbe: ${kayit.rank}`);
      continue;
    }
    const e = (kayit.eslesme ?? "").trim();
    let kisi: Kisi | undefined;
    if (e.includes("@")) {
      kisi = epostaMap.get(e.toLowerCase());
    } else {
      const tn = telefonNormalize(e);
      kisi = tn ? telMap.get(tn) : undefined;
    }
    if (!kisi) continue; // eşleşme yok — sessiz geç

    const eski = kisi.kariyer_seviyesi ? KARIYER_RANK[kisi.kariyer_seviyesi] ?? 0 : 0;
    const yeni = KARIYER_RANK[anahtar];
    if (yeni <= eski) continue; // yalnız YÜKSELİŞ

    await db.from("participants").update({ kariyer_seviyesi: anahtar }).eq("id", kisi.id);
    await katilimciyaBildir(
      db,
      kisi.id,
      "🎉 Tebrikler!",
      `${KARIYER_ETIKET[anahtar] ?? anahtar} oldun. Bu, sahadaki emeğinin karşılığı — aynan seninle gurur duyuyor.`,
      "/"
    ).catch(() => {});
    sonuc.guncellenen++;
  }
  return sonuc;
}

// Dış Supabase (amare_raw_members) — env varsa REST ile çeker; yoksa null (CSV fallback).
// SADECE email + rank alanları istenir (PII minimizasyonu).
export async function amareKayitlariGetir(): Promise<KaynakKayit[] | null> {
  const url = process.env.AMARE_SUPABASE_URL;
  const key = process.env.AMARE_SUPABASE_KEY ?? process.env.AMARE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/amare_raw_members?select=email,rank`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const veri = (await res.json()) as { email?: string; rank?: string }[];
    return veri
      .filter((r) => r.email && r.rank)
      .map((r) => ({ eslesme: String(r.email), rank: String(r.rank) }));
  } catch {
    return null;
  }
}

// CSV fallback: her satır "eslesme,rank" (eslesme = email ya da telefon). Başlık satırı tolere.
export function csvCoz(metin: string): KaynakKayit[] {
  const satirlar = (metin ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const kayitlar: KaynakKayit[] = [];
  for (const s of satirlar) {
    const parca = s.split(/[,;\t]/).map((p) => p.trim());
    if (parca.length < 2) continue;
    const [eslesme, rank] = parca;
    if (/e-?posta|email|rank|r[uü]tbe|telefon/i.test(eslesme)) continue; // başlık satırı
    kayitlar.push({ eslesme, rank });
  }
  return kayitlar;
}
