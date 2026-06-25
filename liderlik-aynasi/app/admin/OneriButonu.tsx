"use client";

import Link from "next/link";

const SINIF =
  "btn-kor parilti mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-transform hover:scale-[1.01]";

// "Şimdi ne yapmalıyım?" kartının tek CTA'sı. Basit görünümde hero dışında her
// şey gizli; ama bazı eylemler aynı sayfadaki bir kontrole çapa verir (#dalga,
// #fazsifir…). Çapa hedefliyse otomatik UZMAN görünümüne geçip oraya kaydırır —
// böylece Basit minimal kalır ama eylem her zaman çalışır.
function uzmanaGec() {
  try {
    localStorage.setItem("la_admin_mod_v1", "uzman");
  } catch {}
  document.documentElement.setAttribute("data-admin-mod", "uzman");
}

export default function OneriButonu({ href, etiket }: { href: string; etiket: string }) {
  if (href.startsWith("#")) {
    const id = href.slice(1);
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          // Uzman'a geç ki hedef bölüm görünür olsun (Basit'te gizliydi).
          uzmanaGec();
          // Hedef kapalı bir katlanır grubun (<details>) içinde olabilir —
          // CapaAcici mantığını burada uygula: tüm <details> atalarını aç,
          // sonra kaydır. (preventDefault hashchange'i kestiği için şart.)
          requestAnimationFrame(() => {
            const hedef = document.getElementById(id);
            if (!hedef) return;
            let dugum: HTMLElement | null = hedef;
            while (dugum) {
              if (dugum instanceof HTMLDetailsElement && !dugum.open) dugum.open = true;
              dugum = dugum.parentElement;
            }
            requestAnimationFrame(() =>
              hedef.scrollIntoView({ behavior: "smooth", block: "start" })
            );
          });
        }}
        className={SINIF}
      >
        {etiket}
      </a>
    );
  }
  return (
    <Link href={href} className={SINIF}>
      {etiket}
    </Link>
  );
}
