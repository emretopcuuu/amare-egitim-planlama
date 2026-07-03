"use client";

import CanliAyna from "@/components/CanliAyna";

// Hazırlık özeti "Canlı Aynan (fotoğraf)" satırının açılır paneli: kişi burada
// hem ekstra referans fotoğrafı ekleyebilir hem de "Fotoğrafımı yeniden çek" ile
// 3 çekirdek açıyı baştan çekebilir. Yeniden çekim artık CanliAyna'nın kendi
// içinde — sunucu-reset'e (kamp kilidine takılan hazirlik-sifirla) gerek yok;
// kişinin kendi yüzü her an değiştirilebilir.
export default function CanliAynaOzetSatiri({ yuzVar }: { yuzVar: boolean }) {
  return <CanliAyna varMi={yuzVar} />;
}
