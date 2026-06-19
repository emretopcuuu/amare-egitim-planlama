// GECE / GÜNDÜZ / OTOMATİK tema. Mod cihazda saklanır (la_tema); "otomatik"
// saate göre çözülür (07:00–19:00 gündüz, gerisi gece). Etkin tema <html>'e
// data-tema olarak yazılır; globals.css [data-tema="gunduz"] aydınlık paleti
// uygular. Layout'taki inline script açılışta anında uygular (FOUC yok).
export type TemaMod = "gece" | "gunduz" | "otomatik";
export type EtkinTema = "gece" | "gunduz";

export const TEMA_DEPO = "la_tema";
const GUNDUZ_BAS = 7; // dahil
const GUNDUZ_BIT = 19; // hariç

export function otomatikTema(simdi: Date = new Date()): EtkinTema {
  const s = simdi.getHours();
  return s >= GUNDUZ_BAS && s < GUNDUZ_BIT ? "gunduz" : "gece";
}

export function etkinTema(mod: TemaMod, simdi: Date = new Date()): EtkinTema {
  return mod === "otomatik" ? otomatikTema(simdi) : mod;
}

export function temaModOku(): TemaMod {
  try {
    const v = localStorage.getItem(TEMA_DEPO);
    if (v === "gece" || v === "gunduz" || v === "otomatik") return v;
  } catch {}
  return "otomatik";
}

// Modu uygula: sakla, <html data-tema> yaz, diğer bileşenleri haberdar et.
export function temaUygula(mod: TemaMod): EtkinTema {
  const etkin = etkinTema(mod);
  try {
    localStorage.setItem(TEMA_DEPO, mod);
  } catch {}
  try {
    document.documentElement.dataset.tema = etkin;
    window.dispatchEvent(new CustomEvent("ayna-tema", { detail: { mod, etkin } }));
  } catch {}
  return etkin;
}
