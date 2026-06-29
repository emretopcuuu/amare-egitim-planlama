// MÜHÜR İKONU — kilit (🔒) yerine mum/balmumu mühür görseli. "Mühür" geçen tüm
// yerlerde (söz mühürlendi, mühür kapalı...) bu kullanılır. Tek renk (currentColor),
// boyutu className ile (ör. h-6 w-6) verilir.
export default function MuhurIkon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-hidden
    >
      {/* dış dalgalı balmumu kenarı */}
      <path
        d="M24 3.5c2.6 0 4.3 2.4 6.8 3.1 2.5.7 5.3-.4 7.2 1.4 1.9 1.9.8 4.7 1.5 7.2.7 2.5 3.1 4.2 3.1 6.8s-2.4 4.3-3.1 6.8c-.7 2.5.4 5.3-1.5 7.2-1.9 1.9-4.7.8-7.2 1.5-2.5.7-4.2 3.1-6.8 3.1s-4.3-2.4-6.8-3.1c-2.5-.7-5.3.4-7.2-1.5-1.9-1.9-.8-4.7-1.5-7.2C8.3 26.3 5.9 24.6 5.9 22s2.4-4.3 3.1-6.8c.7-2.5-.4-5.3 1.5-7.2 1.9-1.9 4.7-.8 7.2-1.5C20.2 5.9 21.4 3.5 24 3.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M24 3.5c2.6 0 4.3 2.4 6.8 3.1 2.5.7 5.3-.4 7.2 1.4 1.9 1.9.8 4.7 1.5 7.2.7 2.5 3.1 4.2 3.1 6.8s-2.4 4.3-3.1 6.8c-.7 2.5.4 5.3-1.5 7.2-1.9 1.9-4.7.8-7.2 1.5-2.5.7-4.2 3.1-6.8 3.1s-4.3-2.4-6.8-3.1c-2.5-.7-5.3.4-7.2-1.5-1.9-1.9-.8-4.7-1.5-7.2C8.3 26.3 5.9 24.6 5.9 22s2.4-4.3 3.1-6.8c.7-2.5-.4-5.3 1.5-7.2 1.9-1.9 4.7-.8 7.2-1.5C20.2 5.9 21.4 3.5 24 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* iç daire — damga yüzeyi */}
      <circle cx="24" cy="22" r="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      {/* damga harfi/işareti — basit bir yıldız-çapa karması (kimlik mührü) */}
      <path
        d="M24 16.5l1.8 3.7 4.1.6-3 2.9.7 4-3.6-1.9-3.6 1.9.7-4-3-2.9 4.1-.6L24 16.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
