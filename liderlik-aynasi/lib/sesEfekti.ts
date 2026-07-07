"use client";

// Ayna ses efektleri — kısa "one-shot" foley'ler (public/sfx/*.mp3). ElevenLabs
// Text-to-SFX ile üretildi. Tasarım kararları:
//  · Kullanıcı istediği an kapatabilir (ayarlar çekmecesindeki anahtar). Varsayılan AÇIK.
//  · "Rahatsız edici tekrar" koruması: ses başına soğuma + iki ses arası genel
//    minimum aralık → arka arkaya gelen olaylar (kıvılcım/mozaik) tek sesle duyulur.
//  · Autoplay engeli sessizce yutulur (.play().catch) — kullanıcı jesti yoksa çalmaz.

export type SesAdi =
  | "kivilcim"
  | "kayit-zili"
  | "gorev-basla"
  | "fiero"
  | "streak"
  | "kart-ac"
  | "rituel-yemin"
  | "muhur"
  | "domino"
  | "sesli-mektup"
  | "mozaik";

const ANAHTAR = "la_ses_efektleri"; // "0" = kapalı; başka her değer / yok = AÇIK
const GENEL_ARALIK_MS = 350; // herhangi iki ses arasında en az bu kadar boşluk
const SES_SOGUMA_MS = 2500; // AYNI sesin iki çalınışı arasında en az bu kadar
// Bazı sesler doğal olarak daha yüksek yaşanmalı (tören anları) / daha kısık.
const SEVIYE: Partial<Record<SesAdi, number>> = {
  muhur: 0.72,
  domino: 0.72,
  "sesli-mektup": 0.6,
  kivilcim: 0.5,
  mozaik: 0.45,
};
const VARSAYILAN_SEVIYE = 0.6;

let sonCalim = 0;
const sonSesZamani: Record<string, number> = {};
const havuz: Record<string, HTMLAudioElement> = {};

/** Ses efektleri açık mı? (SSR'de varsayılan açık kabul edilir.) */
export function sesAcik(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ANAHTAR) !== "0";
  } catch {
    return true;
  }
}

/** Aç/kapa tercihini yaz + aynı sekmedeki dinleyicilere haber ver. */
export function sesAyarla(acik: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANAHTAR, acik ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent("la-ses-degisti", { detail: acik }));
}

function elde(ad: SesAdi): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  let a = havuz[ad];
  if (!a) {
    a = new Audio(`/sfx/${ad}.mp3`);
    a.preload = "auto";
    havuz[ad] = a;
  }
  return a;
}

/** Bir efekti çal (kapalıysa / soğumadaysa sessizce yut). */
export function sesCal(ad: SesAdi): void {
  if (typeof window === "undefined") return;
  if (!sesAcik()) return;
  const simdi = Date.now();
  if (simdi - sonCalim < GENEL_ARALIK_MS) return; // iki ses çok yakınsa yut
  if (simdi - (sonSesZamani[ad] ?? 0) < SES_SOGUMA_MS) return; // aynı ses soğumada
  const a = elde(ad);
  if (!a) return;
  sonCalim = simdi;
  sonSesZamani[ad] = simdi;
  try {
    a.volume = SEVIYE[ad] ?? VARSAYILAN_SEVIYE;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {}
}

/** Önemli anlarda gecikmesiz çalsın diye ilgili sesleri önceden yükle. */
export function sesOnYukle(...adlar: SesAdi[]): void {
  for (const ad of adlar) elde(ad);
}
