"use client";

import { useEffect } from "react";

// Katlanır faz grupları (#tehlike içindeki <details>) yüzünden, bir iç çapaya
// (#dalga, #muhur, #fazsifir …) atlandığında hedef kapalı bir grubun içinde
// kalabilir. Hero CTA'sı, komut paleti, Bugünün Akışı gibi çok sayıda yer bu
// çapalara link veriyor — bu yüzden atlamanın HER ZAMAN çalışması gerekir.
//
// Bu görünmez island, hash hedefini bulup en yakın <details> atalarını açar,
// sonra hedefi görünür alana kaydırır. Hem ilk yüklemede (location.hash) hem de
// sayfa içi hashchange'de çalışır; tarayıcının yerel <details> auto-expand
// desteğine güvenmeden bütün tarayıcılarda sağlam sonuç verir.
export default function CapaAcici() {
  useEffect(() => {
    function ac(hash: string) {
      if (!hash || hash === "#") return;
      let hedef: HTMLElement | null = null;
      try {
        hedef = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return;
      }
      if (!hedef) return;
      // Hedefin tüm <details> atalarını aç.
      let dugum: HTMLElement | null = hedef;
      let acildi = false;
      while (dugum) {
        if (dugum instanceof HTMLDetailsElement && !dugum.open) {
          dugum.open = true;
          acildi = true;
        }
        dugum = dugum.parentElement;
      }
      // Bir grup yeni açıldıysa düzen değiştiği için kaydırmayı bir kare ertele.
      if (acildi) {
        requestAnimationFrame(() =>
          hedef!.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    }

    // İlk yükleme: /admin#muhur gibi tam yol + hash ile gelinmişse.
    if (window.location.hash) ac(window.location.hash);

    const elde = () => ac(window.location.hash);
    window.addEventListener("hashchange", elde);
    return () => window.removeEventListener("hashchange", elde);
  }, []);

  return null;
}
