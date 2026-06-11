"use client";

import { useRef } from "react";

// Parmağı/imleci takip eden 3B eğilme + cam parlaması. Saf CSS transform —
// kütüphane yok, telefonda 60fps. Parlamanın konumu --px/--py değişkenleriyle
// globals.css'teki .egilen::after katmanına akar.
export default function EgilenKart({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const odakli = useRef(false); // form alanı odaktayken zemin oynamasın

  function hareket(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || odakli.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    el.style.setProperty("--px", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--py", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function birak() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={hareket}
      onPointerLeave={birak}
      onPointerCancel={birak}
      onPointerUp={birak}
      onFocusCapture={() => {
        odakli.current = true;
        birak();
      }}
      onBlurCapture={() => {
        odakli.current = false;
      }}
      className={`egilen ${className}`}
    >
      {children}
    </div>
  );
}
