"use client";

import { tr } from "@/lib/i18n/tr";
import CanliAyna from "@/components/CanliAyna";

// Hazırlık özeti "Canlı Aynan (fotoğraf)" satırının açılır paneli: kişi burada
// hem ekstra referans fotoğrafı ekleyebilir hem de "Fotoğrafımı yeniden çek" ile
// 3 çekirdek açıyı baştan çekebilir. Yeniden çekim artık CanliAyna'nın kendi
// içinde — sunucu-reset'e (kamp kilidine takılan hazirlik-sifirla) gerek yok;
// kişinin kendi yüzü her an değiştirilebilir. Fotoğrafı zaten çekilmiş kişiye
// bunu AÇIKÇA söylüyoruz (katılımcı isteği) — panel açılır açılmaz "kilitli mi?"
// tereddüdü kalmasın, kamera kontrollerinden önce görünsün.
export default function CanliAynaOzetSatiri({ yuzVar }: { yuzVar: boolean }) {
  return (
    <div className="space-y-3">
      {yuzVar && (
        <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2.5 text-xs leading-relaxed text-gold-light">
          💡 {tr.pusula.fotoDegistirAciklama}
        </p>
      )}
      <CanliAyna varMi={yuzVar} />
    </div>
  );
}
