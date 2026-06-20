import Link from "next/link";

// Tek tip geri/çıkış butonu: her sayfada AYNI yerde (sol-üst), AYNI görünüm,
// yaşı büyük kullanıcı için yeterli dokunma hedefi (min 44px) ve net kontrast.
// Özellikle alt çubuğun (AltNav) gizlendiği tam-ekran sayfalarda "kayboldum"
// hissini önler. Varsayılan hedef ana sayfa; istenirse href ile değiştirilir.
export default function GeriButonu({
  href = "/",
  etiket = "Ana sayfaya dön",
  className = "",
}: {
  href?: string;
  etiket?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 -ml-2 text-base font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-slate-100 ${className}`}
    >
      <span aria-hidden className="text-lg">←</span>
      {etiket}
    </Link>
  );
}
