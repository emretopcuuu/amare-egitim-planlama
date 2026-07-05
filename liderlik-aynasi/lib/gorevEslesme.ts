import "server-only";
import type { Db } from "@/lib/degerlendirme";

// FAZ 1.3 — EŞLEŞME DENGELEYİCİ. 29 kişilik havuz küçük: isimli/eşleşmeli görev
// türleri (bag/tanık/çift) bu modül olmadan aynı birkaç kişiyi tekrar tekrar
// eşleştirir. Kurallar: kişi başı günde en fazla GUNLUK_HEDEF_UST kez "hedef"
// olma, aynı çift kampta bir kez (gorev_eslesme geçmişi), admin engelleri
// (excluded_pairs), hiç eşleşmemişe öncelik. FAZ 2+ bu modülü gorevUret/tik.ts
// akışına bağlar — bu dosya tek başına hiçbir görevi değiştirmez.

export type EslesmeAday = { id: string; full_name: string; team: string | null };

const GUNLUK_HEDEF_UST = 2;

// FAZ 2.1 — eşleşmeli sayılan görev türleri (kota hesaplarında kullanılır).
// FAZ 3, "tanik"/"cift" gibi yeni türler eklediğinde bu listeye katılır.
// Özellik 5 — "sahit": bag eşleşmesinin şahit varyantı da eşleşmeli sayılır.
export const ESLESMELI_TURLER: readonly string[] = ["bag", "sahit"];

/** Verilen aday havuzundan dengeli kotalara uyan bir "hedef" seçer.
 * `tercihEdilenId` verilirse (ör. karsilasma.ts'in tamamlayıcı persona
 * eşleşmesi) ve dengeleyici kısıtlarını geçerse ÖNCELİKLİ olarak o döner;
 * geçmezse ya da verilmezse dengeli seçime düşülür. Uygun aday yoksa null
 * döner (çağıran isimsiz moda düşmeli). */
export async function eslesmeHedefiSec(
  db: Db,
  kaynakId: string,
  adaylar: EslesmeAday[],
  simdi = new Date(),
  tercihEdilenId?: string | null
): Promise<EslesmeAday | null> {
  const havuz = adaylar.filter((a) => a.id !== kaynakId);
  if (havuz.length === 0) return null;

  const gunBasiIso = new Date(simdi.getTime() - 24 * 3_600_000).toISOString();
  const [gecmisSonuc, disliSonuc, gunlukSonuc, tumZamanlarSonuc] = await Promise.all([
    // Bu kaynağın kampta şimdiye kadar eşleştiği herkes — aynı çift bir kez.
    db.from("gorev_eslesme").select("hedef_id").eq("kaynak_id", kaynakId),
    // Admin'in kalıcı olarak dışladığı çiftler (çift yönlü).
    db.from("excluded_pairs").select("a_id, b_id").or(`a_id.eq.${kaynakId},b_id.eq.${kaynakId}`),
    // Son 24 saatte kaç kez "hedef" olmuşlar — günlük tavan.
    db.from("gorev_eslesme").select("hedef_id").gte("created_at", gunBasiIso),
    // Kamp boyunca toplam kaç kez "hedef" olmuşlar — hiç eşleşmemişe öncelik.
    db
      .from("gorev_eslesme")
      .select("hedef_id")
      .in("hedef_id", havuz.map((a) => a.id)),
  ]);

  const gecmisSet = new Set((gecmisSonuc.data ?? []).map((r) => r.hedef_id));
  const disliSet = new Set(
    (disliSonuc.data ?? []).flatMap((r) => [r.a_id, r.b_id]).filter((id) => id !== kaynakId)
  );
  const gunlukSayac = new Map<string, number>();
  for (const r of gunlukSonuc.data ?? []) {
    gunlukSayac.set(r.hedef_id, (gunlukSayac.get(r.hedef_id) ?? 0) + 1);
  }
  const toplamSayac = new Map<string, number>();
  for (const r of tumZamanlarSonuc.data ?? []) {
    toplamSayac.set(r.hedef_id, (toplamSayac.get(r.hedef_id) ?? 0) + 1);
  }

  const uygunlar = havuz.filter(
    (a) =>
      !gecmisSet.has(a.id) &&
      !disliSet.has(a.id) &&
      (gunlukSayac.get(a.id) ?? 0) < GUNLUK_HEDEF_UST
  );
  if (uygunlar.length === 0) return null;

  // Tercih edilen aday (persona-tamamlayıcı eşleşme) dengeleyici kısıtlarını
  // geçtiyse önceliklidir — persona uyumu + dengeli dağıtım BİRLİKTE çalışır.
  if (tercihEdilenId) {
    const tercihEdilen = uygunlar.find((a) => a.id === tercihEdilenId);
    if (tercihEdilen) return tercihEdilen;
  }

  // Hiç eşleşmemişe (ya da en az eşleşmişe) öncelik; eşitlikte deterministik
  // (kaynak+aday tohumlu) sırayla dengeli dağıt.
  const tohum = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const siraliUygunlar = [...uygunlar].sort((a, b) => {
    const fark = (toplamSayac.get(a.id) ?? 0) - (toplamSayac.get(b.id) ?? 0);
    if (fark !== 0) return fark;
    return tohum(kaynakId + a.id) - tohum(kaynakId + b.id);
  });
  return siraliUygunlar[0];
}

/** Bir eşleşme gerçekleştiğinde (mission oluşturulduğunda) kayıt defterine yazar. */
export async function eslesmeKaydet(
  db: Db,
  missionId: string,
  kaynakId: string,
  hedefId: string,
  isimli: boolean
): Promise<void> {
  await db.from("gorev_eslesme").insert({
    mission_id: missionId,
    kaynak_id: kaynakId,
    hedef_id: hedefId,
    isimli,
  });
}

/** Eşleşmeli görev tesliminde "Bu konuşma gerçek miydi?" 1-5 cevabını yazar.
 * Yalnız görevi ALAN kişi (kaynak) cevaplayabilir — hedef değil. */
export async function eslesmeGercekMiydiKaydet(
  db: Db,
  missionId: string,
  kaynakId: string,
  puan: number
): Promise<boolean> {
  const { data, error } = await db
    .from("gorev_eslesme")
    .update({ gercek_miydi: puan })
    .eq("mission_id", missionId)
    .eq("kaynak_id", kaynakId)
    .select("id")
    .maybeSingle();
  return !error && !!data;
}
