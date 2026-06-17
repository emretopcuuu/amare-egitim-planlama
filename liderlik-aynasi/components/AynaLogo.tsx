// "Ayna" yazılı marka işareti. 🪞 emojisi eski Windows yazı tiplerinde yoksa
// boş kutu (□) olarak çıkıyordu; logo gibi tek başına duran ekranlarda emoji
// yerine her cihazda okunan bu yazıyı kullanıyoruz.
export default function AynaLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`prizma-serif ay-metin font-semibold tracking-[0.2em] ${className}`}
      aria-label="Ayna"
    >
      Ayna
    </span>
  );
}
