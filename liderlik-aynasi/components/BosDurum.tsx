import type { ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

// Tutarlı durum kartı (#10 UX): büyük ikon + tek satır başlık + kısa açıklama +
// (varsa) net bir sonraki adım. Boş ve hata ekranları AYNI dili konuşsun.
// tip="hata" → şefkatli hata dili + role="alert"; aksi halde boş-durum dili.
// simge/baslik/metin verilmezse tipe göre ortak varsayılanlar (tr.durum) kullanılır.
export default function BosDurum({
  tip = "bos",
  simge,
  baslik,
  metin,
  eylem,
}: {
  tip?: "bos" | "hata";
  simge?: string;
  baslik?: string;
  metin?: string;
  eylem?: ReactNode;
}) {
  const v = tr.durum[tip];
  return (
    <div className="kart-cam rounded-3xl p-8 text-center" role={tip === "hata" ? "alert" : undefined}>
      <p className="text-5xl">{simge ?? v.simge}</p>
      <h2 className="prizma-serif ay-metin mt-4 text-2xl font-semibold leading-tight">
        {baslik ?? v.baslik}
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-slate-300">
        {metin ?? v.metin}
      </p>
      {eylem && <div className="mt-5">{eylem}</div>}
    </div>
  );
}
