"use client";

// "Ana içeriğe atla" — klavye/ekran okuyucu kullanıcıları tekrarlayan
// navigasyonu atlayıp doğrudan içeriğe gidebilsin. Yalnız odaklanınca görünür.
export default function AtlaBaglantisi() {
  return (
    <a
      href="#ana-icerik"
      onClick={(e) => {
        const ana = document.querySelector("main");
        if (ana) {
          e.preventDefault();
          ana.setAttribute("tabindex", "-1");
          (ana as HTMLElement).focus();
          ana.scrollIntoView();
        }
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-gold focus:px-4 focus:py-2 focus:text-base focus:font-bold focus:text-midnight"
    >
      Ana içeriğe atla
    </a>
  );
}
