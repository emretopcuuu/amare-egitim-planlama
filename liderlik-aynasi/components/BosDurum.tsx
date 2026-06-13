import type { ReactNode } from "react";

// Tutarlı boş-durum: büyük ikon + tek satır başlık + kısa açıklama + (varsa)
// net bir sonraki adım. Tüm "henüz bir şey yok" ekranları aynı dili konuşsun.
export default function BosDurum({
  simge,
  baslik,
  metin,
  eylem,
}: {
  simge: string;
  baslik: string;
  metin: string;
  eylem?: ReactNode;
}) {
  return (
    <div className="kart-cam rounded-3xl p-8 text-center">
      <p className="text-5xl">{simge}</p>
      <h2 className="prizma-serif ay-metin mt-4 text-2xl font-semibold leading-tight">
        {baslik}
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-slate-300">
        {metin}
      </p>
      {eylem && <div className="mt-5">{eylem}</div>}
    </div>
  );
}
