// A5 — TAKDİR MÜHÜRLERİ (saf veri + tip; server-only DEĞİL). Takdir gönderirken
// seçilen kategori. İstemci (TakdirGonder) ve sunucu (api/takdir) ortak buradan
// okur. Kategori OPSİYONELDİR — seçilmeden de takdir gönderilir (geriye dönük
// uyumlu: eski takdirlerin kategorisi null'dır, sadece "mühürsüz" görünür).

export type TakdirMuhur = { kod: string; ad: string; emoji: string };

export const TAKDIR_MUHURLERI: TakdirMuhur[] = [
  { kod: "cesaret", ad: "Cesaret", emoji: "🦁" },
  { kod: "sicaklik", ad: "Sıcaklık", emoji: "💛" },
  { kod: "emek", ad: "Emek", emoji: "💪" },
  { kod: "liderlik", ad: "Liderlik", emoji: "⭐" },
  { kod: "vizyon", ad: "Vizyon", emoji: "🔭" },
];

const MUHUR_MAP = new Map(TAKDIR_MUHURLERI.map((m) => [m.kod, m]));

export function muhurBul(kod: string | null | undefined): TakdirMuhur | null {
  if (!kod) return null;
  return MUHUR_MAP.get(kod) ?? null;
}

export function gecerliMuhurMu(kod: unknown): kod is string {
  return typeof kod === "string" && MUHUR_MAP.has(kod);
}
