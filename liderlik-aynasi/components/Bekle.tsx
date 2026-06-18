// Paylaşılan yükleme göstergesi — butonlardaki düz "…" yerine tutarlı, üç nokta
// zıplayan animasyon. Metin rengini miras alır (bg-current), her yerde uyumlu.
// Hareket-azalt tercihinde global kural animasyonu zaten susturur.
export default function Bekle({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  );
}
