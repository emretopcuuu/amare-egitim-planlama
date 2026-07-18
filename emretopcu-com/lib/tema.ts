"use client";

import { useEffect, useState } from "react";

// Gündüz (porselen) / gece (mürekkep laciverti) teması. Tek doğruluk kaynağı
// <html data-tema="..."> özniteliği; FOUC olmasın diye ilk değeri layout'taki
// satır-içi script boyar (saat 21:00–07:00 arası varsayılan gece). Kullanıcı
// bir kez seçince tercih localStorage'a yazılır ve saat kuralını ezer.

export type Tema = "gunduz" | "gece";

export const TEMA_ANAHTAR = "emretopcu_tema";

export function temaOku(): Tema {
  if (typeof document === "undefined") return "gunduz";
  return document.documentElement.dataset.tema === "gece" ? "gece" : "gunduz";
}

export function temaYaz(t: Tema) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.tema = t;
  try {
    localStorage.setItem(TEMA_ANAHTAR, t);
  } catch {
    /* yoksay */
  }
  window.dispatchEvent(new CustomEvent<Tema>("tema-degisti", { detail: t }));
}

/** Aktif temayı okur ve değiştiricisini verir; tüm dinleyiciler senkron kalır. */
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>("gunduz");
  useEffect(() => {
    setTema(temaOku());
    const dinle = (e: Event) => setTema((e as CustomEvent<Tema>).detail);
    window.addEventListener("tema-degisti", dinle);
    return () => window.removeEventListener("tema-degisti", dinle);
  }, []);
  const cevir = () => temaYaz(tema === "gece" ? "gunduz" : "gece");
  return [tema, cevir];
}

