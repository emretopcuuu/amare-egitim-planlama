// Ayna işareti — her cihazda BİREBİR aynı görünen SVG. Emoji (🪞/🌊) eski
// Windows yazı tiplerinde kutu (□) ya da alakasız bir şekil olarak çıkabiliyor;
// marka simgesi gereken yerlerde bunun yerine bu vektör kullanılır.
// Oval yansıtıcı yüzey + ince iç çerçeve + bir ışık yayı (su/yansıma teması).
export default function AynaIkon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Ayna"
      fill="none"
    >
      {/* dış çerçeve */}
      <ellipse cx="20" cy="20" rx="13" ry="17" stroke="currentColor" strokeWidth="2" />
      {/* iç çerçeve (derinlik) */}
      <ellipse cx="20" cy="20" rx="9.5" ry="13.5" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* yansıma ışığı */}
      <path
        d="M14 11 C12 14 11 18 12 23"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
