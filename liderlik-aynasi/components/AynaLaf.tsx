/* UX paketi #7 — AYNA'nın MİNİ laf balonu: maskotun kısa, geçici lafları için
   tek görsel dil (dokunma tepkisi, görev ipucu vb.). AynaBalon'dan farkı:
   bu, maskotun YANINDA duran kuyruklu küçük balondur; içerik kartı değildir.
   Durumsuz — sunucu ve istemci bileşenlerinde çalışır. */

export default function AynaLaf({
  metin,
  kuyruk = "alt",
  sinif = "",
}: {
  metin: string;
  /** Kuyruğun baktığı yön: balon maskotun ÜSTÜNDEyse "alt", SAĞINDAysa "sol". */
  kuyruk?: "alt" | "sol";
  sinif?: string;
}) {
  return (
    <span className={`relative inline-block ${sinif}`}>
      <span className="block max-w-[15rem] rounded-2xl border border-gold/30 bg-midnight px-3 py-1.5 text-left text-xs italic leading-relaxed text-gold-light shadow-lg">
        {metin}
      </span>
      {kuyruk === "alt" ? (
        <span
          aria-hidden
          className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-gold/30 bg-midnight"
        />
      ) : (
        <span
          aria-hidden
          className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-gold/30 bg-midnight"
        />
      )}
    </span>
  );
}
