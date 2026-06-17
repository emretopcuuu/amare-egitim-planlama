import "server-only";
import type { Db } from "@/lib/degerlendirme";

// CANLI PANO — adminin kampın nabzını tek bakışta gördüğü üç veri:
//  #1 İzgara: her katılımcının o anki durumu (çalışıyor / bekliyor / sessiz / boş)
//  #4 Akış: son görev teslimleri (gerçek zamanlı his — OtoYenile ile tazelenir)
//  #10 Takım sıralaması: takım bazında anonim dış puan ortalaması
// Tüm sorgular tek yerde toplanır; admin/page.tsx sade kalır.

export type IzgaraDurum = "aktif" | "bekliyor" | "sessiz" | "bos";
export type IzgaraKisi = {
  id: string;
  ad: string;
  takim: string | null;
  durum: IzgaraDurum;
};
export type TeslimSatir = {
  id: string;
  ad: string;
  tur: string;
  baslik: string;
  bagil: string; // "az önce", "5 dk", "2 sa"
  puan: number | null;
  durum: string;
};
export type TakimSatir = { takim: string; ort: number; sayi: number };

const SAAT = 3_600_000;

function bagilZaman(iso: string, simdi: number): string {
  const fark = simdi - new Date(iso).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa`;
  return `${Math.floor(sa / 24)} gün`;
}

export async function canliPano(db: Db): Promise<{
  izgara: IzgaraKisi[];
  teslimler: TeslimSatir[];
  takimlar: TakimSatir[];
  ozet: { aktif: number; bekliyor: number; sessiz: number; bos: number };
}> {
  const simdi = Date.now();
  const pencere = new Date(simdi - 24 * SAAT).toISOString();

  const [{ data: kisiler }, { data: gorevler }, { data: teslimHam }, { data: puanlar }] =
    await Promise.all([
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant")
        .order("full_name"),
      // Son 24 saatteki görevler → her kişinin anlık durumu bundan çıkar.
      db
        .from("missions")
        .select("participant_id, status, issued_at, due_at, responded_at, scored_at")
        .gte("issued_at", pencere),
      // #4 Akış: en son yanıtlanan görevler (teslim hissi).
      db
        .from("missions")
        .select(
          "id, kind, title, status, ai_score, responded_at, katilimci:participants!missions_participant_id_fkey(full_name)"
        )
        .not("responded_at", "is", null)
        .order("responded_at", { ascending: false })
        .limit(12),
      // #10 Takım sıralaması: dış (anonim) puanlar → hedefin takımına yazılır.
      db.from("ratings").select("target_id, score, is_self").eq("is_self", false),
    ]);

  // --- #1 İzgara durumları ---
  type Grup = {
    aktifPending: boolean;
    submitted: boolean;
    sonDokunus: number;
    varMi: boolean;
  };
  const grup = new Map<string, Grup>();
  for (const g of gorevler ?? []) {
    const k = grup.get(g.participant_id) ?? {
      aktifPending: false,
      submitted: false,
      sonDokunus: 0,
      varMi: false,
    };
    k.varMi = true;
    if (g.status === "pending" && new Date(g.due_at).getTime() > simdi && !g.responded_at)
      k.aktifPending = true;
    if (g.status === "submitted") k.submitted = true;
    for (const ts of [g.issued_at, g.responded_at, g.scored_at]) {
      if (ts) k.sonDokunus = Math.max(k.sonDokunus, new Date(ts).getTime());
    }
    grup.set(g.participant_id, k);
  }

  const ozet = { aktif: 0, bekliyor: 0, sessiz: 0, bos: 0 };
  const izgara: IzgaraKisi[] = (kisiler ?? []).map((kisi) => {
    const k = grup.get(kisi.id);
    let durum: IzgaraDurum;
    if (!k || !k.varMi) durum = "bos";
    else if (k.aktifPending) durum = "aktif";
    else if (k.submitted) durum = "bekliyor";
    else if (simdi - k.sonDokunus <= 4 * SAAT) durum = "aktif";
    else durum = "sessiz";
    ozet[durum]++;
    return { id: kisi.id, ad: kisi.full_name, takim: kisi.team, durum };
  });

  // --- #4 Teslim akışı ---
  const teslimler: TeslimSatir[] = (teslimHam ?? []).map((g) => ({
    id: g.id,
    ad: (g.katilimci as unknown as { full_name: string }).full_name.split(" ")[0],
    tur: g.kind,
    baslik: g.title,
    bagil: g.responded_at ? bagilZaman(g.responded_at, simdi) : "",
    puan: g.ai_score,
    durum: g.status,
  }));

  // --- #10 Takım sıralaması ---
  const takimMap = new Map<string, string | null>(
    (kisiler ?? []).map((k) => [k.id, k.team])
  );
  const toplam = new Map<string, { top: number; adet: number }>();
  for (const p of puanlar ?? []) {
    const takim = takimMap.get(p.target_id);
    if (!takim) continue;
    const t = toplam.get(takim) ?? { top: 0, adet: 0 };
    t.top += p.score;
    t.adet++;
    toplam.set(takim, t);
  }
  const takimlar: TakimSatir[] = [...toplam.entries()]
    .map(([takim, v]) => ({ takim, ort: Math.round((v.top / v.adet) * 10) / 10, sayi: v.adet }))
    .sort((a, b) => b.ort - a.ort);

  return { izgara, teslimler, takimlar, ozet };
}
